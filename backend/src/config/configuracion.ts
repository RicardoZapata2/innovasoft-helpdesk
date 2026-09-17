export type Configuracion = {
  puerto: number;
  corsOrigin: string;
  baseDatos: { url: string };
  jwt: {
    accesoSecreto: string;
    refrescoSecreto: string;
    accesoSegundos: number;
    refrescoSegundos: number;
  };
  subidas: { directorio: string; maxMb: number };
  puntos: {
    topeDescubierto: number;
    avisoSaldoBajo: number;
    avisoDiasParaVencer: number;
  };
};

function requerida(clave: string): string {
  const valor = process.env[clave];
  if (valor === undefined || valor.trim() === '') {
    throw new Error(`Falta la variable de entorno ${clave}. Revisa el archivo .env del backend.`);
  }
  return valor;
}

// Las duraciones se escriben como "15m" o "7d" en el .env porque así se leen
// mejor, pero se guardan en segundos, que es la unidad que espera la librería
// de firma. Convertir una sola vez aquí evita reinterpretar la cadena en cada
// firma y deja el error de escritura en el arranque, no en tiempo de uso.
function aSegundos(duracion: string): number {
  const unidades: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const partes = /^(\d+)([smhd])$/.exec(duracion);

  if (partes === null) {
    throw new Error(`Duración mal escrita: "${duracion}". Se espera algo como 15m, 2h o 7d.`);
  }

  return Number(partes[1]) * unidades[partes[2]];
}

export function cargarConfiguracion(): Configuracion {
  return {
    puerto: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    baseDatos: { url: requerida('DATABASE_URL') },
    jwt: {
      accesoSecreto: requerida('JWT_ACCESS_SECRET'),
      refrescoSecreto: requerida('JWT_REFRESH_SECRET'),
      accesoSegundos: aSegundos(process.env.JWT_ACCESS_TTL ?? '15m'),
      refrescoSegundos: aSegundos(process.env.JWT_REFRESH_TTL ?? '7d'),
    },
    subidas: {
      directorio: process.env.UPLOADS_DIR ?? './uploads',
      maxMb: Number(process.env.MAX_UPLOAD_MB ?? 10),
    },
    puntos: {
      // Cuánto puede quedar una empresa por debajo de cero antes de que el
      // sistema deje de aceptar consumos. El servicio ya se prestó cuando se
      // descuenta, así que bloquear antes de tiempo dejaría trabajo sin
      // registrar; no poner tope dejaría crecer la deuda sin control.
      topeDescubierto: Number(process.env.PUNTOS_TOPE_DESCUBIERTO ?? 20),
      avisoSaldoBajo: Number(process.env.PUNTOS_AVISO_SALDO_BAJO ?? 5),
      avisoDiasParaVencer: Number(process.env.PUNTOS_AVISO_DIAS_VENCER ?? 10),
    },
  };
}
