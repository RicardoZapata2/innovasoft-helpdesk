import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Aviso, Boton, Cargando, Etiqueta, Seleccion, Tarjeta, Vacio } from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta, fechaLarga, puntos } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { Cita, Empresa, EstadoDeCuenta, ListaCitas, Plan } from '../lib/tipos';

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

function PanelAsesor() {
  return (
    <>
      <Aviso tipo="info">
        Aquí ves las citas que tienes asignadas. Desde el listado puedes marcarlas como
        realizadas, que es lo que descuenta los puntos de la empresa.
      </Aviso>
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

      <ProximasCitas consulta="tamano=5" titulo="Próximas citas" />
    </>
  );
}
