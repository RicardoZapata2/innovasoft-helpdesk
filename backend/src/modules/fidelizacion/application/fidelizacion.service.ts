import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { EventoFidelizacion } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { ClientePrisma } from '../../puntos/application/consumo-puntos.service.js';
import { puedeCanjear, venceElBeneficio } from '../domain/canje.js';

export type EventoOtorgado = {
  empresaId: string;
  evento: EventoFidelizacion;
  ticketId?: string;
  suscripcionId?: string;
};

@Injectable()
export class FidelizacionService {
  constructor(private readonly prisma: PrismaService) {}

  // Se llama dentro de la transacción de quien dispara el evento: si el ticket
  // o la renovación no llegan a guardarse, tampoco quedan puntos regalados.
  async otorgarEn(tx: ClientePrisma, datos: EventoOtorgado) {
    const regla = await tx.reglaFidelizacion.findFirst({ where: { evento: datos.evento, activa: true } });

    if (regla === null) {
      return null;
    }

    // Un mismo ticket no puede dar dos veces los mismos puntos: subir una
    // segunda evidencia o reabrir el caso no repite la acumulación.
    if (datos.ticketId !== undefined) {
      const yaOtorgado = await tx.movimientoFidelidad.findFirst({
        where: { reglaId: regla.id, ticketId: datos.ticketId },
      });

      if (yaOtorgado !== null) {
        return null;
      }
    }

    return tx.movimientoFidelidad.create({
      data: {
        empresaId: datos.empresaId,
        tipo: 'ACUMULACION',
        puntos: regla.puntos,
        reglaId: regla.id,
        ticketId: datos.ticketId ?? null,
        suscripcionId: datos.suscripcionId ?? null,
        descripcion: regla.nombre,
      },
    });
  }

  async saldo(empresaId: string, cliente: ClientePrisma | PrismaService = this.prisma): Promise<number> {
    const suma = await cliente.movimientoFidelidad.aggregate({
      where: { empresaId },
      _sum: { puntos: true },
    });

    return suma._sum.puntos ?? 0;
  }

  async resumen(empresaId: string) {
    const [saldo, movimientos, canjes, recompensas, reglas] = await Promise.all([
      this.saldo(empresaId),
      this.prisma.movimientoFidelidad.findMany({
        where: { empresaId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          tipo: true,
          puntos: true,
          descripcion: true,
          createdAt: true,
          regla: { select: { nombre: true, evento: true } },
          ticket: { select: { id: true, codigo: true } },
        },
      }),
      this.prisma.canje.findMany({
        where: { empresaId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          estado: true,
          venceEn: true,
          createdAt: true,
          recompensa: { select: { nombre: true, costoPuntos: true, tipo: true } },
          usuario: { select: { nombres: true, apellidos: true } },
          bolsaGenerada: { select: { id: true, puntosIniciales: true, venceEn: true } },
        },
      }),
      this.prisma.recompensa.findMany({
        where: { activa: true },
        orderBy: { costoPuntos: 'asc' },
        select: {
          clave: true,
          nombre: true,
          descripcion: true,
          costoPuntos: true,
          tipo: true,
          diasVigenciaBeneficio: true,
        },
      }),
      this.prisma.reglaFidelizacion.findMany({
        where: { activa: true },
        orderBy: { puntos: 'asc' },
        select: { clave: true, nombre: true, puntos: true, evento: true },
      }),
    ]);

    return { empresaId, saldo, movimientos, canjes, recompensas, reglas };
  }

  async canjear(empresaId: string, claveRecompensa: string, usuarioId: string) {
    const recompensa = await this.prisma.recompensa.findUnique({ where: { clave: claveRecompensa } });

    if (recompensa === null || !recompensa.activa) {
      throw new NotFoundException('La recompensa no existe o ya no está disponible');
    }

    return this.prisma.$transaction(async (tx) => {
      // Se bloquea la fila de la empresa para que dos canjes simultáneos no
      // lean el mismo saldo y lo gasten los dos.
      await tx.$queryRaw`SELECT id FROM empresa_cliente WHERE id = ${empresaId} FOR UPDATE`;

      const saldo = await this.saldo(empresaId, tx);

      if (!puedeCanjear(saldo, recompensa.costoPuntos)) {
        throw new ConflictException(
          `Saldo insuficiente: la recompensa cuesta ${recompensa.costoPuntos} puntos y tienes ${saldo}`,
        );
      }

      const ahora = new Date();
      const venceEn = venceElBeneficio(ahora, recompensa.diasVigenciaBeneficio);

      const canje = await tx.canje.create({
        data: { empresaId, recompensaId: recompensa.id, usuarioId, venceEn },
      });

      await tx.movimientoFidelidad.create({
        data: {
          empresaId,
          tipo: 'CANJE',
          puntos: -recompensa.costoPuntos,
          canjeId: canje.id,
          descripcion: `Canje: ${recompensa.nombre}`,
        },
      });

      // La recarga se entrega en el acto como una bolsa de origen promocional.
      // Ese origen es lo que después permite distinguir en el historial qué
      // pagó el cliente y qué recibió como beneficio.
      if (recompensa.tipo === 'RECARGA_PUNTOS') {
        const puntos = Number(recompensa.valor);
        const bolsa = await tx.bolsaPuntos.create({
          data: {
            empresaId,
            origen: 'PROMOCION',
            puntosIniciales: puntos,
            venceEn: venceEn ?? venceElBeneficio(ahora, 30)!,
          },
        });

        await tx.movimientoPuntos.create({
          data: {
            empresaId,
            bolsaId: bolsa.id,
            tipo: 'EMISION',
            puntos,
            descripcion: `Recarga promocional por canje de recompensa`,
            registradoPorId: usuarioId,
          },
        });

        await tx.canje.update({
          where: { id: canje.id },
          data: { bolsaGeneradaId: bolsa.id, estado: 'APLICADO' },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          usuarioId,
          entidad: 'canje',
          entidadId: canje.id,
          accion: 'CANJEAR',
          datosNuevos: { recompensa: recompensa.clave, costo: recompensa.costoPuntos, saldoAnterior: saldo },
        },
      });

      return {
        canjeId: canje.id,
        recompensa: recompensa.nombre,
        puntosDescontados: recompensa.costoPuntos,
        saldoNuevo: saldo - recompensa.costoPuntos,
        venceEn,
      };
    });
  }
}
