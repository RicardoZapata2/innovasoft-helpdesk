import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/sesion';
import { useTema } from '../lib/tema';
import { Boton } from './base';

type Enlace = { a: string; texto: string; permisos?: string[] };

const ENLACES: Enlace[] = [
  { a: '/panel', texto: 'Panel' },
  { a: '/citas', texto: 'Citas', permisos: ['citas.ver_todas', 'citas.ver_empresa', 'citas.ver_propias'] },
  { a: '/kardex', texto: 'Consumos', permisos: ['puntos.ver_kardex'] },
  { a: '/empresas', texto: 'Empresas', permisos: ['empresas.ver_todas'] },
  { a: '/usuarios', texto: 'Usuarios', permisos: ['usuarios.ver'] },
  { a: '/perfiles', texto: 'Perfiles y permisos', permisos: ['perfiles.ver'] },
  { a: '/asesores', texto: 'Agenda', permisos: ['citas.administrar_disponibilidad'] },
];

export function Layout() {
  const { usuario, salir, puede } = useSesion();
  const { tema, alternar } = useTema();
  const navegar = useNavigate();

  const visibles = ENLACES.filter((enlace) => enlace.permisos === undefined || puede(...enlace.permisos));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link
            to="/panel"
            className="text-lg font-semibold text-marca-700 transition hover:opacity-70 dark:text-marca-300"
          >
            Innovasoft
          </Link>

          <nav className="flex flex-1 flex-wrap gap-1">
            {visibles.map((enlace) => (
              <NavLink
                key={enlace.a}
                to={enlace.a}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-marca-50 text-marca-700 dark:bg-marca-900/50 dark:text-marca-200'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {enlace.texto}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={alternar}
              title={tema === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              aria-label="Cambiar el tema"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm transition
                hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              {tema === 'claro' ? '🌙' : '☀️'}
            </button>

            <div className="text-right">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {usuario?.nombres} {usuario?.apellidos}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{usuario?.perfil}</p>
            </div>

            <Boton
              variante="secundario"
              onClick={() => {
                void salir().then(() => navegar('/entrar'));
              }}
            >
              Salir
            </Boton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
