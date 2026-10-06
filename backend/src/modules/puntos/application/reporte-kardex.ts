import { datos, fechaPdf, nuevoDocumento, seccion, tabla, terminar } from '../../../shared/pdf/documento-pdf.js';

type Fila = {
  tipo: string;
  puntos: number;
  descripcion: string;
  createdAt: Date;
  bolsa: { origen: string; venceEn: Date } | null;
  ticket: { codigo: string } | null;
  cita: { codigo: string } | null;
};

export type DatosReporteKardex = {
  empresa: { razonSocial: string; nit: string };
  saldoDisponible: number;
  tienePlanIlimitado: boolean;
  desde?: string;
  hasta?: string;
  movimientos: Fila[];
};

export function generarReporteKardex(reporte: DatosReporteKardex): Promise<Buffer> {
  const periodo =
    reporte.desde === undefined && reporte.hasta === undefined
      ? 'Todos los movimientos'
      : `Del ${reporte.desde?.slice(0, 10) ?? 'inicio'} al ${reporte.hasta?.slice(0, 10) ?? 'hoy'}`;

  const doc = nuevoDocumento('Kardex de puntos de servicio', `${reporte.empresa.razonSocial} · ${periodo}`);

  const entradas = reporte.movimientos.filter((m) => m.puntos > 0).reduce((t, m) => t + m.puntos, 0);
  const salidas = reporte.movimientos.filter((m) => m.puntos < 0).reduce((t, m) => t + m.puntos, 0);

  seccion(doc, 'Resumen');
  datos(doc, [
    ['Empresa', `${reporte.empresa.razonSocial} (NIT ${reporte.empresa.nit})`],
    ['Saldo disponible hoy', reporte.tienePlanIlimitado ? 'Plan ilimitado vigente' : `${reporte.saldoDisponible} puntos`],
    ['Puntos que entraron en el periodo', String(entradas)],
    ['Puntos que salieron en el periodo', String(-salidas)],
    ['Movimientos', String(reporte.movimientos.length)],
  ]);

  seccion(doc, 'Movimientos');
  tabla(
    doc,
    ['Fecha', 'Tipo', 'Concepto', 'Origen', 'Puntos'],
    [100, 70, 210, 82, 50],
    reporte.movimientos.map((movimiento) => [
      fechaPdf(movimiento.createdAt),
      movimiento.tipo,
      movimiento.descripcion,
      // La marca de origen es la que separa lo pagado con el plan de lo que
      // llegó como beneficio de fidelización.
      movimiento.ticket?.codigo ??
        movimiento.cita?.codigo ??
        (movimiento.bolsa?.origen === 'PROMOCION' ? 'Beneficio' : (movimiento.bolsa?.origen ?? '—')),
      `${movimiento.puntos > 0 ? '+' : ''}${movimiento.puntos}`,
    ]),
  );

  return terminar(doc);
}
