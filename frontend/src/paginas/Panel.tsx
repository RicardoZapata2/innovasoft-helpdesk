import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Aviso, Boton, Cargando, Etiqueta, Seleccion, Tarjeta, Vacio } from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta, fechaLarga, puntos } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { Cita, Empresa, EstadoDeCuenta, ListaCitas, ListaTickets, Plan, Satisfaccion } from '../lib/tipos';

const COLOR_ALERTA = {
  SALDO_BAJO: 'aviso',
  SALDO_EN_DESCUBIERTO: 'error',
  BOLSA_POR_VENCER: 'aviso',
} as const;

export function Panel() {
  const { usuario } = useSesion();

  // Cada perfil llega a su propio panel: el asesor abre la aplicación para ver
  // a quién visita hoy, el cliente para ver cuántos puntos le quedan, y quien
  // coordina para ver el estado de la operación. Un panel único obligaría a los
  // tres a buscar lo suyo entre lo de los demás.
  const esAsesor = usuario?.perfil === 'Asesor';
  const esDeEmpresa = usuario?.ambito === 'EMPRESA';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Hola, {usuario?.nombres}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{usuario?.perfil}</p>
      </div>

      {esDeEmpresa ? <PanelCliente /> : esAsesor ? <PanelAsesor /> : <PanelInnovasoft />}
    </div>
  );
}

