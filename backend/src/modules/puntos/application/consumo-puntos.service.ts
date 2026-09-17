import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { excedeElDescubierto, planificarConsumo } from '../domain/motor-consumo.js';
import type { BolsaVigente } from '../domain/motor-consumo.js';

export type SolicitudConsumo = {
  empresaId: string;
  costo: number;
  descripcion: string;
  ticketId?: string;
  citaId?: string;
  registradoPorId?: string;
};

export type ResultadoConsumo = {
  saldoAnterior: number;
  saldoNuevo: number;
  descubierto: number;
  cubiertoPorPlanIlimitado: boolean;
};

type ClientePrisma = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class ConsumoPuntosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // Punto de entrada único para gastar puntos. Lo usan el cierre de un ticket y
  // la marca de una cita como realizada; ninguno de los dos escribe movimientos
  // por su cuenta.
  async consumir(solicitud: SolicitudConsumo): Promise<ResultadoConsumo> {
    const tope = this.config.getOrThrow<number>('puntos.topeDescubierto');

    return this.prisma.$transaction(async (tx) => {
      const estado = await this.estadoBloqueado(tx, solicitud.empresaId);

      if (excedeElDescubierto(estado.saldo, solicitud.costo, tope)) {
        throw new ConflictException(
          `La empresa llegó al límite de ${tope} puntos en descubierto. ` +
            'Debe renovar el plan o contratar una recarga antes de registrar más consumos.',
        );
      }

      const plan = planificarConsumo(estado.bolsas, solicitud.costo);

      for (const aplicacion of plan.aplicaciones) {
        await tx.movimientoPuntos.create({
          data: {
            empresaId: solicitud.empresaId,
            bolsaId: aplicacion.bolsaId,
            tipo: 'CONSUMO',
            // Los movimientos de salida se guardan en negativo: el saldo es
            // siempre la suma de la columna, sin condicionales.
            puntos: -aplicacion.puntos,
            ticketId: solicitud.ticketId ?? null,
            citaId: solicitud.citaId ?? null,
            descripcion: solicitud.descripcion,
            registradoPorId: solicitud.registradoPorId ?? null,
          },
        });
      }

      if (plan.descubierto > 0) {
        await tx.movimientoPuntos.create({
          data: {
            empresaId: solicitud.empresaId,
            bolsaId: null,
            tipo: 'DESCUBIERTO',
            puntos: -plan.descubierto,
            ticketId: solicitud.ticketId ?? null,
            citaId: solicitud.citaId ?? null,
            descripcion: `${solicitud.descripcion} (sin saldo disponible)`,
            registradoPorId: solicitud.registradoPorId ?? null,
          },
        });
      }

      const saldoNuevo = plan.cubiertoPorPlanIlimitado ? estado.saldo : estado.saldo - solicitud.costo;

      return {
        saldoAnterior: estado.saldo,
        saldoNuevo,
        descubierto: plan.descubierto,
        cubiertoPorPlanIlimitado: plan.cubiertoPorPlanIlimitado,
      };
    });
  }

  // Bloquea las filas de las bolsas de la empresa hasta que termine la
  // transacción. Sin este bloqueo, dos cierres simultáneos leerían el mismo
  // saldo y lo gastarían los dos: el clásico doble gasto.
  private async estadoBloqueado(
    tx: ClientePrisma,
    empresaId: string,
  ): Promise<{ bolsas: BolsaVigente[]; saldo: number }> {
    await tx.$queryRaw`
      SELECT id FROM bolsa_puntos
      WHERE empresa_id = ${empresaId}::uuid AND anulada = false
      ORDER BY vence_en ASC
      FOR UPDATE`;

    return leerEstado(tx, empresaId);
  }
}

// El saldo nunca se almacena: se deriva sumando los movimientos de las bolsas
// vigentes más los descubiertos que todavía no se han consolidado en un cierre
// de periodo. Guardarlo como campo obligaría a mantenerlo sincronizado, y
// cualquier fallo dejaría el dato y el historial contradiciéndose.
export async function leerEstado(
  tx: ClientePrisma,
  empresaId: string,
  ahora: Date = new Date(),
): Promise<{ bolsas: BolsaVigente[]; saldo: number }> {
  const bolsas = await tx.bolsaPuntos.findMany({
    where: { empresaId, anulada: false, venceEn: { gt: ahora } },
    orderBy: { venceEn: 'asc' },
  });

  const sumas = await tx.movimientoPuntos.groupBy({
    by: ['bolsaId'],
    where: { bolsaId: { in: bolsas.map((bolsa) => bolsa.id) } },
    _sum: { puntos: true },
  });

  const saldoPorBolsa = new Map(sumas.map((fila) => [fila.bolsaId, fila._sum.puntos ?? 0]));

  const vigentes: BolsaVigente[] = bolsas.map((bolsa) => ({
    id: bolsa.id,
    venceEn: bolsa.venceEn,
    esIlimitada: bolsa.esIlimitada,
    saldo: saldoPorBolsa.get(bolsa.id) ?? 0,
  }));

  const descubierto = await tx.movimientoPuntos.aggregate({
    where: { empresaId, bolsaId: null, periodoId: null },
    _sum: { puntos: true },
  });

  const saldoEnBolsas = vigentes
    .filter((bolsa) => !bolsa.esIlimitada)
    .reduce((total, bolsa) => total + bolsa.saldo, 0);

  return { bolsas: vigentes, saldo: saldoEnBolsas + (descubierto._sum.puntos ?? 0) };
}
