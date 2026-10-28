import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SelectorEmpresa } from '../componentes/SelectorEmpresa';
import {
  Aviso, Boton, Campo, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Seleccion, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta, fechaLarga, hora, puntos } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type {
  Asesor, BeneficioDisponible, Cita, FichaCita, FranjasDisponibles, ListaCitas, ListaTickets,
} from '../lib/tipos';

const COLOR_ESTADO: Record<string, string> = {
  solicitada: 'ambar',
  confirmada: 'azul',
  reprogramada: 'ambar',
  en_curso: 'azul',
  realizada: 'verde',
  cancelada: 'slate',
  no_asistida: 'rojo',
};

// Los mismos colores de las etiquetas, en versión de bloque para el
// calendario, donde cada cita es una franja pequeña dentro del día.
const BLOQUE_ESTADO: Record<string, string> = {
  solicitada: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  confirmada: 'bg-marca-100 text-marca-800 dark:bg-marca-900/60 dark:text-marca-100',
  reprogramada: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  en_curso: 'bg-marca-200 text-marca-900 dark:bg-marca-800 dark:text-marca-50',
  realizada: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  cancelada: 'bg-slate-100 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-400',
  no_asistida: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

const NOMBRE_ESTADO: Record<string, string> = {
  solicitada: 'Solicitada',
  confirmada: 'Confirmada',
  reprogramada: 'Reprogramada',
  en_curso: 'En curso',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  no_asistida: 'No asistida',
};

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MES = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const DIA_MES = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });

type Vista = 'mes' | 'semana' | 'lista';

// La semana empieza el lunes, como en cualquier agenda de oficina en Colombia.
function inicioDeSemana(fecha: Date): Date {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));

  return inicio;
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);

  return resultado;
}

function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

// Días que muestra la vista: la semana completa, o las semanas completas que
// cubren el mes (con los días del mes anterior y siguiente para llenar la
// cuadrícula, como en cualquier calendario).
function diasVisibles(vista: Vista, referencia: Date): Date[] {
  if (vista === 'semana') {
    const lunes = inicioDeSemana(referencia);

    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  }

  const primero = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const ultimo = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
  const desde = inicioDeSemana(primero);
  const semanas = Math.ceil(((ultimo.getTime() - desde.getTime()) / 86400000 + 1) / 7);

  return Array.from({ length: semanas * 7 }, (_, i) => sumarDias(desde, i));
}

function proximoDiaHabil(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  while (fecha.getDay() === 0 || fecha.getDay() === 6) {
    fecha.setDate(fecha.getDate() + 1);
  }

  return claveDia(fecha);
}

