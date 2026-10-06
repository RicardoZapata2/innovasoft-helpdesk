import { datos, fechaPdf, nuevoDocumento, parrafo, seccion, tabla, terminar } from '../../../shared/pdf/documento-pdf.js';
import type { TicketsService } from './tickets.service.js';

type TicketDetalle = Awaited<ReturnType<TicketsService['obtener']>>;

// El reporte reúne lo que la propuesta exige del documento de cierre: datos del
// cliente, código, historial de estados, solución, asesor, horas y puntos.
// Se puede descargar en cualquier estado; mientras el caso no esté cerrado el
// título lo deja claro para que no se confunda con el reporte definitivo.
export function generarReporteCierre(ticket: TicketDetalle): Promise<Buffer> {
  const cerrado = ticket.estado.clave === 'cerrado';
  const doc = nuevoDocumento(
    cerrado ? `Reporte de cierre ${ticket.codigo}` : `Historial del ticket ${ticket.codigo}`,
    `${ticket.titulo} · Estado: ${ticket.estado.nombre}`,
  );

  seccion(doc, 'Cliente');
  datos(doc, [
    ['Empresa', ticket.empresa.razonSocial],
    ['NIT', ticket.empresa.nit],
    ['Solicitante', `${ticket.solicitante.nombres} ${ticket.solicitante.apellidos} (${ticket.solicitante.email})`],
  ]);

  seccion(doc, 'Caso');
  datos(doc, [
    ['Código', ticket.codigo],
    ['Categoría', ticket.categoria.nombre],
    ['Prioridad', ticket.prioridad],
    ['Abierto', fechaPdf(ticket.abiertoEn)],
    ['Resuelto', ticket.resueltoEn === null ? '—' : fechaPdf(ticket.resueltoEn)],
    ['Cerrado', ticket.cerradoEn === null ? '—' : fechaPdf(ticket.cerradoEn)],
    [
      'Asesor responsable',
      ticket.asesor === null ? 'Sin asignar' : `${ticket.asesor.usuario.nombres} ${ticket.asesor.usuario.apellidos}`,
    ],
  ]);
  doc.moveDown(0.4);
  parrafo(doc, ticket.descripcion);

  seccion(doc, 'Historial de estados');
  tabla(
    doc,
    ['Fecha', 'De', 'A', 'Usuario', 'Comentario'],
    [100, 70, 70, 95, 177],
    ticket.historial.map((cambio) => [
      fechaPdf(cambio.createdAt),
      cambio.estadoAnterior?.nombre ?? '—',
      cambio.estadoNuevo.nombre,
      `${cambio.usuario.nombres} ${cambio.usuario.apellidos}`,
      cambio.comentario ?? '',
    ]),
  );

  seccion(doc, 'Actividades y horas');
  if (ticket.actividades.length === 0) {
    parrafo(doc, 'No hay actividades registradas.');
  } else {
    tabla(
      doc,
      ['Fecha', 'Asesor', 'Actividad', 'Horas'],
      [100, 110, 252, 50],
      ticket.actividades.map((actividad) => [
        fechaPdf(actividad.fecha),
        `${actividad.asesor.usuario.nombres} ${actividad.asesor.usuario.apellidos}`,
        actividad.descripcion,
        Number(actividad.horas).toFixed(2),
      ]),
    );
    doc.moveDown(0.3);
    datos(doc, [['Total de horas', ticket.horasTrabajadas.toFixed(2)]]);
  }

  seccion(doc, 'Solución aplicada');
  datos(doc, [['Tipo de solución', ticket.tipoSolucion ?? 'Pendiente']]);
  if (ticket.descripcionSolucion !== null) {
    doc.moveDown(0.3);
    parrafo(doc, ticket.descripcionSolucion);
  }

  seccion(doc, 'Puntos consumidos');
  datos(doc, [
    ['Tarifa aplicada', ticket.tarifaAplicada === null ? 'Pendiente de cierre' : `${ticket.tarifaAplicada.nombre}`],
    ['Puntos descontados', String(ticket.puntosConsumidos)],
  ]);
  if (ticket.movimientos.length > 0) {
    doc.moveDown(0.3);
    tabla(
      doc,
      ['Fecha', 'Tipo', 'Detalle', 'Puntos'],
      [100, 80, 282, 50],
      ticket.movimientos.map((movimiento) => [
        fechaPdf(movimiento.createdAt),
        movimiento.tipo,
        movimiento.descripcion,
        String(movimiento.puntos),
      ]),
    );
  }

  if (ticket.encuesta !== null) {
    seccion(doc, 'Satisfacción del cliente');
    datos(doc, [['Calificación', `${ticket.encuesta.calificacion} de 5`]]);
    if (ticket.encuesta.comentario !== null) {
      parrafo(doc, ticket.encuesta.comentario);
    }
  }

  return terminar(doc);
}
