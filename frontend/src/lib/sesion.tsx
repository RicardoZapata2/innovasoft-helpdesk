import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, borrarSesion, guardarSesion, hayRefresco } from './api';
import type { Sesion, Usuario } from './tipos';

type ContextoSesion = {
  usuario: Usuario | null;
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<Usuario>;
  salir: () => Promise<void>;
  refrescarUsuario: () => Promise<void>;
  puede: (...permisos: string[]) => boolean;
};

const Contexto = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al recargar la página el token de acceso se perdió, porque solo vivía en
  // memoria. Si queda un token de refresco válido se recupera la sesión sin
  // pedir la contraseña otra vez.
  useEffect(() => {
    if (!hayRefresco()) {
      setCargando(false);

      return;
    }

    api
      .renovar()
      .then((renovada) => (renovada ? api.get<Usuario>('/auth/sesion') : null))
      .then((datos) => setUsuario(datos))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  const entrar = useCallback(async (email: string, password: string) => {
    const sesion = await api.post<Sesion>('/auth/login', { email, password });

    guardarSesion(sesion.accessToken, sesion.refreshToken);
    setUsuario(sesion.usuario);

    return sesion.usuario;
  }, []);

  const salir = useCallback(async () => {
    const refreshToken = localStorage.getItem('innovasoft.refresh');

    if (refreshToken !== null) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }

    borrarSesion();
    setUsuario(null);
  }, []);

  const refrescarUsuario = useCallback(async () => {
    setUsuario(await api.get<Usuario>('/auth/sesion'));
  }, []);

  const valor = useMemo<ContextoSesion>(
    () => ({
      usuario,
      cargando,
      entrar,
      salir,
      refrescarUsuario,
      puede: (...permisos: string[]) =>
        usuario !== null && permisos.some((permiso) => usuario.permisos.includes(permiso)),
    }),
    [usuario, cargando, entrar, salir, refrescarUsuario],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);

  if (contexto === null) {
    throw new Error('useSesion se usó fuera del proveedor de sesión');
  }

  return contexto;
}