function ProximasCitas({ consulta, titulo }: { consulta: string; titulo: string }) {
  const citas = useQuery({
    queryKey: ['citas', 'panel', consulta],
    queryFn: () => api.get<ListaCitas>(`/citas?${consulta}`),
  });

  return (
    <Tarjeta
      titulo={titulo}
      accion={
        <Link to="/citas" className="text-sm font-medium text-marca-600 hover:underline dark:text-marca-300">
          Ver todas
        </Link>
      }
    >
      {citas.isPending && <Cargando />}
      {citas.data?.citas.length === 0 && <Vacio texto="No hay citas agendadas." />}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {citas.data?.citas.map((cita: Cita) => (
          <li key={cita.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {cita.codigo} · {cita.modalidad.nombre} · {cita.empresa.razonSocial}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fechaLarga(cita.inicioEn)} · {cita.asesor.usuario.nombres} {cita.asesor.usuario.apellidos}
              </p>
            </div>
            <Etiqueta texto={cita.estado.nombre} color={cita.estado.esFinal ? 'slate' : 'azul'} />
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

// Resumen de la bandeja por estado. Cada cifra lleva a la bandeja ya filtrada
// mentalmente: es lo primero que el usuario quiere saber al entrar.
function ResumenTickets({ titulo }: { titulo: string }) {
  const tickets = useQuery({
    queryKey: ['tickets', 'lista', 'panel'],
    queryFn: () => api.get<ListaTickets>('/tickets?tamano=5'),
  });

  const contar = (...claves: string[]) =>
    tickets.data?.porEstado.filter((e) => claves.includes(e.clave)).reduce((t, e) => t + e.cantidad, 0) ?? 0;

  const indicadores = [
    { titulo: 'Sin asignar', valor: contar('abierto', 'reabierto') },
    { titulo: 'En atención', valor: contar('asignado', 'en_atencion', 'en_espera_cliente') },
    { titulo: 'Resueltos', valor: contar('resuelto') },
    { titulo: 'Cerrados', valor: contar('cerrado') },
  ];

  return (
    <Tarjeta
      titulo={titulo}
      accion={
        <Link to="/tickets" className="text-sm font-medium text-marca-600 hover:underline dark:text-marca-300">
          Ir a la bandeja
        </Link>
      }
    >
      {tickets.isPending && <Cargando />}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {indicadores.map((indicador) => (
          <div key={indicador.titulo}>
            <p className="text-3xl font-bold text-marca-700 dark:text-marca-300">{indicador.valor}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{indicador.titulo}</p>
          </div>
        ))}
      </div>
      {tickets.data !== undefined && tickets.data.tickets.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {tickets.data.tickets.map((ticket) => (
            <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link to={`/tickets/${ticket.id}`} className="text-sm text-slate-700 hover:underline dark:text-slate-300">
                <span className="font-semibold text-marca-700 dark:text-marca-300">{ticket.codigo}</span> · {ticket.titulo}
              </Link>
              <Etiqueta texto={ticket.estado.nombre} color={ticket.estado.esFinal ? 'slate' : 'azul'} />
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

// Reporte de calificación de clientes: promedio y distribución de las
// encuestas respondidas al resolver cada ticket.
function ReporteSatisfaccion() {
  const satisfaccion = useQuery({
    queryKey: ['tickets', 'satisfaccion'],
    queryFn: () => api.get<Satisfaccion>('/tickets/satisfaccion'),
  });

  const maximo = Math.max(1, ...(satisfaccion.data?.distribucion.map((d) => d.cantidad) ?? [0]));

  return (
    <Tarjeta titulo="Calificación de los clientes">
      {satisfaccion.isPending && <Cargando />}
      {satisfaccion.data !== undefined && (
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-4xl font-bold text-amber-500">
              {satisfaccion.data.promedio === null ? '—' : satisfaccion.data.promedio.toFixed(1)}
              <span className="text-lg text-slate-400"> / 5</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {satisfaccion.data.respondidas} encuesta(s) respondida(s)
            </p>
          </div>
          <ul className="space-y-1.5 sm:col-span-2">
            {[...satisfaccion.data.distribucion].reverse().map((fila) => (
              <li key={fila.calificacion} className="flex items-center gap-3 text-xs">
                <span className="w-10 text-amber-500">{'★'.repeat(fila.calificacion)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(fila.cantidad / maximo) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-slate-500 dark:text-slate-400">{fila.cantidad}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  );
}

function PanelAsesor() {
  return (
    <>
      <Aviso tipo="info">
        Aquí ves tus casos y citas asignados. En cada ticket registras actividades y horas, lo resuelves y lo
        cierras: el cierre es lo que descuenta los puntos de la empresa.
      </Aviso>
      <ResumenTickets titulo="Mis tickets" />
      <ProximasCitas consulta="tamano=10" titulo="Mi agenda" />
    </>
  );
}

function PanelInnovasoft() {
  const empresas = useQuery({ queryKey: ['empresas'], queryFn: () => api.get<Empresa[]>('/empresas') });
  const citas = useQuery({ queryKey: ['citas', 'resumen'], queryFn: () => api.get<ListaCitas>('/citas?tamano=100') });

  const activas = empresas.data?.filter((empresa) => empresa.activa).length ?? 0;
  const pendientes = citas.data?.citas.filter((cita) => cita.estado.clave === 'solicitada').length ?? 0;
  const confirmadas = citas.data?.citas.filter((cita) => cita.estado.clave === 'confirmada').length ?? 0;
  const realizadas = citas.data?.citas.filter((cita) => cita.estado.clave === 'realizada').length ?? 0;

  const indicadores = [
    { titulo: 'Empresas activas', valor: activas, pie: `${empresas.data?.length ?? 0} registradas` },
    { titulo: 'Citas por confirmar', valor: pendientes, pie: 'esperan respuesta' },
    { titulo: 'Citas confirmadas', valor: confirmadas, pie: 'pendientes de atender' },
    { titulo: 'Citas realizadas', valor: realizadas, pie: 'ya descontaron puntos' },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicadores.map((indicador) => (
          <Tarjeta key={indicador.titulo}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {indicador.titulo}
            </p>
            <p className="mt-2 text-4xl font-bold text-marca-700 dark:text-marca-300">{indicador.valor}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{indicador.pie}</p>
          </Tarjeta>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ResumenTickets titulo="Operación de soporte" />
        <ReporteSatisfaccion />
      </div>

      <ProximasCitas consulta="tamano=8" titulo="Agenda de la operación" />
    </>
  );
}

function PanelCliente() {
  const clienteQuery = useQueryClient();
  const [plan, setPlan] = useState('profesional');

  const saldo = useQuery({ queryKey: ['saldo'], queryFn: () => api.get<EstadoDeCuenta>('/puntos/saldo') });
  const planes = useQuery({ queryKey: ['planes'], queryFn: () => api.publico<Plan[]>('/planes') });

  const contratar = useMutation({
    mutationFn: () => api.post('/puntos/contratar', { plan }),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['saldo'] });
      void clienteQuery.invalidateQueries({ queryKey: ['kardex'] });
    },
  });

  return (
    <>
      {saldo.data?.alertas.map((alerta) => (
        <Aviso key={alerta.tipo + alerta.mensaje} tipo={COLOR_ALERTA[alerta.tipo]}>
          {alerta.mensaje}
        </Aviso>
      ))}

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Saldo disponible" className="lg:col-span-1">
          {saldo.isPending && <Cargando />}
          {saldo.data !== undefined && (
            <>
              <p
                className={`text-5xl font-bold ${
                  saldo.data.saldoDisponible < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-marca-700 dark:text-marca-300'
                }`}
              >
                {saldo.data.tienePlanIlimitado ? '∞' : saldo.data.saldoDisponible}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {saldo.data.tienePlanIlimitado
                  ? 'Plan ilimitado vigente'
                  : `puntos de servicio · descubierto máximo ${saldo.data.topeDescubierto}`}
              </p>
            </>
          )}
        </Tarjeta>

        <Tarjeta titulo="Bolsas vigentes" className="lg:col-span-2">
          {saldo.isPending && <Cargando />}
          {saldo.data?.bolsas.length === 0 && (
            <Vacio texto="No hay bolsas vigentes. Contrata un plan para empezar." />
          )}
          <ul className="space-y-3">
            {saldo.data?.bolsas.map((bolsa) => (
              <li key={bolsa.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {bolsa.esIlimitada ? 'Bolsa ilimitada' : puntos(bolsa.saldo)}
                    {!bolsa.esIlimitada && (
                      <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                        de {bolsa.puntosIniciales}
                      </span>
                    )}
                  </span>
                  <Etiqueta texto={bolsa.origen} color={bolsa.origen === 'PROMOCION' ? 'verde' : 'slate'} />
                </div>

                {!bolsa.esIlimitada && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-marca-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, (bolsa.saldo / Math.max(1, bolsa.puntosIniciales)) * 100))}%`,
                      }}
                    />
                  </div>
                )}

                <p
                  className={`mt-2 text-xs ${
                    bolsa.diasParaVencer <= 10
                      ? 'font-medium text-amber-700 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Vence el {fechaCorta(bolsa.venceEn)} · quedan {bolsa.diasParaVencer} días
                </p>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Contratar o renovar">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-56 flex-1">
            <Seleccion etiqueta="Plan" value={plan} onChange={(evento) => setPlan(evento.target.value)}>
              {planes.data?.map((opcion) => (
                <option key={opcion.clave} value={opcion.clave}>
                  {opcion.nombre}
                  {opcion.puntosIncluidos !== null ? ` — ${opcion.puntosIncluidos} puntos` : ' — ilimitado'}
                </option>
              ))}
            </Seleccion>
          </div>
          <Boton onClick={() => contratar.mutate()} disabled={contratar.isPending}>
            {contratar.isPending ? 'Contratando…' : 'Contratar'}
          </Boton>
        </div>
        {contratar.isSuccess && (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
            Plan contratado. La bolsa de puntos ya está disponible.
          </p>
        )}
        {contratar.isError && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">{(contratar.error as Error).message}</p>
        )}
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <ResumenTickets titulo="Solicitudes de soporte" />
        <ReporteSatisfaccion />
      </div>

      <ProximasCitas consulta="tamano=5" titulo="Próximas citas" />
    </>
  );
}
