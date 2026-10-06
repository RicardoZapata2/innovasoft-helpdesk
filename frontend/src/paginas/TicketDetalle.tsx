import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Aviso, Boton, Campo, Cargando, ErrorDelServidor, Etiqueta, Seleccion, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { fechaLarga } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { TicketDetalle as Ticket } from '../lib/tipos';
import { COLOR_ESTADO_TICKET, COLOR_PRIORIDAD, useCatalogosTicket } from './Tickets';

type Ventana = 'asignar' | 'resolver' | 'cerrar' | 'reabrir' | 'espera' | null;

const CONTROL =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca-500 ' +
  'focus:outline-none focus:ring-1 focus:ring-marca-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

export function TicketDetalle() {
  const { id = '' } = useParams();
  const ubicacion = useLocation();
  const { usuario, puede } = useSesion();
  const clienteQuery = useQueryClient();
  const [ventana, setVentana] = useState<Ventana>(null);
  const [mensaje, setMensaje] = useState('');

  const ticket = useQuery({
    queryKey: ['tickets', 'detalle', id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`),
  });

  const actualizar = (texto: string) => {
    void clienteQuery.invalidateQueries({ queryKey: ['tickets'] });
    void clienteQuery.invalidateQueries({ queryKey: ['saldo'] });
    void clienteQuery.invalidateQueries({ queryKey: ['kardex'] });
    void clienteQuery.invalidateQueries({ queryKey: ['fidelizacion'] });
    setVentana(null);
    setMensaje(texto);
  };

  const mover = useMutation({
    mutationFn: (datos: { estado: string; comentario?: string }) => api.post(`/tickets/${id}/estado`, datos),
    onSuccess: (_, datos) => actualizar(`El ticket pasó a "${datos.estado.replaceAll('_', ' ')}".`),
  });

  const pdf = useMutation({
    mutationFn: (codigo: string) => api.descargar(`/tickets/${id}/pdf`, `${codigo}.pdf`),
  });

  if (ticket.isPending) return <Cargando />;
  if (ticket.isError) return <ErrorDelServidor error={ticket.error} />;

  const t = ticket.data;
  const puedeAsignar = puede('tickets.asignar') && !t.estado.esFinal;

  return (
    <div className="space-y-6">
      <Link to="/tickets" className="text-sm font-medium text-marca-600 hover:underline dark:text-marca-300">
        ← Volver a la bandeja
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t.codigo}</h1>
            <Etiqueta texto={t.estado.nombre} color={COLOR_ESTADO_TICKET[t.estado.clave]} />
            <Etiqueta texto={t.prioridad} color={COLOR_PRIORIDAD[t.prioridad]} />
          </div>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">{t.titulo}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {puedeAsignar && (
            <Boton variante="secundario" onClick={() => setVentana('asignar')}>
              {t.asesor === null ? 'Asignar asesor' : 'Reasignar'}
            </Boton>
          )}
          {t.acciones.includes('en_atencion') && (
            <Boton
              variante="secundario"
              disabled={mover.isPending || t.asesor === null}
              title={t.asesor === null ? 'Primero asigna un asesor' : undefined}
              onClick={() => mover.mutate({ estado: 'en_atencion', comentario: 'Inicio de la atención' })}
            >
              {t.estado.clave === 'en_espera_cliente' ? 'Retomar atención' : 'Iniciar atención'}
            </Boton>
          )}
          {t.acciones.includes('en_espera_cliente') && (
            <Boton variante="secundario" onClick={() => setVentana('espera')}>
              Esperar al cliente
            </Boton>
          )}
          {t.acciones.includes('resuelto') && <Boton onClick={() => setVentana('resolver')}>Resolver</Boton>}
          {t.acciones.includes('cerrado') && <Boton onClick={() => setVentana('cerrar')}>Cerrar y descontar</Boton>}
          {t.acciones.includes('reabierto') && (
            <Boton variante="peligro" onClick={() => setVentana('reabrir')}>
              Reabrir
            </Boton>
          )}
          {puede('tickets.exportar_pdf') && (
            <Boton variante="secundario" disabled={pdf.isPending} onClick={() => pdf.mutate(t.codigo)}>
              {pdf.isPending ? 'Generando…' : t.estado.clave === 'cerrado' ? 'Reporte de cierre PDF' : 'Historial PDF'}
            </Boton>
          )}
        </div>
      </div>

      {(ubicacion.state as { creado?: boolean } | null)?.creado === true && mensaje === '' && (
        <Aviso tipo="exito">Ticket registrado. Un coordinador lo asignará a un asesor.</Aviso>
      )}
      {mensaje !== '' && <Aviso tipo="exito">{mensaje}</Aviso>}
      {mover.isError && <ErrorDelServidor error={mover.error} />}
      {pdf.isError && <ErrorDelServidor error={pdf.error} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tarjeta titulo="Descripción">
            <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{t.descripcion}</p>
          </Tarjeta>

          {t.tipoSolucion !== null && (
            <Tarjeta titulo="Solución aplicada">
              <Etiqueta texto={t.tipoSolucion} color="verde" />
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{t.descripcionSolucion}</p>
            </Tarjeta>
          )}

          <LineaDeTiempo ticket={t} />

          {puede('tickets.registrar_actividad') &&
            ['asignado', 'en_atencion', 'en_espera_cliente', 'reabierto'].includes(t.estado.clave) && (
              <FormularioActividad ticketId={t.id} onListo={() => actualizar('Actividad registrada.')} />
            )}
        </div>

        <div className="space-y-6">
          <Tarjeta titulo="Datos del caso">
            <dl className="space-y-2 text-sm">
              <Dato etiqueta="Empresa">{t.empresa.razonSocial}</Dato>
              <Dato etiqueta="Solicitante">
                {t.solicitante.nombres} {t.solicitante.apellidos}
              </Dato>
              <Dato etiqueta="Categoría">{t.categoria.nombre}</Dato>
              <Dato etiqueta="Asesor">
                {t.asesor === null ? 'Sin asignar' : `${t.asesor.usuario.nombres} ${t.asesor.usuario.apellidos}`}
              </Dato>
              <Dato etiqueta="Abierto">{fechaLarga(t.abiertoEn)}</Dato>
              {t.cerradoEn !== null && <Dato etiqueta="Cerrado">{fechaLarga(t.cerradoEn)}</Dato>}
              <Dato etiqueta="Horas trabajadas">{t.horasTrabajadas.toFixed(2)}</Dato>
              <Dato etiqueta="Puntos descontados">
                <span className="font-semibold text-marca-700 dark:text-marca-300">{t.puntosConsumidos}</span>
                {t.tarifaAplicada !== null && (
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{t.tarifaAplicada.nombre}</span>
                )}
              </Dato>
              {t.fidelidad.length > 0 && (
                <Dato etiqueta="Fidelidad ganada">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    +{t.fidelidad.reduce((total, m) => total + m.puntos, 0)} puntos
                  </span>
                </Dato>
              )}
            </dl>
          </Tarjeta>

          <Adjuntos ticket={t} onListo={() => actualizar('Evidencia adjuntada.')} />

          {usuario?.ambito === 'EMPRESA' || t.encuesta !== null ? (
            <Encuesta ticket={t} onListo={() => actualizar('¡Gracias! Tu calificación quedó registrada y sumaste 10 puntos de fidelidad.')} />
          ) : null}
        </div>
      </div>

      {ventana === 'asignar' && <VentanaAsignar ticket={t} onCerrar={() => setVentana(null)} onListo={actualizar} />}
      {ventana === 'resolver' && <VentanaResolver ticket={t} onCerrar={() => setVentana(null)} onListo={actualizar} />}
      {ventana === 'cerrar' && <VentanaCerrar ticket={t} onCerrar={() => setVentana(null)} onListo={actualizar} />}
      {(ventana === 'reabrir' || ventana === 'espera') && (
        <VentanaComentario
          titulo={ventana === 'reabrir' ? `Reabrir ${t.codigo}` : 'Esperar respuesta del cliente'}
          descripcion={
            ventana === 'reabrir'
              ? 'El caso vuelve a atención. Si ya se había cobrado, no se descuentan puntos otra vez.'
              : 'El caso queda en pausa hasta que el cliente responda. Explica qué se le pidió.'
          }
          obligatorio={ventana === 'reabrir'}
          ocupado={mover.isPending}
          error={mover.error}
          onCerrar={() => setVentana(null)}
          onConfirmar={(comentario) =>
            mover.mutate({ estado: ventana === 'reabrir' ? 'reabierto' : 'en_espera_cliente', comentario })
          }
        />
      )}
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-right text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  );
}

function LineaDeTiempo({ ticket }: { ticket: Ticket }) {
  // La línea de tiempo mezcla cambios de estado, actividades y evidencias en
  // orden cronológico: es la historia completa del caso en un solo lugar.
  const eventos = [
    ...ticket.historial.map((cambio) => ({
      id: cambio.id,
      fecha: cambio.createdAt,
      color: 'bg-marca-500',
      titulo:
        cambio.estadoAnterior === null
          ? `Creado como ${cambio.estadoNuevo.nombre}`
          : cambio.estadoAnterior.clave === cambio.estadoNuevo.clave
            ? cambio.comentario ?? 'Actualización'
            : `${cambio.estadoAnterior.nombre} → ${cambio.estadoNuevo.nombre}`,
      detalle: cambio.estadoAnterior?.clave === cambio.estadoNuevo.clave ? null : cambio.comentario,
      autor: `${cambio.usuario.nombres} ${cambio.usuario.apellidos}`,
    })),
    ...ticket.actividades.map((actividad) => ({
      id: actividad.id,
      fecha: actividad.fecha,
      color: 'bg-emerald-500',
      titulo: `Actividad · ${Number(actividad.horas).toFixed(2)} h`,
      detalle: actividad.descripcion,
      autor: `${actividad.asesor.usuario.nombres} ${actividad.asesor.usuario.apellidos}`,
    })),
    ...ticket.adjuntos.map((adjunto) => ({
      id: adjunto.id,
      fecha: adjunto.createdAt,
      color: 'bg-amber-500',
      titulo: 'Evidencia adjuntada',
      detalle: adjunto.nombreArchivo,
      autor: `${adjunto.subidoPor.nombres} ${adjunto.subidoPor.apellidos}`,
    })),
  ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return (
    <Tarjeta titulo="Línea de tiempo">
      <ol className="relative space-y-5 border-l border-slate-200 pl-6 dark:border-slate-700">
        {eventos.map((evento) => (
          <li key={evento.id} className="relative">
            <span className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900 ${evento.color}`} />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{evento.titulo}</p>
            {evento.detalle !== null && evento.detalle !== '' && (
              <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{evento.detalle}</p>
            )}
            <p className="mt-0.5 text-xs text-slate-400">
              {fechaLarga(evento.fecha)} · {evento.autor}
            </p>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}

function FormularioActividad({ ticketId, onListo }: { ticketId: string; onListo: () => void }) {
  const [descripcion, setDescripcion] = useState('');
  const [horas, setHoras] = useState('0.5');

  const registrar = useMutation({
    mutationFn: () => api.post(`/tickets/${ticketId}/actividades`, { descripcion, horas: Number(horas) }),
    onSuccess: () => {
      setDescripcion('');
      setHoras('0.5');
      onListo();
    },
  });

  return (
    <Tarjeta titulo="Registrar actividad y horas">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-3">
          <Campo
            etiqueta="Qué se hizo"
            placeholder="Ej.: Revisión remota del servidor de facturación"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <Campo
          etiqueta="Horas"
          type="number"
          min={0.25}
          max={24}
          step={0.25}
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
        />
      </div>
      {registrar.isError && (
        <div className="mt-4">
          <ErrorDelServidor error={registrar.error} />
        </div>
      )}
      <Boton className="mt-4" disabled={registrar.isPending || descripcion.trim().length < 5} onClick={() => registrar.mutate()}>
        {registrar.isPending ? 'Guardando…' : 'Registrar actividad'}
      </Boton>
    </Tarjeta>
  );
}

function Adjuntos({ ticket, onListo }: { ticket: Ticket; onListo: () => void }) {
  const { puede } = useSesion();
  const catalogos = useCatalogosTicket();

  const subir = useMutation({
    mutationFn: (archivo: File) => api.subir(`/tickets/${ticket.id}/adjuntos`, archivo),
    onSuccess: onListo,
  });

  const bajar = useMutation({
    mutationFn: (adjunto: { id: string; nombreArchivo: string }) =>
      api.descargar(`/tickets/${ticket.id}/adjuntos/${adjunto.id}`, adjunto.nombreArchivo),
  });

  return (
    <Tarjeta titulo={`Evidencias (${ticket.adjuntos.length})`}>
      {ticket.adjuntos.length === 0 && <Vacio texto="Sin archivos adjuntos." />}
      <ul className="space-y-2">
        {ticket.adjuntos.map((adjunto) => (
          <li key={adjunto.id} className="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={() => bajar.mutate(adjunto)}
              className="truncate text-left font-medium text-marca-700 hover:underline dark:text-marca-300"
            >
              {adjunto.nombreArchivo}
            </button>
            <span className="shrink-0 text-xs text-slate-400">{Math.ceil(adjunto.tamanoBytes / 1024)} KB</span>
          </li>
        ))}
      </ul>

      {(puede('tickets.subir_evidencias') || puede('tickets.crear')) && !ticket.estado.esFinal && (
        <label className="mt-4 block">
          <span className="sr-only">Adjuntar archivo</span>
          <input
            type="file"
            accept={catalogos.data?.tiposAdjunto.join(',')}
            disabled={subir.isPending}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo !== undefined) subir.mutate(archivo);
              e.target.value = '';
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-marca-50
              file:px-3 file:py-2 file:text-sm file:font-medium file:text-marca-700 dark:text-slate-300
              dark:file:bg-slate-800 dark:file:text-marca-300"
          />
        </label>
      )}
      {subir.isPending && <p className="mt-2 text-xs text-slate-500">Subiendo…</p>}
      {subir.isError && (
        <div className="mt-3">
          <ErrorDelServidor error={subir.error} />
        </div>
      )}
      {bajar.isError && (
        <div className="mt-3">
          <ErrorDelServidor error={bajar.error} />
        </div>
      )}
    </Tarjeta>
  );
}

function Estrellas({ valor, onElegir }: { valor: number; onElegir?: (valor: number) => void }) {
  return (
    <div className="flex gap-1" role={onElegir === undefined ? undefined : 'radiogroup'} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={onElegir === undefined}
          onClick={() => onElegir?.(n)}
          aria-label={`${n} de 5`}
          className={`text-2xl leading-none transition ${n <= valor ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'} ${
            onElegir === undefined ? 'cursor-default' : 'hover:scale-110'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function Encuesta({ ticket, onListo }: { ticket: Ticket; onListo: () => void }) {
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');

  const responder = useMutation({
    mutationFn: () => api.post(`/tickets/${ticket.id}/encuesta`, { calificacion, comentario }),
    onSuccess: onListo,
  });

  if (ticket.encuesta !== null) {
    return (
      <Tarjeta titulo="Calificación del cliente">
        <Estrellas valor={ticket.encuesta.calificacion} />
        {ticket.encuesta.comentario !== null && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">“{ticket.encuesta.comentario}”</p>
        )}
      </Tarjeta>
    );
  }

  if (!['resuelto', 'cerrado'].includes(ticket.estado.clave)) {
    return (
      <Tarjeta titulo="Calificación del cliente">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cuando el caso esté resuelto podrás calificar la atención y ganar 10 puntos de fidelidad.
        </p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo="¿Cómo te atendimos?">
      <Estrellas valor={calificacion} onElegir={setCalificacion} />
      <textarea
        rows={3}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Comentario opcional"
        className={`mt-3 ${CONTROL}`}
      />
      {responder.isError && (
        <div className="mt-3">
          <ErrorDelServidor error={responder.error} />
        </div>
      )}
      <Boton className="mt-3 w-full" disabled={calificacion === 0 || responder.isPending} onClick={() => responder.mutate()}>
        {responder.isPending ? 'Enviando…' : 'Enviar calificación'}
      </Boton>
    </Tarjeta>
  );
}

function Modal({ titulo, descripcion, children, onCerrar }: { titulo: string; descripcion?: string; children: ReactNode; onCerrar: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{titulo}</h2>
        {descripcion !== undefined && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{descripcion}</p>}
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function PieModal({ ocupado, deshabilitado, texto, onCerrar, onConfirmar }: {
  ocupado: boolean;
  deshabilitado?: boolean;
  texto: string;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Boton variante="secundario" onClick={onCerrar} disabled={ocupado}>
        Cancelar
      </Boton>
      <Boton onClick={onConfirmar} disabled={ocupado || deshabilitado === true}>
        {ocupado ? 'Procesando…' : texto}
      </Boton>
    </div>
  );
}

type PropsVentana = { ticket: Ticket; onCerrar: () => void; onListo: (mensaje: string) => void };

function VentanaAsignar({ ticket, onCerrar, onListo }: PropsVentana) {
  const catalogos = useCatalogosTicket();
  const [asesorId, setAsesorId] = useState('');

  const asignar = useMutation({
    mutationFn: () => api.post<Ticket>(`/tickets/${ticket.id}/asignar`, asesorId === '' ? {} : { asesorId }),
    onSuccess: (actualizado) =>
      onListo(`Asignado a ${actualizado.asesor?.usuario.nombres} ${actualizado.asesor?.usuario.apellidos}.`),
  });

  return (
    <Modal titulo={`Asignar ${ticket.codigo}`} descripcion="La asignación automática elige al asesor con menos casos abiertos." onCerrar={onCerrar}>
      <Seleccion etiqueta="Asesor" value={asesorId} onChange={(e) => setAsesorId(e.target.value)}>
        <option value="">Automática (menor carga)</option>
        {catalogos.data?.asesores.map((asesor) => (
          <option key={asesor.id} value={asesor.id}>
            {asesor.usuario.nombres} {asesor.usuario.apellidos}
            {asesor.especialidad !== null ? ` — ${asesor.especialidad}` : ''}
          </option>
        ))}
      </Seleccion>
      {asignar.isError && <ErrorDelServidor error={asignar.error} />}
      <PieModal ocupado={asignar.isPending} texto="Asignar" onCerrar={onCerrar} onConfirmar={() => asignar.mutate()} />
    </Modal>
  );
}

function VentanaResolver({ ticket, onCerrar, onListo }: PropsVentana) {
  const catalogos = useCatalogosTicket();
  const [tipoSolucion, setTipoSolucion] = useState('');
  const [descripcionSolucion, setDescripcionSolucion] = useState('');

  const resolver = useMutation({
    mutationFn: () => api.post(`/tickets/${ticket.id}/resolver`, { tipoSolucion, descripcionSolucion }),
    onSuccess: () => onListo('Ticket resuelto. El cliente ya puede calificar la atención.'),
  });

  return (
    <Modal titulo={`Resolver ${ticket.codigo}`} descripcion="Documenta la solución. El cliente la verá y podrá calificarla." onCerrar={onCerrar}>
      {ticket.actividades.length === 0 && (
        <Aviso tipo="aviso">Registra al menos una actividad con sus horas antes de resolver.</Aviso>
      )}
      <Seleccion etiqueta="Tipo de solución" value={tipoSolucion} onChange={(e) => setTipoSolucion(e.target.value)}>
        <option value="">Elige…</option>
        {catalogos.data?.tiposSolucion.map((tipo) => (
          <option key={tipo} value={tipo}>
            {tipo}
          </option>
        ))}
      </Seleccion>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción de la solución</span>
        <textarea rows={4} value={descripcionSolucion} onChange={(e) => setDescripcionSolucion(e.target.value)} className={CONTROL} />
      </label>
      {resolver.isError && <ErrorDelServidor error={resolver.error} />}
      <PieModal
        ocupado={resolver.isPending}
        deshabilitado={tipoSolucion === '' || descripcionSolucion.trim().length < 10}
        texto="Marcar como resuelto"
        onCerrar={onCerrar}
        onConfirmar={() => resolver.mutate()}
      />
    </Modal>
  );
}

function VentanaCerrar({ ticket, onCerrar, onListo }: PropsVentana) {
  const catalogos = useCatalogosTicket();
  const [tarifa, setTarifa] = useState(ticket.tarifaSugerida);
  const elegida = catalogos.data?.tarifas.find((opcion) => opcion.clave === tarifa);
  const yaCobrado = ticket.movimientos.length > 0;

  const cerrar = useMutation({
    mutationFn: () =>
      api.post<{ consumo: { saldoNuevo: number; descubierto: number } | null }>(`/tickets/${ticket.id}/cerrar`, { tarifa }),
    onSuccess: (resultado) =>
      onListo(
        resultado.consumo === null
          ? 'Ticket cerrado. Ya se había cobrado antes de reabrirse, no se descontaron puntos.'
          : `Ticket cerrado. Se descontaron ${elegida?.puntos ?? ''} puntos; saldo de la empresa: ${resultado.consumo.saldoNuevo}.` +
              (resultado.consumo.descubierto > 0 ? ` Quedaron ${resultado.consumo.descubierto} en descubierto.` : ''),
      ),
  });

  return (
    <Modal
      titulo={`Cerrar ${ticket.codigo}`}
      descripcion="Al cerrar se descuentan los puntos de la tarifa elegida de la bolsa que vence primero. Es una sola operación: si el descuento falla, el ticket no se cierra."
      onCerrar={onCerrar}
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Horas registradas: <strong>{ticket.horasTrabajadas.toFixed(2)}</strong>. Tarifa sugerida según las horas.
      </p>
      <Seleccion etiqueta="Servicio prestado" value={tarifa} onChange={(e) => setTarifa(e.target.value)}>
        {catalogos.data?.tarifas.map((opcion) => (
          <option key={opcion.clave} value={opcion.clave}>
            {opcion.nombre} — {opcion.puntos} {opcion.puntos === 1 ? 'punto' : 'puntos'}
          </option>
        ))}
      </Seleccion>
      {yaCobrado && <Aviso tipo="info">Este ticket ya fue cobrado antes de reabrirse: no se descontará de nuevo.</Aviso>}
      {cerrar.isError && <ErrorDelServidor error={cerrar.error} />}
      <PieModal
        ocupado={cerrar.isPending}
        texto={yaCobrado ? 'Cerrar' : `Cerrar y descontar ${elegida?.puntos ?? ''} puntos`}
        onCerrar={onCerrar}
        onConfirmar={() => cerrar.mutate()}
      />
    </Modal>
  );
}

function VentanaComentario({
  titulo,
  descripcion,
  obligatorio,
  ocupado,
  error,
  onCerrar,
  onConfirmar,
}: {
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  ocupado: boolean;
  error: unknown;
  onCerrar: () => void;
  onConfirmar: (comentario: string) => void;
}) {
  const [comentario, setComentario] = useState('');

  return (
    <Modal titulo={titulo} descripcion={descripcion} onCerrar={onCerrar}>
      <textarea rows={3} autoFocus value={comentario} onChange={(e) => setComentario(e.target.value)} className={CONTROL} />
      {error !== null && <ErrorDelServidor error={error} />}
      <PieModal
        ocupado={ocupado}
        deshabilitado={obligatorio && comentario.trim() === ''}
        texto="Confirmar"
        onCerrar={onCerrar}
        onConfirmar={() => onConfirmar(comentario)}
      />
    </Modal>
  );
}
