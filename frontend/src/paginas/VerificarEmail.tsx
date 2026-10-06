import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MarcoAcceso } from '../componentes/MarcoAcceso';
import { Aviso, Boton, Cargando, ErrorDelServidor } from '../componentes/base';
import { api } from '../lib/api';

export function VerificarEmail() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  // En desarrollo React monta dos veces el componente; el token es de un solo
  // uso, así que la segunda petición fallaría y taparía el éxito de la primera.
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;

    api
      .publicoPost<{ mensaje: string }>('/auth/verificar-email', { token })
      .then((respuesta) => setMensaje(respuesta.mensaje))
      .catch(setError);
  }, [token]);

  return (
    <MarcoAcceso titulo="Verificación de la cuenta">
      {mensaje === null && error === null && <Cargando texto="Verificando…" />}
      {mensaje !== null && <Aviso tipo="exito">{mensaje}</Aviso>}
      {error !== null && <ErrorDelServidor error={error} />}
      <Link to="/entrar">
        <Boton className="w-full">Iniciar sesión</Boton>
      </Link>
    </MarcoAcceso>
  );
}
