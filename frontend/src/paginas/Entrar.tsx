import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BotonTema } from '../componentes/BotonTema';
import { Boton, Campo, ErrorDelServidor } from '../componentes/base';
import { useSesion } from '../lib/sesion';

export function Entrar() {
  const { entrar } = useSesion();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const usuario = await entrar(email, password);
      navegar(usuario.debeCambiarPassword ? '/cambiar-password' : '/panel');
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-medium text-slate-600 transition
            hover:text-marca-600 dark:text-slate-300 dark:hover:text-marca-300"
        >
          <span aria-hidden="true">←</span> Volver al inicio
        </Link>
        <BotonTema />
      </header>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 block text-center text-2xl font-semibold text-marca-700 dark:text-marca-300">
            Innovasoft
          </Link>

          <form
            onSubmit={enviar}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm
              dark:border-slate-700 dark:bg-slate-900"
          >
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Entrar</h1>

            {error !== null && <ErrorDelServidor error={error} />}

            <Campo
              etiqueta="Correo"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />

            <Campo
              etiqueta="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
            />

            <Boton type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Boton>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              ¿Tu empresa aún no tiene cuenta? Innovasoft la habilita y te envía las credenciales.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
