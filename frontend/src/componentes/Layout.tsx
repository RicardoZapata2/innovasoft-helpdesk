import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/sesion';
import { BotonTema } from './BotonTema';
import { Boton } from './base';

type Enlace = { a: string; texto: string; permisos?: string[]; administracion?: boolean };

const ENLACES: Enlace[] = [
  { a: '/panel', texto: 'Panel' },
  { a: '/tickets', texto: 'Tickets', permisos: ['tickets.ver_todos', 'tickets.ver_empresa', 'tickets.ver_propios'] },
  { a: '/citas', texto: 'Citas', permisos: ['citas.ver_todas', 'citas.ver_empresa', 'citas.ver_propias'] },
  { a: '/kardex', texto: 'Consumos', permisos: ['puntos.ver_kardex'] },
  { a: '/fidelizacion', texto: 'Fidelización', permisos: ['fidelizacion.ver_saldo', 'fidelizacion.ver_historial'] },
  { a: '/empresas', texto: 'Empresas', permisos: ['empresas.ver_todas'], administracion: true },
  { a: '/usuarios', texto: 'Usuarios', permisos: ['usuarios.ver'], administracion: true },
  { a: '/perfiles', texto: 'Perfiles y permisos', permisos: ['perfiles.ver'], administracion: true },
  { a: '/asesores', texto: 'Agenda de asesores', permisos: ['citas.administrar_disponibilidad'], administracion: true },
  {
    a: '/catalogo',
    texto: 'Catálogo comercial',
    permisos: [
      'puntos.administrar_planes',
      'puntos.administrar_tarifas',
      'fidelizacion.administrar_recompensas',
      'fidelizacion.administrar_reglas',
    ],
    administracion: true,
  },
  { a: '/auditoria', texto: 'Auditoría', permisos: ['auditoria.ver'], administracion: true },
];

// Con más de dos opciones de administración la barra no cabe en una línea; en
// ese caso se agrupan en un menú desplegable. Un cliente, que solo administra
// sus usuarios, sigue viendo el enlace directo.
function MenuAdministracion({ enlaces, clase }: { enlaces: Enlace[]; clase: (estado: { isActive: boolean }) => string }) {
  const ubicacion = useLocation();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const activo = enlaces.some((enlace) => ubicacion.pathname.startsWith(enlace.a));

  useEffect(() => {
    const cerrar = (evento: MouseEvent) => {
      if (contenedor.current !== null && !contenedor.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);

    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        className={`${clase({ isActive: activo })} inline-flex items-center gap-1`}
      >
        Administración
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </button>
      {abierto && (
        <div
          className="absolute left-0 z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg
            dark:border-slate-700 dark:bg-slate-900"
        >
          {enlaces.map((enlace) => (
            <NavLink key={enlace.a} to={enlace.a} className={clase} onClick={() => setAbierto(false)}>
              {enlace.texto}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { usuario, salir, puede } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const visibles = ENLACES.filter((enlace) => enlace.permisos === undefined || puede(...enlace.permisos));
  const deAdministracion = visibles.filter((enlace) => enlace.administracion === true);
  const agrupar = deAdministracion.length > 2;
  const principales = agrupar ? visibles.filter((enlace) => enlace.administracion !== true) : visibles;
  const actual = visibles.find((enlace) => ubicacion.pathname.startsWith(enlace.a))?.texto ?? 'Panel';

  const clase = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-marca-50 text-marca-700 dark:bg-marca-900/50 dark:text-marca-200'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {/* En móvil el menú se pliega tras un botón: siete enlaces en una fila
              obligarían a desplazar la cabecera de lado en cada pantalla. */}
          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-label="Abrir el menú"
            aria-expanded={menuAbierto}
            className="rounded-lg border border-slate-300 p-2 md:hidden dark:border-slate-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>

          <Link
            to="/panel"
            className="text-lg font-semibold text-marca-700 transition hover:opacity-70 dark:text-marca-300"
          >
            Innovasoft
          </Link>

          <span className="flex-1 truncate text-sm text-slate-400 md:hidden">· {actual}</span>

          <nav className="hidden flex-1 flex-wrap items-center gap-1 md:flex">
            {principales.map((enlace) => (
              <NavLink key={enlace.a} to={enlace.a} className={clase}>
                {enlace.texto}
              </NavLink>
            ))}
            {agrupar && <MenuAdministracion enlaces={deAdministracion} clase={clase} />}
          </nav>

          <BotonTema />

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {usuario?.nombres} {usuario?.apellidos}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{usuario?.perfil}</p>
            <Link to="/cambiar-password" className="text-xs text-marca-600 hover:underline dark:text-marca-300">
              Cambiar contraseña
            </Link>
          </div>

          <Boton
            variante="secundario"
            className="hidden sm:inline-flex"
            onClick={() => {
              void salir().then(() => navegar('/entrar'));
            }}
          >
            Salir
          </Boton>
        </div>

        {menuAbierto && (
          <nav className="border-t border-slate-100 px-4 py-3 md:hidden dark:border-slate-800">
            <p className="px-3 pb-2 text-xs text-slate-500 dark:text-slate-400">
              {usuario?.nombres} {usuario?.apellidos} · {usuario?.perfil} ·{' '}
              <Link to="/cambiar-password" className="text-marca-600 dark:text-marca-300" onClick={() => setMenuAbierto(false)}>
                Cambiar contraseña
              </Link>
            </p>
            <div className="space-y-1">
              {visibles.map((enlace) => (
                <NavLink
                  key={enlace.a}
                  to={enlace.a}
                  className={clase}
                  onClick={() => setMenuAbierto(false)}
                >
                  {enlace.texto}
                </NavLink>
              ))}
            </div>
            <Boton
              variante="secundario"
              className="mt-3 w-full"
              onClick={() => {
                void salir().then(() => navegar('/entrar'));
              }}
            >
              Salir
            </Boton>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
