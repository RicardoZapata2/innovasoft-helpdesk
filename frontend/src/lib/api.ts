export type ProblemDetails = {
  title: string;
  status: number;
  detail: string;
  errores?: string[];
};

export class ErrorApi extends Error {
  readonly status: number;
  readonly errores: string[];

  constructor(problema: ProblemDetails) {
    super(problema.detail || problema.title);
    this.status = problema.status;
    this.errores = problema.errores ?? [];
  }
}

const CLAVE_REFRESH = 'innovasoft.refresh';

// El token de acceso vive solo en memoria: si se guardara en el navegador,
// cualquier script inyectado en la página podría leerlo. El de refresco sí se
// guarda, porque sin él habría que volver a escribir la contraseña en cada
// recarga, y a cambio dura poco y se invalida al usarse.
let tokenAcceso: string | null = null;

export function guardarSesion(acceso: string, refresco: string): void {
  tokenAcceso = acceso;
  localStorage.setItem(CLAVE_REFRESH, refresco);
}

export function borrarSesion(): void {
  tokenAcceso = null;
  localStorage.removeItem(CLAVE_REFRESH);
}

export function hayRefresco(): boolean {
  return localStorage.getItem(CLAVE_REFRESH) !== null;
}

async function peticion<T>(ruta: string, opciones: RequestInit, comoArchivo = false): Promise<T> {
  // Con FormData el navegador pone el Content-Type con su separador de partes;
  // si se fuerza JSON, el servidor no encuentra el archivo.
  const esFormulario = opciones.body instanceof FormData;

  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: {
      ...(esFormulario ? {} : { 'Content-Type': 'application/json' }),
      ...(tokenAcceso === null ? {} : { Authorization: `Bearer ${tokenAcceso}` }),
      ...opciones.headers,
    },
  });

  if (respuesta.status === 204) {
    return undefined as T;
  }

  if (comoArchivo && respuesta.ok) {
    return (await respuesta.blob()) as T;
  }

  const cuerpo = await respuesta.json().catch(() => ({
    title: 'Sin respuesta',
    status: respuesta.status,
    detail: 'El servidor no respondió nada legible',
  }));

  if (!respuesta.ok) {
    throw new ErrorApi(cuerpo as ProblemDetails);
  }

  return cuerpo as T;
}

// Cuando el token de acceso caduca, varias peticiones reciben 401 a la vez y
// todas quieren renovar. Si cada una enviara el mismo refresh token, la segunda
// llegaría con un token ya rotado y el servidor lo trataría como robado,
// cerrando la sesión. Por eso todas esperan la misma renovación.
let renovacionEnCurso: Promise<boolean> | null = null;

function renovar(): Promise<boolean> {
  renovacionEnCurso ??= renovarSesion().finally(() => {
    renovacionEnCurso = null;
  });

  return renovacionEnCurso;
}

async function renovarSesion(): Promise<boolean> {
  const refreshToken = localStorage.getItem(CLAVE_REFRESH);

  if (refreshToken === null) {
    return false;
  }

  try {
    const sesion = await peticion<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    guardarSesion(sesion.accessToken, sesion.refreshToken);

    return true;
  } catch {
    borrarSesion();

    return false;
  }
}

// Un 401 puede significar dos cosas distintas: que el token de acceso caducó
// —normal cada quince minutos— o que la sesión ya no vale. Se intenta renovar
// una sola vez; si la renovación también falla, la sesión se cierra de verdad.
async function conRenovacion<T>(ruta: string, opciones: RequestInit, comoArchivo = false): Promise<T> {
  try {
    return await peticion<T>(ruta, opciones, comoArchivo);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401 && (await renovar())) {
      return peticion<T>(ruta, opciones, comoArchivo);
    }

    throw error;
  }
}

// Los PDF y los adjuntos exigen el token, así que no basta con un enlace: se
// piden con fetch y se entregan al navegador como descarga.
async function descargar(ruta: string, nombre: string): Promise<void> {
  const contenido = await conRenovacion<Blob>(ruta, { method: 'GET' }, true);
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(ruta: string) => conRenovacion<T>(ruta, { method: 'GET' }),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    conRenovacion<T>(ruta, { method: 'POST', body: JSON.stringify(cuerpo ?? {}) }),
  put: <T>(ruta: string, cuerpo: unknown) =>
    conRenovacion<T>(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) }),
  patch: <T>(ruta: string, cuerpo: unknown) =>
    conRenovacion<T>(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) }),
  delete: <T>(ruta: string) => conRenovacion<T>(ruta, { method: 'DELETE' }),
  subir: <T>(ruta: string, archivo: File) => {
    const formulario = new FormData();
    formulario.append('archivo', archivo);

    return conRenovacion<T>(ruta, { method: 'POST', body: formulario });
  },
  descargar,
  // El catálogo público no lleva sesión y no debe intentar renovarla.
  publico: <T>(ruta: string) => peticion<T>(ruta, { method: 'GET' }),
  publicoPost: <T>(ruta: string, cuerpo: unknown) =>
    peticion<T>(ruta, { method: 'POST', body: JSON.stringify(cuerpo) }),
  renovar,
};
