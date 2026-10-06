import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MarcoAcceso } from '../componentes/MarcoAcceso';
import { Aviso, Boton, Campo, ErrorDelServidor } from '../componentes/base';
import { api } from '../lib/api';

type Respuesta = { mensaje: string; enlace?: string };

export function Registro() {
  const [datos, setDatos] = useState({ razonSocial: '', nit: '', nombres: '', apellidos: '', email: '', password: '' });
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

  const cambiar = (campo: keyof typeof datos) => (evento: { target: { value: string } }) =>
    setDatos((actuales) => ({ ...actuales, [campo]: evento.target.value }));

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (datos.password !== confirmacion) {
      setError(new Error('Las contraseñas no coinciden'));
      return;
    }

    setEnviando(true);

    try {
      setRespuesta(await api.publicoPost<Respuesta>('/auth/registro', datos));
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  if (respuesta !== null) {
    // El enlace solo llega cuando el servidor corre sin correo real (ambiente
    // de demostración). En ese caso se ofrece aquí lo que llegaría al buzón.
    const ruta = respuesta.enlace === undefined ? null : new URL(respuesta.enlace).pathname + new URL(respuesta.enlace).search;

    return (
      <MarcoAcceso titulo="Revisa tu correo">
        <Aviso tipo="exito">{respuesta.mensaje}</Aviso>
        {ruta !== null && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Este ambiente de demostración no envía correos. Este es el enlace que recibirías:
            </p>
            <Link to={ruta}>
              <Boton className="w-full">Verificar mi cuenta</Boton>
            </Link>
          </>
        )}
        <p className="text-center text-sm">
          <Link to="/entrar" className="font-medium text-marca-600 hover:underline dark:text-marca-300">
            Ir a iniciar sesión
          </Link>
        </p>
      </MarcoAcceso>
    );
  }

  return (
    <MarcoAcceso titulo="Registra tu empresa" ancho="max-w-lg">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Crea la cuenta de tu empresa. Quedarás como administrador y podrás contratar un plan, invitar a tu equipo y
        registrar solicitudes de soporte.
      </p>

      <form onSubmit={enviar} className="space-y-4">
        {error !== null && <ErrorDelServidor error={error} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Razón social" required value={datos.razonSocial} onChange={cambiar('razonSocial')} />
          <Campo
            etiqueta="NIT"
            required
            placeholder="900123456-7"
            value={datos.nit}
            onChange={cambiar('nit')}
            ayuda="9 o 10 dígitos, con dígito de verificación opcional"
          />
          <Campo etiqueta="Tus nombres" required value={datos.nombres} onChange={cambiar('nombres')} />
          <Campo etiqueta="Tus apellidos" required value={datos.apellidos} onChange={cambiar('apellidos')} />
        </div>

        <Campo etiqueta="Correo" type="email" autoComplete="username" required value={datos.email} onChange={cambiar('email')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Contraseña"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={datos.password}
            onChange={cambiar('password')}
            ayuda="Mínimo 10 caracteres, con letras y números"
          />
          <Campo
            etiqueta="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            required
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
          />
        </div>

        <Boton type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Creando la cuenta…' : 'Crear cuenta'}
        </Boton>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/entrar" className="font-medium text-marca-600 hover:underline dark:text-marca-300">
            Inicia sesión
          </Link>
        </p>
      </form>
    </MarcoAcceso>
  );
}
