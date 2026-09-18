import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SelectorEmpresa } from '../componentes/SelectorEmpresa';
import {
  Aviso, Boton, Campo, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Seleccion, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta, fechaLarga, hora } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { Asesor, Cita, FranjasDisponibles, ListaCitas } from '../lib/tipos';

const COLOR_ESTADO: Record<string, string> = {
  solicitada: 'ambar',
  confirmada: 'azul',
  reprogramada: 'ambar',
  en_curso: 'azul',
  realizada: 'verde',
  cancelada: 'slate',
  no_asistida: 'rojo',
};

function proximoDiaHabil(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  while (fecha.getDay() === 0 || fecha.getDay() === 6) {
    fecha.setDate(fecha.getDate() + 1);
  }

  return fecha.toISOString().slice(0, 10);
}

export function Citas() {
  const { usuario, puede } = useSesion();
  const clienteQuery = useQueryClient();

  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';
  const [estado, setEstado] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [agendando, setAgendando] = useState(false);
  const [porCancelar, setPorCancelar] = useState<Cita | null>(null);
  const [motivo, setMotivo] = useState('');

  const consulta = new URLSearchParams({ tamano: '50' });
  if (estado !== '') consulta.set('estado', estado);
  if (esInnovasoft && empresaId !== '') consulta.set('empresaId', empresaId);

  const citas = useQuery({
    queryKey: ['citas', consulta.toString()],
    queryFn: () => api.get<ListaCitas>(`/citas?${consulta.toString()}`),
  });

  const accion = useMutation({
    mutationFn: ({ id, ruta, cuerpo }: { id: string; ruta: string; cuerpo?: unknown }) =>
      api.post(`/citas/${id}/${ruta}`, cuerpo),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['citas'] });
      void clienteQuery.invalidateQueries({ queryKey: ['saldo'] });
      void clienteQuery.invalidateQueries({ queryKey: ['kardex'] });
      void clienteQuery.invalidateQueries({ queryKey: ['franjas'] });
      setPorCancelar(null);
      setMotivo('');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Citas técnicas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Visitas presenciales y sesiones remotas agendadas con los asesores.
          </p>
        </div>
        {puede('citas.crear') && (
          <Boton onClick={() => setAgendando((abierto) => !abierto)}>
            {agendando ? 'Cerrar' : 'Agendar cita'}
          </Boton>
        )}
      </div>

      {agendando && <FormularioAgendar onListo={() => setAgendando(false)} />}

      {accion.isError && <ErrorDelServidor error={accion.error} />}

      <Tarjeta>
        <div className="grid gap-4 sm:grid-cols-2">
          <Seleccion etiqueta="Estado" value={estado} onChange={(evento) => setEstado(evento.target.value)}>
            <option value="">Todos</option>
            <option value="solicitada">Solicitada</option>
            <option value="confirmada">Confirmada</option>
            <option value="reprogramada">Reprogramada</option>
            <option value="realizada">Realizada</option>
            <option value="cancelada">Cancelada</option>
            <option value="no_asistida">No asistida</option>
          </Seleccion>

          {esInnovasoft && (
            <SelectorEmpresa
              valor={empresaId}
              onCambio={setEmpresaId}
              etiqueta="Empresa (vacío = todas)"
            />
          )}
        </div>
      </Tarjeta>

      {citas.isPending && <Cargando />}
      {citas.isError && <ErrorDelServidor error={citas.error} />}
      {citas.data?.citas.length === 0 && <Vacio texto="No hay citas con ese filtro." />}

      <div className="space-y-4">
        {citas.data?.citas.map((cita) => (
          <Tarjeta key={cita.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{cita.codigo}</span>
                  <Etiqueta texto={cita.estado.nombre} color={COLOR_ESTADO[cita.estado.clave]} />
                  <Etiqueta texto={cita.modalidad.nombre} />
                  {cita.tarifaAplicada !== null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {cita.tarifaAplicada.puntos} puntos
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {fechaLarga(cita.inicioEn)} — {hora(cita.finEn)}
                </p>

                <dl className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    Asesor: {cita.asesor.usuario.nombres} {cita.asesor.usuario.apellidos}
                  </div>
                  <div>Empresa: {cita.empresa.razonSocial}</div>
                  <div>
                    Solicitó: {cita.solicitante.nombres} {cita.solicitante.apellidos}
                  </div>
                  {cita.direccion !== null && <div>Dirección: {cita.direccion}</div>}
                  {cita.enlace !== null && <div>Enlace: {cita.enlace}</div>}
                  {cita.motivoCancelacion !== null && (
                    <div className="text-red-600 dark:text-red-400">Motivo: {cita.motivoCancelacion}</div>
                  )}
                </dl>
              </div>

              {!cita.estado.esFinal && (
                <div className="flex flex-wrap gap-2">
                  {cita.estado.clave === 'solicitada' && puede('citas.confirmar') && (
                    <Boton
                      variante="secundario"
                      disabled={accion.isPending}
                      onClick={() => accion.mutate({ id: cita.id, ruta: 'confirmar' })}
                    >
                      Confirmar
                    </Boton>
                  )}

                  {puede('citas.marcar_realizada') && cita.estado.clave !== 'solicitada' && (
                    <Boton
                      disabled={accion.isPending}
                      onClick={() => accion.mutate({ id: cita.id, ruta: 'realizada' })}
                    >
                      Marcar realizada
                    </Boton>
                  )}

                  {puede('citas.cancelar') && (
                    <Boton variante="peligro" disabled={accion.isPending} onClick={() => setPorCancelar(cita)}>
                      Cancelar
                    </Boton>
                  )}
                </div>
              )}
            </div>
          </Tarjeta>
        ))}
      </div>

      {porCancelar !== null && (
        <Dialogo
          titulo={`Cancelar la cita ${porCancelar.codigo}`}
          descripcion="La franja del asesor vuelve a quedar libre. El motivo queda registrado en la cita."
          textoConfirmar="Cancelar la cita"
          varianteConfirmar="peligro"
          pideMotivo
          etiquetaMotivo="¿Por qué se cancela?"
          motivo={motivo}
          onMotivo={setMotivo}
          ocupado={accion.isPending}
          onConfirmar={() => accion.mutate({ id: porCancelar.id, ruta: 'cancelar', cuerpo: { motivo } })}
          onCancelar={() => {
            setPorCancelar(null);
            setMotivo('');
          }}
        />
      )}
    </div>
  );
}

function FormularioAgendar({ onListo }: { onListo: () => void }) {
  const clienteQuery = useQueryClient();
  const { usuario } = useSesion();
  const [asesorId, setAsesorId] = useState('');
  const [fecha, setFecha] = useState(proximoDiaHabil());
  const [modalidad, setModalidad] = useState<'presencial' | 'remoto'>('presencial');
  const [franja, setFranja] = useState('');
  const [direccion, setDireccion] = useState('');
  const [enlace, setEnlace] = useState('');
  const [empresaId, setEmpresaId] = useState('');

  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';
  const asesores = useQuery({ queryKey: ['asesores'], queryFn: () => api.get<Asesor[]>('/asesores') });
  const elegido = asesorId !== '' ? asesorId : (asesores.data?.[0]?.id ?? '');

  const franjas = useQuery({
    queryKey: ['franjas', elegido, fecha],
    queryFn: () => api.get<FranjasDisponibles>(`/citas/franjas?asesorId=${elegido}&fecha=${fecha}`),
    enabled: elegido !== '',
  });

  const agendar = useMutation({
    mutationFn: () =>
      api.post('/citas', {
        asesorId: elegido,
        modalidad,
        inicioEn: franja,
        ...(modalidad === 'presencial' ? { direccion } : { enlace }),
        ...(esInnovasoft && empresaId !== '' ? { empresaId } : {}),
      }),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['citas'] });
      void clienteQuery.invalidateQueries({ queryKey: ['franjas'] });
      onListo();
    },
  });

  return (
    <Tarjeta titulo="Agendar una cita">
      <div className="grid gap-4 md:grid-cols-2">
        {esInnovasoft && <SelectorEmpresa valor={empresaId} onCambio={setEmpresaId} />}

        <Seleccion etiqueta="Asesor" value={elegido} onChange={(evento) => setAsesorId(evento.target.value)}>
          {asesores.data?.map((asesor) => (
            <option key={asesor.id} value={asesor.id}>
              {asesor.usuario.nombres} {asesor.usuario.apellidos}
              {asesor.especialidad !== null ? ` — ${asesor.especialidad}` : ''}
            </option>
          ))}
        </Seleccion>

        <Campo
          etiqueta="Fecha"
          type="date"
          value={fecha}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(evento) => {
            setFecha(evento.target.value);
            setFranja('');
          }}
        />

        <Seleccion
          etiqueta="Modalidad"
          value={modalidad}
          onChange={(evento) => setModalidad(evento.target.value as 'presencial' | 'remoto')}
        >
          <option value="presencial">Presencial — visita en la ciudad (5 puntos)</option>
          <option value="remoto">Remoto — soporte básico (1 punto)</option>
        </Seleccion>

        {modalidad === 'presencial' ? (
          <Campo
            etiqueta="Dirección de la visita"
            value={direccion}
            onChange={(evento) => setDireccion(evento.target.value)}
          />
        ) : (
          <Campo
            etiqueta="Enlace de la reunión"
            type="url"
            placeholder="https://meet.example.com/sala"
            value={enlace}
            onChange={(evento) => setEnlace(evento.target.value)}
          />
        )}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Franjas disponibles {franjas.data !== undefined && `· ${fechaCorta(`${fecha}T12:00:00`)}`}
        </p>

        {franjas.isPending && elegido !== '' && <Cargando texto="Consultando la agenda…" />}
        {franjas.data?.franjas.length === 0 && (
          <Aviso tipo="aviso">
            Ese día el asesor no tiene horas libres. Prueba con otra fecha u otro asesor.
          </Aviso>
        )}

        <div className="flex flex-wrap gap-2">
          {franjas.data?.franjas.map((disponible) => {
            const activa = franja === disponible.inicio;

            return (
              <button
                key={disponible.inicio}
                type="button"
                onClick={() => setFranja(disponible.inicio)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  activa
                    ? 'border-marca-600 bg-marca-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-marca-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {hora(disponible.inicio)}
              </button>
            );
          })}
        </div>
      </div>

      {agendar.isError && (
        <div className="mt-4">
          <ErrorDelServidor error={agendar.error} />
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <Boton disabled={franja === '' || agendar.isPending} onClick={() => agendar.mutate()}>
          {agendar.isPending ? 'Agendando…' : 'Confirmar solicitud'}
        </Boton>
        <Boton variante="secundario" onClick={onListo}>
          Cancelar
        </Boton>
      </div>
    </Tarjeta>
  );
}
