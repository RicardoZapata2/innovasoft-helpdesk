import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Aviso, Boton, Campo, ErrorDelServidor } from '../componentes/base';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';

export function CambiarPassword() {
  const { usuario, entrar } = useSesion();
  const navegar = useNavigate();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (nueva !== repetida) {
      setError(new Error('Las dos contraseñas nuevas no coinciden'));

      return;
    }

    setEnviando(true);

    try {
      await api.post('/auth/cambiar-password', { passwordActual: actual, passwordNueva: nueva });

      // Cambiar la contraseña revoca todas las sesiones, incluida esta. Se
      // vuelve a entrar con la nueva para que el usuario no tenga que escribirla
      // dos veces seguidas.
      await entrar(usuario?.email ?? '', nueva);
      navegar('/panel');
    } catch (fallo) {
      setError(fallo);
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cambia tu contraseña</h1>

        {usuario?.debeCambiarPassword === true && (
          <Aviso tipo="aviso">
            Estás usando la contraseña temporal que te envió Innovasoft. Para continuar tienes que
            elegir una propia.
          </Aviso>
        )}

        {error !== null && <ErrorDelServidor error={error} />}

        <Campo
          etiqueta="Contraseña actual"
          type="password"
          autoComplete="current-password"
          required
          value={actual}
          onChange={(evento) => setActual(evento.target.value)}
        />

        <Campo
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          ayuda="Mínimo 10 caracteres, con al menos una letra y un número."
          value={nueva}
          onChange={(evento) => setNueva(evento.target.value)}
        />

        <Campo
          etiqueta="Repite la contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          value={repetida}
          onChange={(evento) => setRepetida(evento.target.value)}
        />

        <Boton type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </Boton>
      </form>
    </div>
  );
}