export function Citas() {
  const { usuario, puede } = useSesion();
  const [parametros, setParametros] = useSearchParams();

  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';
  // En un teléfono la cuadrícula del mes no deja leer las citas; ahí se abre
  // la lista, y el calendario sigue a un toque.
  const [vista, setVista] = useState<Vista>(() => (window.innerWidth < 640 ? 'lista' : 'mes'));
  const [referencia, setReferencia] = useState(() => new Date());
  const [estado, setEstado] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [agendando, setAgendando] = useState(false);
  const [aviso, setAviso] = useState('');

  // La ficha abierta se refleja en la dirección (?cita=…), así un enlace desde
  // el kardex o el panel lleva directo a ella.
  const abierta = parametros.get('cita');
  const abrir = (id: string | null) => {
    setParametros((actuales) => {
      const nuevos = new URLSearchParams(actuales);
      if (id === null) nuevos.delete('cita');
      else nuevos.set('cita', id);

      return nuevos;
    });
  };

  const dias = diasVisibles(vista, referencia);
  const consulta = new URLSearchParams({ tamano: '100' });
  if (estado !== '') consulta.set('estado', estado);
  if (esInnovasoft && empresaId !== '') consulta.set('empresaId', empresaId);
  if (vista !== 'lista') {
    consulta.set('desde', dias[0].toISOString());
    consulta.set('hasta', sumarDias(dias[dias.length - 1], 1).toISOString());
  }

  const citas = useQuery({
    queryKey: ['citas', consulta.toString()],
    queryFn: () => api.get<ListaCitas>(`/citas?${consulta.toString()}`),
  });

  const porDia = new Map<string, Cita[]>();
  for (const cita of citas.data?.citas ?? []) {
    const clave = claveDia(new Date(cita.inicioEn));
    porDia.set(clave, [...(porDia.get(clave) ?? []), cita]);
  }

  const mover = (sentido: number) =>
    setReferencia((actual) =>
      vista === 'semana'
        ? sumarDias(actual, 7 * sentido)
        : new Date(actual.getFullYear(), actual.getMonth() + sentido, 1),
    );

  const mesVisible = MES.format(referencia);
  const titulo =
    vista === 'semana'
      ? `${DIA_MES.format(dias[0])} – ${DIA_MES.format(dias[6])}`
      : mesVisible.charAt(0).toUpperCase() + mesVisible.slice(1);

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
          <Boton
            onClick={() => {
              setAgendando((abiertoAhora) => !abiertoAhora);
              setAviso('');
            }}
          >
            {agendando ? 'Cerrar' : 'Agendar cita'}
          </Boton>
        )}
      </div>

      {aviso !== '' && <Aviso tipo="exito">{aviso}</Aviso>}

      {agendando && (
        <FormularioAgendar
          onCancelar={() => setAgendando(false)}
          onListo={(cita) => {
            setAgendando(false);
            setAviso(`Cita ${cita.codigo} solicitada para el ${fechaLarga(cita.inicioEn)}; queda pendiente de confirmación.`);
            setReferencia(new Date(cita.inicioEn));
          }}
        />
      )}

      <Tarjeta>
        <div className="flex flex-wrap items-end gap-4">
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-600">
            {(['mes', 'semana', 'lista'] as Vista[]).map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setVista(opcion)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  vista === opcion
                    ? 'bg-marca-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {opcion === 'mes' ? 'Mes' : opcion === 'semana' ? 'Semana' : 'Lista'}
              </button>
            ))}
          </div>

          <div className="min-w-44 flex-1">
            <Seleccion etiqueta="Estado" value={estado} onChange={(evento) => setEstado(evento.target.value)}>
              <option value="">Todos</option>
              {Object.entries(NOMBRE_ESTADO).map(([clave, nombre]) => (
                <option key={clave} value={clave}>
                  {nombre}
                </option>
              ))}
            </Seleccion>
          </div>

          {esInnovasoft && (
            <div className="min-w-56 flex-1">
              <SelectorEmpresa valor={empresaId} onCambio={setEmpresaId} etiqueta="Empresa (vacío = todas)" />
            </div>
          )}
        </div>
      </Tarjeta>

      {citas.isError && <ErrorDelServidor error={citas.error} />}

      {vista === 'lista' ? (
        <ListaDeCitas citas={citas.data?.citas} cargando={citas.isPending} onAbrir={abrir} />
      ) : (
        <Tarjeta>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{titulo}</h2>
            <div className="flex gap-2">
              <Boton variante="secundario" onClick={() => mover(-1)} aria-label="Periodo anterior">
                ‹ Anterior
              </Boton>
              <Boton variante="secundario" onClick={() => setReferencia(new Date())}>
                Hoy
              </Boton>
              <Boton variante="secundario" onClick={() => mover(1)} aria-label="Periodo siguiente">
                Siguiente ›
              </Boton>
            </div>
          </div>

          {citas.isPending ? (
            <Cargando texto="Cargando la agenda…" />
          ) : vista === 'mes' ? (
            <CalendarioMes dias={dias} mes={referencia.getMonth()} porDia={porDia} onAbrir={abrir} />
          ) : (
            <CalendarioSemana dias={dias} porDia={porDia} onAbrir={abrir} />
          )}

          <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
            {Object.entries(NOMBRE_ESTADO).map(([clave, nombre]) => (
              <span key={clave} className={`rounded px-2 py-0.5 ${BLOQUE_ESTADO[clave]}`}>
                {nombre}
              </span>
            ))}
          </div>
        </Tarjeta>
      )}

      {abierta !== null && <FichaDeCita id={abierta} onCerrar={() => abrir(null)} />}
    </div>
  );
}

