import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Aviso, Boton, Cargando } from '../componentes/base';
import { api } from '../lib/api';
import { pesos } from '../lib/formato';
import { useTema } from '../lib/tema';
import type { Plan, Recompensa, ReglaFidelizacion, Tarifa } from '../lib/tipos';
import { NuestrosServicios } from './secciones-publico';

const VENTAJAS: Record<string, string[]> = {
  esencial: ['Soporte remoto cuando lo necesites', 'Historial completo de consumos', 'Una visita presencial al mes'],
  profesional: ['Todo lo del plan Esencial', 'Hasta 20 soportes remotos', 'Agenda prioritaria de visitas', 'Puntos de fidelidad'],
  corporativo: ['Todo lo del plan Profesional', 'Varias sedes en una sola cuenta', 'Implementaciones programadas', 'Asesor asignado'],
  ilimitado_mensual: ['Sin límite de puntos', 'Cobertura total del mes', 'Todo el catálogo de servicios'],
  ilimitado_anual: ['Sin límite durante un año', 'La tarifa más baja por mes', 'Todo el catálogo de servicios'],
};

export function Publico() {
  const { tema, alternar } = useTema();
  const planes = useQuery({ queryKey: ['planes'], queryFn: () => api.publico<Plan[]>('/planes') });
  const tarifas = useQuery({ queryKey: ['tarifas'], queryFn: () => api.publico<Tarifa[]>('/tarifas') });
  const recompensas = useQuery({
    queryKey: ['recompensas'],
    queryFn: () => api.publico<Recompensa[]>('/recompensas'),
  });
  const reglas = useQuery({
    queryKey: ['reglas-fidelizacion'],
    queryFn: () => api.publico<ReglaFidelizacion[]>('/reglas-fidelizacion'),
  });

  const suscripciones = planes.data?.filter((plan) => plan.tipo === 'SUSCRIPCION') ?? [];
  const adicionales = planes.data?.filter((plan) => plan.tipo !== 'SUSCRIPCION') ?? [];
  const destacado = 'profesional';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-marca-700 dark:text-marca-300">Innovasoft</span>

          <nav className="hidden gap-6 text-sm text-slate-600 md:flex dark:text-slate-300">
            <a href="#servicios" className="hover:text-marca-600">Servicios</a>
            <a href="#planes" className="hover:text-marca-600">Planes</a>
            <a href="#tarifario" className="hover:text-marca-600">Tarifario</a>
            <a href="#fidelizacion" className="hover:text-marca-600">Recompensas</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={alternar}
              aria-label="Cambiar el tema"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm transition hover:bg-slate-100
                dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {tema === 'claro' ? '🌙' : '☀️'}
            </button>
            <Link to="/entrar">
              <Boton>Entrar</Boton>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-marca-50 via-white to-slate-50 dark:from-marca-900/30 dark:via-slate-950 dark:to-slate-950" />
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-marca-200 bg-white px-4 py-1.5 text-xs font-medium text-marca-700 dark:border-marca-800 dark:bg-slate-900 dark:text-marca-300">
            Soporte técnico empresarial · Medellín
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
            Soporte técnico que{' '}
            <span className="bg-gradient-to-r from-marca-600 to-marca-400 bg-clip-text text-transparent">
              puedes medir
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Compra un plan, consume puntos a medida que recibes servicio y consulta en cualquier
            momento en qué se fue cada punto. Sin facturas sorpresa y sin buscar correos viejos.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#planes">
              <Boton className="px-6 py-3 text-base">Ver los planes</Boton>
            </a>
            <a href="#servicios">
              <Boton variante="secundario" className="px-6 py-3 text-base">
                Ver los servicios
              </Boton>
            </a>
          </div>

          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { valor: '5', texto: 'servicios tarifados' },
              { valor: '9', texto: 'planes y recargas' },
              { valor: '24 h', texto: 'para reprogramar sin costo' },
              { valor: '100 %', texto: 'de los consumos trazados' },
            ].map((dato) => (
              <div key={dato.texto}>
                <dt className="text-3xl font-bold text-marca-700 dark:text-marca-300">{dato.valor}</dt>
                <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dato.texto}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:space-y-24 sm:py-20">
        <NuestrosServicios />

        <section id="planes">
          <h2 className="text-center text-3xl font-semibold text-slate-900 dark:text-white">
            Elige cuántos puntos necesitas al mes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600 dark:text-slate-400">
            Precios en pesos colombianos. La vigencia empieza el día de la contratación.
          </p>

          {planes.isPending && <Cargando />}
          {planes.isError && (
            <div className="mt-8">
              <Aviso tipo="error">No se pudo cargar el catálogo de planes.</Aviso>
            </div>
          )}

          <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
            {suscripciones.slice(0, 3).map((plan) => {
              const esDestacado = plan.clave === destacado;

              return (
                <article
                  key={plan.clave}
                  className={`relative flex flex-col rounded-2xl border p-7 transition ${
                    esDestacado
                      ? 'border-marca-500 bg-white shadow-xl lg:-mt-4 lg:pb-12 dark:bg-slate-900'
                      : 'border-slate-200 bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  {esDestacado && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-marca-600 px-3 py-1 text-xs font-semibold text-white">
                      El más contratado
                    </span>
                  )}

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{plan.nombre}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{plan.descripcion}</p>

                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      {plan.esIlimitado ? '∞' : plan.puntosIncluidos}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      puntos / {plan.diasVigencia} días
                    </span>
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-marca-700 dark:text-marca-300">
                    {pesos(plan.precio)}
                  </p>
                  {plan.puntosIncluidos !== null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {pesos(String(Number(plan.precio) / plan.puntosIncluidos))} por punto
                    </p>
                  )}

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {(VENTAJAS[plan.clave] ?? []).map((ventaja) => (
                      <li key={ventaja} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600 dark:text-marca-400">
                          <path
                            fillRule="evenodd"
                            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {ventaja}
                      </li>
                    ))}
                  </ul>

                  <a href="#contacto" className="mt-7">
                    <Boton variante={esDestacado ? 'principal' : 'secundario'} className="w-full">
                      Solicitar este plan
                    </Boton>
                  </a>
                </article>
              );
            })}
          </div>

          {suscripciones.length > 3 && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {suscripciones.slice(3).map((plan) => (
                <div
                  key={plan.clave}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{plan.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plan.descripcion}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-marca-700 dark:text-marca-300">
                    {pesos(plan.precio)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {adicionales.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                ¿Se te acabaron los puntos? Recargas y bonos
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {adicionales.map((plan) => (
                  <div
                    key={plan.clave}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-900"
                  >
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{plan.puntosIncluidos}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      puntos · {plan.diasVigencia} días
                    </p>
                    <p className="mt-2 text-sm font-semibold text-marca-700 dark:text-marca-300">
                      {pesos(plan.precio)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="tarifario">
          <h2 className="text-center text-3xl font-semibold text-slate-900 dark:text-white">
            Qué cuesta cada servicio
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600 dark:text-slate-400">
            El mismo tarifario para todos los clientes. Sin letra pequeña.
          </p>

          {tarifas.isPending && <Cargando />}

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tarifas.data?.map((tarifa) => (
              <div
                key={tarifa.clave}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-marca-600 text-lg font-bold text-white">
                  {tarifa.puntos}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{tarifa.nombre}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="fidelizacion">
          <h2 className="text-center text-3xl font-semibold text-slate-900 dark:text-white">
            Usar bien el sistema también te devuelve algo
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600 dark:text-slate-400">
            Los puntos de fidelidad son una moneda aparte: se ganan, no se compran, y no se mezclan
            con los puntos de servicio.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Cómo se ganan
              </h3>
              <ul className="mt-4 space-y-3">
                {reglas.data?.map((regla) => (
                  <li
                    key={regla.clave}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">{regla.nombre}</span>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      +{regla.puntos}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                En qué se cambian
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {recompensas.data?.map((recompensa) => (
                  <article
                    key={recompensa.clave}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-marca-300 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {recompensa.nombre}
                      </h4>
                      <span className="shrink-0 rounded-full bg-marca-600 px-2.5 py-1 text-xs font-bold text-white">
                        {recompensa.costoPuntos}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{recompensa.descripcion}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Vigencia del beneficio: {recompensa.diasVigenciaBeneficio} días
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="overflow-hidden rounded-2xl bg-gradient-to-br from-marca-700 to-marca-900 px-8 py-14 text-center text-white"
        >
          <h2 className="text-3xl font-semibold">¿Quieres ser cliente?</h2>
          <p className="mx-auto mt-4 max-w-xl text-marca-100">
            Escríbenos y habilitamos la cuenta de tu empresa. Te enviamos las credenciales de acceso
            al correo del administrador que nos indiques.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-lg font-medium">
            <span>contacto@innovasoft.com</span>
            <span className="hidden sm:inline text-marca-300">·</span>
            <span>(604) 444 55 66</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-slate-500 dark:text-slate-400">
          <span>Innovasoft · Soporte técnico empresarial</span>
          <Link to="/entrar" className="font-medium text-marca-600 hover:underline dark:text-marca-300">
            Acceso de clientes
          </Link>
        </div>
      </footer>
    </div>
  );
}
