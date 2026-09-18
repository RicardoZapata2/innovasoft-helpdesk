import { useState } from 'react';
import type { ReactNode } from 'react';

type Modulo = {
  clave: string;
  titulo: string;
  resumen: string;
  detalle: string[];
  vista: ReactNode;
};

function Marco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/60">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 truncate text-xs text-slate-500 dark:text-slate-400">{titulo}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Barra({ texto, porcentaje, color }: { texto: string; porcentaje: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
        <span>{texto}</span>
        <span>{porcentaje}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

const MODULOS: Modulo[] = [
  {
    clave: 'tickets',
    titulo: 'Mesa de ayuda',
    resumen: 'Registra la falla, adjunta la evidencia y sigue el caso hasta el cierre.',
    detalle: [
      'Siete estados, del reporte al cierre, con quién movió cada uno y cuándo',
      'Evidencias adjuntas desde el primer reporte',
      'Horas trabajadas y tipo de solución en la bitácora',
      'Reporte de cierre descargable en PDF',
    ],
    vista: (
      <Marco titulo="Bandeja de tickets">
        <ul className="space-y-2">
          {[
            { codigo: 'TCK-2026-0184', texto: 'El módulo de facturación no carga', estado: 'En atención', color: 'bg-marca-100 text-marca-700 dark:bg-marca-900/60 dark:text-marca-200' },
            { codigo: 'TCK-2026-0183', texto: 'Solicitud de usuario nuevo', estado: 'Resuelto', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
            { codigo: 'TCK-2026-0181', texto: 'Impresora de bodega sin red', estado: 'Cerrado', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
          ].map((fila) => (
            <li key={fila.codigo} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{fila.codigo}</span>
                <span className="block truncate text-sm text-slate-700 dark:text-slate-300">{fila.texto}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${fila.color}`}>
                {fila.estado}
              </span>
            </li>
          ))}
        </ul>
      </Marco>
    ),
  },
  {
    clave: 'puntos',
    titulo: 'Saldo y consumos',
    resumen: 'Cuántos puntos quedan, de qué bolsa salieron y cuándo vencen.',
    detalle: [
      'Saldo derivado de los movimientos, nunca de un campo que se pueda desincronizar',
      'Se consume primero la bolsa que vence antes, para perder los menos puntos posibles',
      'Aviso cuando el saldo baja o una bolsa está por expirar',
      'Kardex filtrable y exportable',
    ],
    vista: (
      <Marco titulo="Panel de saldo">
        <p className="text-4xl font-bold text-marca-700 dark:text-marca-300">87</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">puntos disponibles</p>
        <div className="mt-4 space-y-3">
          <Barra texto="Plan Profesional · vence en 18 días" porcentaje={72} color="bg-marca-500" />
          <Barra texto="Bono extraordinario · vence en 3 días" porcentaje={20} color="bg-amber-500" />
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Una bolsa con 3 puntos vence en 3 días.
        </p>
      </Marco>
    ),
  },
  {
    clave: 'citas',
    titulo: 'Agenda de visitas',
    resumen: 'Elige entre las horas que el asesor tiene realmente libres.',
    detalle: [
      'Las franjas se calculan cruzando su horario con lo que ya tiene agendado',
      'Dos citas nunca se pisan, ni aunque se pidan en el mismo instante',
      'Presencial o remota, con dirección o enlace',
      'Al marcarse realizada descuenta los puntos del tarifario',
    ],
    vista: (
      <Marco titulo="Franjas del martes 22">
        <div className="flex flex-wrap gap-2">
          {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((hora, indice) => (
            <span
              key={hora}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                indice === 3
                  ? 'border-marca-600 bg-marca-600 text-white'
                  : indice === 1
                    ? 'border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800'
                    : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              {hora}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Las 09:00 ya están ocupadas. Seleccionaste las 11:00.
        </p>
      </Marco>
    ),
  },
  {
    clave: 'fidelizacion',
    titulo: 'Fidelización',
    resumen: 'Gana puntos por usar bien el sistema y cámbialos por beneficios.',
    detalle: [
      'Los puntos de fidelidad son una moneda aparte: se ganan, no se compran',
      'Catálogo fijo, con el costo conocido de antemano',
      'Descuentos en la renovación, visitas sin consumo y recargas',
      'Cada canje queda trazado contra el beneficio que entregó',
    ],
    vista: (
      <Marco titulo="Mis recompensas">
        <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">430</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">puntos de fidelidad</p>
        <ul className="mt-4 space-y-2">
          {[
            { texto: '5 % de descuento', costo: 100, alcanza: true },
            { texto: 'Tres visitas por dos', costo: 350, alcanza: true },
            { texto: '10 % de descuento', costo: 400, alcanza: true },
            { texto: 'Recarga de 10 puntos', costo: 500, alcanza: false },
          ].map((fila) => (
            <li key={fila.texto} className="flex items-center justify-between text-sm">
              <span className={fila.alcanza ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
                {fila.texto}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  fila.alcanza
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}
              >
                {fila.costo} pts
              </span>
            </li>
          ))}
        </ul>
      </Marco>
    ),
  },
];

export function NuestrosServicios() {
  const [activo, setActivo] = useState('puntos');
  const modulo = MODULOS.find((item) => item.clave === activo) ?? MODULOS[0];

  return (
    <section id="servicios">
      <h2 className="text-center text-3xl font-semibold text-slate-900 dark:text-white">Nuestros servicios</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600 dark:text-slate-400">
        Toca cualquiera para ver cómo se ve por dentro.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODULOS.map((item) => {
          const seleccionado = item.clave === activo;

          return (
            <button
              key={item.clave}
              type="button"
              onClick={() => setActivo(item.clave)}
              aria-pressed={seleccionado}
              className={`rounded-xl border p-5 text-left transition ${
                seleccionado
                  ? 'border-marca-500 bg-marca-50 shadow-md dark:border-marca-500 dark:bg-marca-900/40'
                  : 'border-slate-200 bg-white hover:border-marca-300 hover:shadow dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.titulo}</h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{item.resumen}</p>
              <span
                className={`mt-3 inline-block text-xs font-medium ${
                  seleccionado ? 'text-marca-700 dark:text-marca-300' : 'text-slate-400'
                }`}
              >
                {seleccionado ? 'Viéndolo abajo ↓' : 'Ver cómo se ve →'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid items-center gap-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-10 lg:grid-cols-2 dark:border-slate-800 dark:bg-slate-900/60">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{modulo.titulo}</h3>
          <ul className="mt-5 space-y-3">
            {modulo.detalle.map((linea) => (
              <li key={linea} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600 dark:text-marca-400">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
                {linea}
              </li>
            ))}
          </ul>
        </div>

        <div>{modulo.vista}</div>
      </div>
    </section>
  );
}
