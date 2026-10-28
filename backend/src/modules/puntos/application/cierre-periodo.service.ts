import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { planificarCierre } from '../domain/cierre-periodo.js';
import type { BolsaVigente } from '../domain/motor-consumo.js';
import type { ClientePrisma } from './consumo-puntos.service.js';

@Injectable()
export class CierrePeriodoService {
  constructor(private readonly prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.periodoFacturacion.findMany({
      where: { empresaId },
      orderBy: { inicioEn: 'desc' },
      select: {
        id: true,
        inicioEn: true,
        finEn: true,
        estado: true,
        saldoPendiente: true,
        cerradoEn: true,
        _count: { select: { movimientos: true } },
      },
    });
  }

  // Cierra el periodo que va desde el cierre anterior (o desde el primer
  // movimiento de la empresa) hasta este momento. Todo ocurre en una sola
  // transacción y con las bolsas bloqueadas, igual que un consumo: si un
  // ticket se cierra a la vez, uno de los dos espera al otro.
  async cerrar(empresaId: string, usuarioId: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });

    if (empresa === null) {
      throw new NotFoundException('La empresa no existe');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM bolsa_puntos
        WHERE empresa_id = ${empresaId} AND anulada = false
        FOR UPDATE`;

      const ahora = new Date();
      const anterior = await tx.periodoFacturacion.findFirst({
        where: { empresaId },
        orderBy: { finEn: 'desc' },
      });

      // Un periodo de facturación no dura menos de un día: cerrar dos veces
      // en la misma fecha solo dejaría periodos vacíos en el historial.
      if (anterior !== null && anterior.finEn.toDateString() === ahora.toDateString()) {
        throw new ConflictException('El periodo de esta empresa ya se cerró hoy');
      }

      const inicioEn = anterior?.finEn ?? (await this.inicioDelPrimerPeriodo(tx, empresaId, empresa.createdAt));

      const bolsas = await this.bolsasConSaldo(tx, empresaId);

      const pendientes = await tx.movimientoPuntos.aggregate({
        where: { empresaId, bolsaId: null, periodoId: null },
        _sum: { puntos: true },
      });
      const descubierto = Math.max(0, -(pendientes._sum.puntos ?? 0));

      const plan = planificarCierre(bolsas, descubierto, ahora);

      const periodo = await tx.periodoFacturacion.create({
        data: {
          empresaId,
          inicioEn,
          finEn: ahora,
          saldoPendiente: descubierto,
          estado: 'CERRADO',
          cerradoEn: ahora,
        },
      });

      const etiqueta = `periodo del ${fechaLocal(inicioEn)} al ${fechaLocal(ahora)}`;

      for (const expiracion of plan.expiraciones) {
        await tx.movimientoPuntos.create({
          data: {
            empresaId,
            bolsaId: expiracion.bolsaId,
            tipo: 'EXPIRACION',
            puntos: -expiracion.puntos,
            periodoId: periodo.id,
            descripcion: `Puntos vencidos al cerrar el ${etiqueta}`,
            registradoPorId: usuarioId,
          },
        });
      }

      // Los descubiertos del periodo quedan consolidados en él: dejan de
      // contar como pendientes y su valor pasa a cobrarse de las bolsas o a
      // trasladarse, según el plan.
      await tx.movimientoPuntos.updateMany({
        where: { empresaId, bolsaId: null, periodoId: null },
        data: { periodoId: periodo.id },
      });

      for (const cobro of plan.cobros) {
        await tx.movimientoPuntos.create({
          data: {
            empresaId,
            bolsaId: cobro.bolsaId,
            tipo: 'CONSUMO',
            puntos: -cobro.puntos,
            descripcion: `Cobro del descubierto del ${etiqueta}`,
            registradoPorId: usuarioId,
          },
        });
      }

      if (plan.trasladado > 0) {
        await tx.movimientoPuntos.create({
          data: {
            empresaId,
            bolsaId: null,
            tipo: 'DESCUBIERTO',
            puntos: -plan.trasladado,
            descripcion: `Descubierto trasladado desde el ${etiqueta}`,
            registradoPorId: usuarioId,
          },
        });
      }

      const resumen = {
        periodoId: periodo.id,
        inicioEn,
        finEn: ahora,
        puntosExpirados: plan.expiraciones.reduce((total, item) => total + item.puntos, 0),
        bolsasExpiradas: plan.expiraciones.length,
        descubiertoDelPeriodo: descubierto,
        cobradoDeBolsas: plan.cobros.reduce((total, item) => total + item.puntos, 0),
        trasladado: plan.trasladado,
      };

      await tx.registroAuditoria.create({
        data: {
          usuarioId,
          entidad: 'periodo_facturacion',
          entidadId: periodo.id,
          accion: 'CERRAR_PERIODO',
          datosNuevos: { ...resumen, inicioEn: inicioEn.toISOString(), finEn: ahora.toISOString() },
        },
      });

      return resumen;
    });
  }

  // El primer periodo arranca con el primer movimiento de la empresa, que en
  // los datos de demostración es anterior a su fecha de alta.
  private async inicioDelPrimerPeriodo(tx: ClientePrisma, empresaId: string, altaEmpresa: Date): Promise<Date> {
    const primero = await tx.movimientoPuntos.findFirst({
      where: { empresaId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    return primero === null || primero.createdAt > altaEmpresa ? altaEmpresa : primero.createdAt;
  }

  private async bolsasConSaldo(tx: ClientePrisma, empresaId: string): Promise<BolsaVigente[]> {
    const bolsas = await tx.bolsaPuntos.findMany({ where: { empresaId, anulada: false } });

    const sumas = await tx.movimientoPuntos.groupBy({
      by: ['bolsaId'],
      where: { bolsaId: { in: bolsas.map((bolsa) => bolsa.id) } },
      _sum: { puntos: true },
    });

    const saldoPorBolsa = new Map(sumas.map((fila) => [fila.bolsaId, fila._sum.puntos ?? 0]));

    return bolsas.map((bolsa) => ({
      id: bolsa.id,
      venceEn: bolsa.venceEn,
      esIlimitada: bolsa.esIlimitada,
      saldo: saldoPorBolsa.get(bolsa.id) ?? 0,
    }));
  }
}

function fechaLocal(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
