import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { calcularAlertas, diasHasta } from '../domain/alertas.js';
import type { Alerta } from '../domain/alertas.js';
import { leerEstado } from './consumo-puntos.service.js';
import type { AjusteDto } from '../presentation/dto/ajuste.dto.js';
import type { ContratarPlanDto } from '../presentation/dto/contratar-plan.dto.js';
import type { ConsultaKardexDto } from '../presentation/dto/consulta-kardex.dto.js';

export type DetalleBolsa = {
  id: string;
  origen: string;
  puntosIniciales: number;
  saldo: number;
  esIlimitada: boolean;
  emitidaEn: Date;
  venceEn: Date;
  diasParaVencer: number;
};

export type EstadoDeCuenta = {
  empresaId: string;
  saldoDisponible: number;
  tieneePlanIlimitado: boolean;
  topeDescubierto: number;
  bolsas: DetalleBolsa[];
  alertas: Alerta[];
};

@Injectable()
export class PuntosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  listarPlanes() {
    return this.prisma.plan.findMany({
      where: { activo: true },
      orderBy: [{ tipo: 'asc' }, { precio: 'asc' }],
      select: {
        clave: true,
        nombre: true,
        descripcion: true,
        tipo: true,
        puntosIncluidos: true,
        esIlimitado: true,
        diasVigencia: true,
        precio: true,
      },
    });
  }

  listarTarifas() {
    return this.prisma.tarifaServicio.findMany({
      where: { activo: true },
      orderBy: { puntos: 'asc' },
      select: { clave: true, nombre: true, puntos: true },
    });
  }

  async obtenerEstadoDeCuenta(empresaId: string): Promise<EstadoDeCuenta> {
    const ahora = new Date();
    const estado = await leerEstado(this.prisma, empresaId, ahora);

    const bolsas = await this.prisma.bolsaPuntos.findMany({
      where: { empresaId, anulada: false, venceEn: { gt: ahora } },
      orderBy: { venceEn: 'asc' },
    });

    const saldoPorBolsa = new Map(estado.bolsas.map((bolsa) => [bolsa.id, bolsa.saldo]));

    const detalle: DetalleBolsa[] = bolsas.map((bolsa) => ({
      id: bolsa.id,
      origen: bolsa.origen,
      puntosIniciales: bolsa.puntosIniciales,
      saldo: saldoPorBolsa.get(bolsa.id) ?? 0,
      esIlimitada: bolsa.esIlimitada,
      emitidaEn: bolsa.emitidaEn,
      venceEn: bolsa.venceEn,
      diasParaVencer: diasHasta(bolsa.venceEn, ahora),
    }));

    const topeDescubierto = this.config.getOrThrow<number>('puntos.topeDescubierto');

    return {
      empresaId,
      saldoDisponible: estado.saldo,
      tieneePlanIlimitado: estado.bolsas.some((bolsa) => bolsa.esIlimitada),
      topeDescubierto,
      bolsas: detalle,
      alertas: calcularAlertas(
        estado.saldo,
        estado.bolsas,
        {
          saldoBajo: this.config.getOrThrow<number>('puntos.avisoSaldoBajo'),
          diasParaVencer: this.config.getOrThrow<number>('puntos.avisoDiasParaVencer'),
          topeDescubierto,
        },
        ahora,
      ),
    };
  }

  async obtenerKardex(empresaId: string, consulta: ConsultaKardexDto) {
    const pagina = consulta.pagina ?? 1;
    const tamano = consulta.tamano ?? 20;

    const filtro = {
      empresaId,
      ...(consulta.tipo === undefined ? {} : { tipo: consulta.tipo }),
      ...(consulta.ticketId === undefined ? {} : { ticketId: consulta.ticketId }),
      ...(consulta.desde === undefined && consulta.hasta === undefined
        ? {}
        : {
            createdAt: {
              ...(consulta.desde === undefined ? {} : { gte: new Date(consulta.desde) }),
              ...(consulta.hasta === undefined ? {} : { lte: new Date(consulta.hasta) }),
            },
          }),
    };

    const [total, movimientos] = await Promise.all([
      this.prisma.movimientoPuntos.count({ where: filtro }),
      this.prisma.movimientoPuntos.findMany({
        where: filtro,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * tamano,
        take: tamano,
        select: {
          id: true,
          tipo: true,
          puntos: true,
          descripcion: true,
          createdAt: true,
          ticketId: true,
          citaId: true,
          bolsa: { select: { id: true, origen: true, venceEn: true } },
          registradoPor: { select: { nombres: true, apellidos: true } },
        },
      }),
    ]);

    return {
      pagina,
      tamano,
      total,
      paginas: Math.max(1, Math.ceil(total / tamano)),
      movimientos,
    };
  }

  // Contratar un plan emite la bolsa y su movimiento de entrada en la misma
  // transacción: una bolsa sin movimiento de emisión tendría saldo cero y sería
  // invisible para el motor de consumo.
  async contratarPlan(empresaId: string, datos: ContratarPlanDto, registradoPorId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { clave: datos.plan } });

    if (plan === null || !plan.activo) {
      throw new NotFoundException(`No existe un plan activo con la clave "${datos.plan}"`);
    }

    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });

    if (empresa === null || !empresa.activa) {
      throw new NotFoundException('La empresa no existe o está desactivada');
    }

    const inicioEn = new Date();
    const finEn = new Date(inicioEn.getTime() + plan.diasVigencia * 24 * 60 * 60 * 1000);

    const origen =
      plan.tipo === 'RECARGA' ? 'RECARGA' : plan.tipo === 'BONO' ? 'BONO' : 'PLAN';

    return this.prisma.$transaction(async (tx) => {
      const suscripcion = await tx.suscripcion.create({
        data: {
          empresaId,
          planId: plan.id,
          inicioEn,
          finEn,
          precioPagado: plan.precio,
        },
      });

      const bolsa = await tx.bolsaPuntos.create({
        data: {
          empresaId,
          suscripcionId: suscripcion.id,
          origen,
          puntosIniciales: plan.puntosIncluidos ?? 0,
          esIlimitada: plan.esIlimitado,
          venceEn: finEn,
        },
      });

      await tx.movimientoPuntos.create({
        data: {
          empresaId,
          bolsaId: bolsa.id,
          tipo: 'EMISION',
          puntos: plan.puntosIncluidos ?? 0,
          descripcion: `Emisión por contratación del plan ${plan.nombre}`,
          registradoPorId,
        },
      });

      return {
        suscripcionId: suscripcion.id,
        bolsaId: bolsa.id,
        plan: plan.nombre,
        puntosEmitidos: plan.puntosIncluidos,
        esIlimitado: plan.esIlimitado,
        venceEn: finEn,
      };
    });
  }

  // Un ajuste manual queda registrado como cualquier otro movimiento, con quien
  // lo hizo y por qué. Es la única forma de mover el saldo sin que haya habido
  // un servicio detrás, y por eso exige un permiso propio.
  async ajustarSaldo(empresaId: string, datos: AjusteDto, registradoPorId: string) {
    if (datos.puntos === 0) {
      throw new BadRequestException('Un ajuste de cero puntos no tiene efecto');
    }

    if (datos.puntos > 0) {
      const vigencia = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      return this.prisma.$transaction(async (tx) => {
        const bolsa = await tx.bolsaPuntos.create({
          data: {
            empresaId,
            origen: 'PROMOCION',
            puntosIniciales: datos.puntos,
            venceEn: vigencia,
          },
        });

        return tx.movimientoPuntos.create({
          data: {
            empresaId,
            bolsaId: bolsa.id,
            tipo: 'AJUSTE',
            puntos: datos.puntos,
            descripcion: datos.motivo,
            registradoPorId,
          },
        });
      });
    }

    return this.prisma.movimientoPuntos.create({
      data: {
        empresaId,
        bolsaId: null,
        tipo: 'AJUSTE',
        puntos: datos.puntos,
        descripcion: datos.motivo,
        registradoPorId,
      },
    });
  }
}