function BloqueCita({ cita, compacto, onAbrir }: { cita: Cita; compacto: boolean; onAbrir: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(cita.id)}
      title={`${cita.codigo} · ${cita.empresa.razonSocial} · ${NOMBRE_ESTADO[cita.estado.clave]}`}
      className={`block w-full truncate rounded px-1.5 py-1 text-left text-xs font-medium transition hover:opacity-80 ${
        BLOQUE_ESTADO[cita.estado.clave]
      }`}
    >
      {hora(cita.inicioEn)}
      {!compacto && <span className="hidden sm:inline"> · {cita.codigo}</span>}
      {!compacto && (
        <span className="block truncate font-normal">
          {cita.modalidad.nombre} · {cita.asesor.usuario.nombres}
        </span>
      )}
    </button>
  );
}

function CalendarioMes({
  dias,
  mes,
  porDia,
  onAbrir,
}: {
  dias: Date[];
  mes: number;
  porDia: Map<string, Cita[]>;
  onAbrir: (id: string) => void;
}) {
  const hoy = claveDia(new Date());

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      {DIAS_CORTOS.map((dia) => (
        <div
          key={dia}
          className="border-b border-slate-200 bg-slate-50 py-2 text-center text-xs font-semibold uppercase text-slate-500
            dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          {dia}
        </div>
      ))}

      {dias.map((dia) => {
        const clave = claveDia(dia);
        const delDia = porDia.get(clave) ?? [];
        const fuera = dia.getMonth() !== mes;

        return (
          <div
            key={clave}
            className={`min-h-24 border-b border-r border-slate-100 p-1 dark:border-slate-800 ${
              fuera ? 'bg-slate-50/60 dark:bg-slate-950/40' : ''
            }`}
          >
            <span
              className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                clave === hoy
                  ? 'bg-marca-600 font-semibold text-white'
                  : fuera
                    ? 'text-slate-400 dark:text-slate-600'
                    : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {dia.getDate()}
            </span>
            <div className="space-y-1">
              {delDia.slice(0, 3).map((cita) => (
                <BloqueCita key={cita.id} cita={cita} compacto onAbrir={onAbrir} />
              ))}
              {delDia.length > 3 && (
                <p className="px-1 text-xs text-slate-500 dark:text-slate-400">+{delDia.length - 3} más</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarioSemana({
  dias,
  porDia,
  onAbrir,
}: {
  dias: Date[];
  porDia: Map<string, Cita[]>;
  onAbrir: (id: string) => void;
}) {
  const hoy = claveDia(new Date());

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {dias.map((dia, indice) => {
        const clave = claveDia(dia);
        const delDia = porDia.get(clave) ?? [];

        return (
          <div
            key={clave}
            className={`min-h-32 rounded-lg border p-2 ${
              clave === hoy
                ? 'border-marca-400 bg-marca-50/50 dark:border-marca-700 dark:bg-marca-900/20'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              {DIAS_CORTOS[indice]} {dia.getDate()}
            </p>
            <div className="space-y-1.5">
              {delDia.map((cita) => (
                <BloqueCita key={cita.id} cita={cita} compacto={false} onAbrir={onAbrir} />
              ))}
              {delDia.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-600">Libre</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListaDeCitas({
  citas,
  cargando,
  onAbrir,
}: {
  citas: Cita[] | undefined;
  cargando: boolean;
  onAbrir: (id: string) => void;
}) {
  if (cargando) return <Cargando />;
  if (citas === undefined || citas.length === 0) return <Vacio texto="No hay citas con ese filtro." />;

  return (
    <div className="space-y-3">
      {citas.map((cita) => (
        <button
          key={cita.id}
          type="button"
          onClick={() => onAbrir(cita.id)}
          className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition
            hover:border-marca-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-marca-700"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{cita.codigo}</span>
            <Etiqueta texto={cita.estado.nombre} color={COLOR_ESTADO[cita.estado.clave]} />
            <Etiqueta texto={cita.modalidad.nombre} />
            {cita.cubiertaPorCanje !== null && <Etiqueta texto="Beneficio de fidelización" color="verde" />}
            {cita._count.adjuntos > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{cita._count.adjuntos} {cita._count.adjuntos === 1 ? 'evidencia' : 'evidencias'}</span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            {fechaLarga(cita.inicioEn)} — {hora(cita.finEn)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {cita.empresa.razonSocial} · Asesor: {cita.asesor.usuario.nombres} {cita.asesor.usuario.apellidos}
            {cita.ticket !== null && ` · Ticket ${cita.ticket.codigo}`}
          </p>
        </button>
      ))}
    </div>
  );
}

// Ventana amplia para la ficha. El Dialogo de base es para preguntas cortas;
// aquí hay datos, evidencias e historial, así que se desplaza por dentro.
function Ventana({ titulo, onCerrar, children }: { titulo: ReactNode; onCerrar: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:py-10"
      role="dialog"
      aria-modal="true"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="min-w-0">{titulo}</div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="space-y-6 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

type Accion = { ruta: string; texto: string; pregunta: string; detalle: string; variante?: 'principal' | 'peligro' | 'secundario'; motivo?: string };

function FichaDeCita({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const { puede } = useSesion();
  const clienteQuery = useQueryClient();
  const [pendiente, setPendiente] = useState<Accion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [reprogramando, setReprogramando] = useState(false);
  const [resultado, setResultado] = useState('');

  const ficha = useQuery({ queryKey: ['cita', id], queryFn: () => api.get<FichaCita>(`/citas/${id}`) });

  const refrescar = () => {
    void clienteQuery.invalidateQueries({ queryKey: ['cita', id] });
    void clienteQuery.invalidateQueries({ queryKey: ['citas'] });
    void clienteQuery.invalidateQueries({ queryKey: ['saldo'] });
    void clienteQuery.invalidateQueries({ queryKey: ['kardex'] });
    void clienteQuery.invalidateQueries({ queryKey: ['franjas'] });
  };

  const accion = useMutation({
    mutationFn: ({ ruta, cuerpo }: { ruta: string; cuerpo?: unknown }) =>
      api.post<Cita & { consumo?: { puntos: number; cubiertaPorRecompensa: boolean; saldoNuevo?: number; descubierto?: number } }>(
        `/citas/${id}/${ruta}`,
        cuerpo,
      ),
    onSuccess: (cita) => {
      refrescar();
      setPendiente(null);
      setMotivo('');

      if (cita.consumo !== undefined) {
        setResultado(
          cita.consumo.cubiertaPorRecompensa
            ? 'Cita realizada. La cubrió un beneficio de fidelización: no se descontaron puntos del plan.'
            : `Cita realizada. Se descontaron ${puntos(cita.consumo.puntos)} del plan` +
                (cita.consumo.saldoNuevo !== undefined ? `; saldo actual: ${cita.consumo.saldoNuevo}.` : '.') +
                ((cita.consumo.descubierto ?? 0) > 0 ? ` ${cita.consumo.descubierto} quedaron en descubierto.` : ''),
        );
      } else {
        setResultado(`La cita quedó ${cita.estado.nombre.toLowerCase()}.`);
      }
    },
  });

  const subir = useMutation({
    mutationFn: (archivo: File) => api.subir<FichaCita>(`/citas/${id}/adjuntos`, archivo),
    onSuccess: () => {
      refrescar();
      setResultado('Evidencia agregada a la cita.');
    },
  });

  if (ficha.isPending) {
    return (
      <Ventana titulo="Cita" onCerrar={onCerrar}>
        <Cargando />
      </Ventana>
    );
  }

  if (ficha.isError) {
    return (
      <Ventana titulo="Cita" onCerrar={onCerrar}>
        <ErrorDelServidor error={ficha.error} />
      </Ventana>
    );
  }

  const cita = ficha.data;
  const clave = cita.estado.clave;
  const costo = cita.cubiertaPorCanje !== null ? 0 : (cita.tarifaAplicada?.puntos ?? 0);
  const abierta = ['solicitada', 'confirmada', 'reprogramada'].includes(clave);
  const atendible = ['confirmada', 'reprogramada', 'en_curso'].includes(clave);

  const acciones: Accion[] = [
    ...(['solicitada', 'reprogramada'].includes(clave) && puede('citas.confirmar')
      ? [{ ruta: 'confirmar', texto: 'Confirmar', pregunta: '¿Confirmar la cita?', detalle: 'El cliente y el asesor la verán como confirmada.' }]
      : []),
    ...(['confirmada', 'reprogramada'].includes(clave) && puede('citas.marcar_realizada')
      ? [{ ruta: 'iniciar', texto: 'Iniciar visita', variante: 'secundario' as const, pregunta: '¿Iniciar la visita?', detalle: 'La cita pasa a "En curso" mientras el asesor atiende.' }]
      : []),
    ...(atendible && puede('citas.marcar_realizada')
      ? [{
          ruta: 'realizada',
          texto: 'Marcar realizada',
          pregunta: '¿Marcar la cita como realizada?',
          detalle:
            cita.cubiertaPorCanje !== null
              ? 'La visita está cubierta por un beneficio de fidelización: no descontará puntos del plan.'
              : `Se descontarán ${puntos(costo)} del saldo de ${cita.empresa.razonSocial}, empezando por la bolsa que vence antes.`,
        }]
      : []),
    ...(atendible && puede('citas.marcar_realizada')
      ? [{ ruta: 'no-asistida', texto: 'No asistió', variante: 'secundario' as const, pregunta: '¿Registrar que el cliente no asistió?', detalle: 'La cita se cierra sin descontar puntos. Si la cubría un beneficio, este se pierde.' }]
      : []),
    ...(abierta && puede('citas.cancelar')
      ? [{ ruta: 'cancelar', texto: 'Cancelar', variante: 'peligro' as const, pregunta: `¿Cancelar la cita ${cita.codigo}?`, detalle: 'La franja del asesor vuelve a quedar libre y el motivo queda registrado.', motivo: '¿Por qué se cancela?' }]
      : []),
  ];

  return (
    <Ventana
      onCerrar={onCerrar}
      titulo={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cita.codigo}</h2>
            <Etiqueta texto={cita.estado.nombre} color={COLOR_ESTADO[clave]} />
            <Etiqueta texto={cita.modalidad.nombre} />
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {fechaLarga(cita.inicioEn)} — {hora(cita.finEn)}
          </p>
        </>
      }
    >
      {resultado !== '' && <Aviso tipo="exito">{resultado}</Aviso>}
      {accion.isError && <ErrorDelServidor error={accion.error} />}

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Dato titulo="Empresa">{cita.empresa.razonSocial}</Dato>
        <Dato titulo="Asesor">
          {cita.asesor.usuario.nombres} {cita.asesor.usuario.apellidos}
        </Dato>
        <Dato titulo="Solicitó">
          {cita.solicitante.nombres} {cita.solicitante.apellidos} · {fechaCorta(cita.createdAt)}
        </Dato>
        <Dato titulo="Costo">
          {cita.cubiertaPorCanje !== null ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              Sin costo · {cita.cubiertaPorCanje.recompensa.nombre}
            </span>
          ) : cita.tarifaAplicada !== null ? (
            `${cita.tarifaAplicada.nombre} · ${puntos(cita.tarifaAplicada.puntos)}`
          ) : (
            '—'
          )}
        </Dato>
        {cita.direccion !== null && <Dato titulo="Dirección">{cita.direccion}</Dato>}
        {cita.enlace !== null && (
          <Dato titulo="Enlace de la reunión">
            <a href={cita.enlace} target="_blank" rel="noreferrer" className="text-marca-600 hover:underline dark:text-marca-300">
              {cita.enlace}
            </a>
          </Dato>
        )}
        {cita.ticket !== null && (
          <Dato titulo="Ticket relacionado">
            <Link to={`/tickets/${cita.ticket.id}`} className="text-marca-600 hover:underline dark:text-marca-300">
              {cita.ticket.codigo} · {cita.ticket.titulo}
            </Link>
          </Dato>
        )}
        {cita.motivoCancelacion !== null && (
          <Dato titulo="Motivo de cancelación">
            <span className="text-red-700 dark:text-red-400">{cita.motivoCancelacion}</span>
          </Dato>
        )}
      </dl>

      {(acciones.length > 0 || (abierta && puede('citas.reprogramar'))) && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {acciones.map((opcion) => (
            <Boton
              key={opcion.ruta}
              variante={opcion.variante ?? 'principal'}
              disabled={accion.isPending}
              onClick={() => {
                setResultado('');
                setPendiente(opcion);
              }}
            >
              {opcion.texto}
            </Boton>
          ))}
          {abierta && puede('citas.reprogramar') && (
            <Boton variante="secundario" onClick={() => setReprogramando((abierto) => !abierto)}>
              {reprogramando ? 'Cerrar reprogramación' : 'Reprogramar'}
            </Boton>
          )}
        </div>
      )}

      {reprogramando && (
        <Reprogramar
          cita={cita}
          onListo={(nueva) => {
            setReprogramando(false);
            refrescar();
            setResultado(`Cita reprogramada para el ${fechaLarga(nueva.inicioEn)}`);
          }}
        />
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Evidencias
        </h3>
        {cita.adjuntos.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay archivos en esta cita.</p>
        )}
        <ul className="space-y-2">
          {cita.adjuntos.map((adjunto) => (
            <li
              key={adjunto.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
            >
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                {adjunto.nombreArchivo}
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                  {adjunto.tamanoBytes < 1024 ? `${adjunto.tamanoBytes} B` : `${Math.round(adjunto.tamanoBytes / 1024)} KB`} · {adjunto.subidoPor.nombres} · {fechaCorta(adjunto.createdAt)}
                </span>
              </span>
              <Boton
                variante="plano"
                onClick={() => void api.descargar(`/citas/${cita.id}/adjuntos/${adjunto.id}`, adjunto.nombreArchivo)}
              >
                Descargar
              </Boton>
            </li>
          ))}
        </ul>

        {clave !== 'cancelada' && puede('citas.crear', 'citas.marcar_realizada') && (
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-marca-600 hover:underline dark:text-marca-300">
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,.txt,.docx,.xlsx,.zip"
              disabled={subir.isPending}
              onChange={(evento) => {
                const archivo = evento.target.files?.[0];
                if (archivo !== undefined) subir.mutate(archivo);
                evento.target.value = '';
              }}
            />
            {subir.isPending ? 'Subiendo…' : '+ Agregar evidencia (foto, PDF, documento)'}
          </label>
        )}
        {subir.isError && (
          <div className="mt-2">
            <ErrorDelServidor error={subir.error} />
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Historial
        </h3>
        <ol className="space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
          <li className="text-sm">
            <p className="text-slate-800 dark:text-slate-200">
              {cita.solicitante.nombres} {cita.solicitante.apellidos} solicitó la cita
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{fechaLarga(cita.createdAt)}</p>
          </li>
          {cita.historial.map((evento) => (
            <li key={evento.id} className="text-sm">
              <p className="text-slate-800 dark:text-slate-200">
                {evento.usuario !== null ? `${evento.usuario.nombres} ${evento.usuario.apellidos} ` : ''}
                {describirEvento(evento.accion, evento.datosAnteriores, evento.datosNuevos)}
              </p>
              {typeof evento.datosNuevos?.motivo === 'string' && evento.datosNuevos.motivo !== '' && (
                <p className="text-xs text-slate-600 dark:text-slate-400">Motivo: {evento.datosNuevos.motivo}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">{fechaLarga(evento.createdAt)}</p>
            </li>
          ))}
        </ol>
      </section>

      {pendiente !== null && (
        <Dialogo
          titulo={pendiente.pregunta}
          descripcion={pendiente.detalle}
          textoConfirmar={pendiente.texto}
          varianteConfirmar={pendiente.variante === 'peligro' ? 'peligro' : 'principal'}
          pideMotivo={pendiente.motivo !== undefined}
          etiquetaMotivo={pendiente.motivo}
          motivo={motivo}
          onMotivo={setMotivo}
          ocupado={accion.isPending}
          onConfirmar={() =>
            accion.mutate({ ruta: pendiente.ruta, cuerpo: pendiente.motivo !== undefined ? { motivo } : undefined })
          }
          onCancelar={() => {
            setPendiente(null);
            setMotivo('');
          }}
        />
      )}
    </Ventana>
  );
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{titulo}</dt>
      <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  );
}

function describirEvento(
  accion: string,
  anteriores: Record<string, unknown> | null,
  nuevos: Record<string, unknown> | null,
): string {
  if (accion.startsWith('REPROGRAMAR')) {
    const antes = typeof anteriores?.inicioEn === 'string' ? fechaLarga(anteriores.inicioEn) : '';
    const despues = typeof nuevos?.inicioEn === 'string' ? fechaLarga(nuevos.inicioEn) : '';
    const fuera = accion.endsWith('FUERA_DE_PLAZO') ? ' (fuera del plazo mínimo)' : '';

    return `reprogramó la cita del ${antes} al ${despues}${fuera}`;
  }

  if (accion === 'SUBIR_EVIDENCIA') {
    return `subió la evidencia "${String(nuevos?.archivo ?? '')}"`;
  }

  const textos: Record<string, string> = {
    ESTADO_CONFIRMADA: 'confirmó la cita',
    ESTADO_EN_CURSO: 'inició la visita',
    ESTADO_REALIZADA: 'marcó la cita como realizada',
    ESTADO_CANCELADA: 'canceló la cita',
    ESTADO_NO_ASISTIDA: 'registró que el cliente no asistió',
  };

  return textos[accion] ?? accion.toLowerCase().replaceAll('_', ' ');
}

function Reprogramar({ cita, onListo }: { cita: FichaCita; onListo: (cita: Cita) => void }) {
  const [fecha, setFecha] = useState(claveDia(new Date(Math.max(Date.now() + 86400000, new Date(cita.inicioEn).getTime()))));
  const [franja, setFranja] = useState('');
  const [motivo, setMotivo] = useState('');

  const franjas = useQuery({
    queryKey: ['franjas', cita.asesor.id, fecha],
    queryFn: () => api.get<FranjasDisponibles>(`/citas/franjas?asesorId=${cita.asesor.id}&fecha=${fecha}`),
  });

  const reprogramar = useMutation({
    mutationFn: () => api.post<Cita>(`/citas/${cita.id}/reprogramar`, { inicioEn: franja, motivo }),
    onSuccess: onListo,
  });

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
        Elige un nuevo día y hora con {cita.asesor.usuario.nombres}. El motivo queda en el historial de la cita.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nueva fecha"
          type="date"
          value={fecha}
          min={claveDia(new Date())}
          onChange={(evento) => {
            setFecha(evento.target.value);
            setFranja('');
          }}
        />
        <Campo etiqueta="Motivo" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej. el cliente pidió cambiar el día" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {franjas.isPending && <Cargando texto="Consultando la agenda…" />}
        {franjas.data?.franjas.length === 0 && (
          <Aviso tipo="aviso">Ese día el asesor no tiene horas libres.</Aviso>
        )}
        {franjas.data?.franjas.map((disponible) => (
          <BotonFranja
            key={disponible.inicio}
            activa={franja === disponible.inicio}
            onClick={() => setFranja(disponible.inicio)}
            texto={hora(disponible.inicio)}
          />
        ))}
      </div>

      {reprogramar.isError && (
        <div className="mt-3">
          <ErrorDelServidor error={reprogramar.error} />
        </div>
      )}

      <Boton
        className="mt-4"
        disabled={franja === '' || motivo.trim() === '' || reprogramar.isPending}
        onClick={() => reprogramar.mutate()}
      >
        {reprogramar.isPending ? 'Guardando…' : 'Guardar nueva fecha'}
      </Boton>
    </div>
  );
}

function BotonFranja({ activa, onClick, texto }: { activa: boolean; onClick: () => void; texto: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
        activa
          ? 'border-marca-600 bg-marca-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-marca-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
      }`}
    >
      {texto}
    </button>
  );
}

function FormularioAgendar({ onListo, onCancelar }: { onListo: (cita: Cita) => void; onCancelar: () => void }) {
  const clienteQuery = useQueryClient();
  const { usuario } = useSesion();
  const [asesorId, setAsesorId] = useState('');
  const [fecha, setFecha] = useState(proximoDiaHabil());
  const [modalidad, setModalidad] = useState<'presencial' | 'remoto'>('presencial');
  const [franja, setFranja] = useState('');
  const [direccion, setDireccion] = useState('');
  const [enlace, setEnlace] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [canjeId, setCanjeId] = useState('');

  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';
  const empresaLista = !esInnovasoft || empresaId !== '';
  const filtroEmpresa = esInnovasoft ? `&empresaId=${empresaId}` : '';

  const asesores = useQuery({ queryKey: ['asesores'], queryFn: () => api.get<Asesor[]>('/asesores') });
  const elegido = asesorId !== '' ? asesorId : (asesores.data?.[0]?.id ?? '');

  const franjas = useQuery({
    queryKey: ['franjas', elegido, fecha],
    queryFn: () => api.get<FranjasDisponibles>(`/citas/franjas?asesorId=${elegido}&fecha=${fecha}`),
    enabled: elegido !== '',
  });

  // Tickets abiertos de la empresa, para poder decir "esta visita es por tal
  // caso" y que desde el ticket se vea que hubo una visita.
  const tickets = useQuery({
    queryKey: ['tickets', 'para-cita', empresaId],
    queryFn: () => api.get<ListaTickets>(`/tickets?tamano=100${filtroEmpresa}`),
    enabled: empresaLista,
  });

  const beneficios = useQuery({
    queryKey: ['beneficios', empresaId],
    queryFn: () => api.get<BeneficioDisponible[]>(`/citas/beneficios?${filtroEmpresa.slice(1)}`),
    enabled: empresaLista,
  });

  const agendar = useMutation({
    mutationFn: () =>
      api.post<Cita>('/citas', {
        asesorId: elegido,
        modalidad,
        inicioEn: franja,
        ...(modalidad === 'presencial' ? { direccion } : { enlace }),
        ...(esInnovasoft && empresaId !== '' ? { empresaId } : {}),
        ...(ticketId !== '' ? { ticketId } : {}),
        ...(modalidad === 'presencial' && canjeId !== '' ? { canjeId } : {}),
      }),
    onSuccess: (cita) => {
      void clienteQuery.invalidateQueries({ queryKey: ['citas'] });
      void clienteQuery.invalidateQueries({ queryKey: ['franjas'] });
      void clienteQuery.invalidateQueries({ queryKey: ['beneficios'] });
      onListo(cita);
    },
  });

  const abiertos = tickets.data?.tickets.filter((ticket) => !ticket.estado.esFinal) ?? [];

  return (
    <Tarjeta titulo="Agendar una cita">
      <div className="grid gap-4 md:grid-cols-2">
        {esInnovasoft && (
          <SelectorEmpresa
            valor={empresaId}
            onCambio={(valor) => {
              setEmpresaId(valor);
              setTicketId('');
              setCanjeId('');
            }}
          />
        )}

        <Seleccion
          etiqueta="Asesor"
          value={elegido}
          onChange={(evento) => {
            setAsesorId(evento.target.value);
            setFranja('');
          }}
        >
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
          min={claveDia(new Date())}
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
            placeholder="Calle, número, oficina"
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

        <Seleccion
          etiqueta="Ticket relacionado (opcional)"
          value={ticketId}
          disabled={!empresaLista}
          onChange={(evento) => setTicketId(evento.target.value)}
        >
          <option value="">Sin ticket</option>
          {abiertos.map((ticket) => (
            <option key={ticket.id} value={ticket.id}>
              {ticket.codigo} · {ticket.titulo}
            </option>
          ))}
        </Seleccion>

        {modalidad === 'presencial' && (beneficios.data?.length ?? 0) > 0 && (
          <Seleccion
            etiqueta="Usar un beneficio de fidelización"
            value={canjeId}
            onChange={(evento) => setCanjeId(evento.target.value)}
          >
            <option value="">No, descontar 5 puntos del plan</option>
            {beneficios.data?.map((beneficio) => (
              <option key={beneficio.id} value={beneficio.id}>
                {beneficio.recompensa.nombre}
                {beneficio.venceEn !== null ? ` (vence ${fechaCorta(beneficio.venceEn)})` : ''}
              </option>
            ))}
          </Seleccion>
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
          {franjas.data?.franjas.map((disponible) => (
            <BotonFranja
              key={disponible.inicio}
              activa={franja === disponible.inicio}
              onClick={() => setFranja(disponible.inicio)}
              texto={hora(disponible.inicio)}
            />
          ))}
        </div>
      </div>

      {!empresaLista && (
        <div className="mt-4">
          <Aviso tipo="info">Elige la empresa para la que se agenda la cita.</Aviso>
        </div>
      )}

      {agendar.isError && (
        <div className="mt-4">
          <ErrorDelServidor error={agendar.error} />
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <Boton disabled={franja === '' || !empresaLista || agendar.isPending} onClick={() => agendar.mutate()}>
          {agendar.isPending ? 'Agendando…' : 'Confirmar solicitud'}
        </Boton>
        <Boton variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </Tarjeta>
  );
}
