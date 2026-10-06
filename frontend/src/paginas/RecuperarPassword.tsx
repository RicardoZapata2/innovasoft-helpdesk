import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MarcoAcceso } from '../componentes/MarcoAcceso';
import { Aviso, Boton, Campo, ErrorDelServidor } from '../componentes/base';
import { api } from '../lib/api';

export function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [respuesta, setRespuesta] = useState<{ mensaje: string; enlace?: string } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      setRespuesta(await api.publicoPost('/auth/recuperar-password', { email }));
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  const ruta =
    respuesta?.enlace === undefined ? null : new URL(respuesta.enlace).pathname + new URL(respuesta.enlace).search;

  return (
    <MarcoAcceso titulo="Recuperar contraseña">
      {respuesta === null ? (
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
          </p>
          {error !== null && <ErrorDelServidor error={error} />}
          <Campo etiqueta="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Boton type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar enlace'}
          </Boton>
        </form>
      ) : (
        <>
          <Aviso tipo="info">{respuesta.mensaje}</Aviso>
          {ruta !== null && (
            <Link to={ruta}>
              <Boton className="w-full">Abrir el enlace (ambiente de demostración)</Boton>
            </Link>
          )}
        </>
      )}
      <p className="text-center text-sm">
        <Link to="/entrar" className="font-medium text-marca-600 hover:underline dark:text-marca-300">
          Volver a iniciar sesión
        </Link>
      </p>
    </MarcoAcceso>
  );
}

export function RestablecerPassword() {
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (password !== confirmacion) {
      setError(new Error('Las contraseñas no coinciden'));
      return;
    }

    setEnviando(true);

    try {
      await api.publicoPost('/auth/restablecer-password', { token: parametros.get('token') ?? '', password });
      navegar('/entrar', { state: { aviso: 'Contraseña actualizada. Ya puedes iniciar sesión.' } });
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <MarcoAcceso titulo="Nueva contraseña">
      <form onSubmit={enviar} className="space-y-4">
        {error !== null && <ErrorDelServidor error={error} />}
        <Campo
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          ayuda="Mínimo 10 caracteres, con letras y números"
        />
        <Campo
          etiqueta="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
        />
        <Boton type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Boton>
      </form>
    </MarcoAcceso>
  );
}
