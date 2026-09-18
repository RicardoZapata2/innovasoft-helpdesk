import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '../lib/sesion';
import { Cargando } from './base';

export function RutaProtegida({ permisos }: { permisos?: string[] }) {
  const { usuario, cargando, puede } = useSesion();
  const ubicacion = useLocation();

  if (cargando) {
    return <Cargando texto="Comprobando la sesión…" />;
  }

  if (usuario === null) {
    return <Navigate to="/entrar" state={{ desde: ubicacion.pathname }} replace />;
  }

  // Mientras la contraseña siga siendo la temporal que entregó Innovasoft, la
  // aplicación solo deja llegar a la pantalla de cambio.
  if (usuario.debeCambiarPassword && ubicacion.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (permisos !== undefined && !puede(...permisos)) {
    return <Navigate to="/panel" replace />;
  }

  return <Outlet />;
}
