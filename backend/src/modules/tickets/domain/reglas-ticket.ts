export type Transicion = { desde: string; hasta: string; permiso: string };

export type Evaluacion = { permitida: true } | { permitida: false; motivo: string };

// Las transiciones vienen de la tabla transicion_ticket. Esta función solo
// decide con lo que recibe, sin consultar nada, para poder probar la máquina de
// estados completa sin base de datos.
export function evaluarTransicion(
  transiciones: Transicion[],
  desde: string,
  hasta: string,
  permisos: string[],
): Evaluacion {
  const salto = transiciones.find((t) => t.desde === desde && t.hasta === hasta);

  if (salto === undefined) {
    return { permitida: false, motivo: `Un ticket en estado "${desde}" no puede pasar a "${hasta}"` };
  }

  if (!permisos.includes(salto.permiso)) {
    return { permitida: false, motivo: `El cambio de estado exige el permiso ${salto.permiso}` };
  }

  return { permitida: true };
}

export function destinosDisponibles(transiciones: Transicion[], desde: string, permisos: string[]): string[] {
  return transiciones
    .filter((t) => t.desde === desde && permisos.includes(t.permiso))
    .map((t) => t.hasta);
}

// El tarifario distingue el soporte remoto por duración: hasta una hora es
// básico, más de una hora es extendido. Las horas registradas en las
// actividades son las que deciden, no la estimación inicial.
export function sugerirTarifa(horasTrabajadas: number): 'soporte_remoto_basico' | 'soporte_remoto_extendido' {
  return horasTrabajadas > 1 ? 'soporte_remoto_extendido' : 'soporte_remoto_basico';
}

export const LARGO_MINIMO_DESCRIPCION = 30;

// La regla de fidelización premia el ticket bien documentado: una descripción
// que explique el problema y al menos una evidencia que lo muestre.
export function tieneEvidenciaCompleta(descripcion: string, cantidadAdjuntos: number): boolean {
  return descripcion.trim().length >= LARGO_MINIMO_DESCRIPCION && cantidadAdjuntos > 0;
}

export const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export function validarAdjunto(tipoMime: string, bytes: number, maxMb: number): string | null {
  if (TIPOS_PERMITIDOS[tipoMime] === undefined) {
    return 'Tipo de archivo no permitido. Se aceptan imágenes, PDF, texto, Word, Excel y ZIP';
  }

  if (bytes === 0) {
    return 'El archivo está vacío';
  }

  if (bytes > maxMb * 1024 * 1024) {
    return `El archivo supera el tamaño máximo de ${maxMb} MB`;
  }

  return null;
}

// Asignación automática: el caso va al asesor con menos tickets abiertos. Ante
// empate se respeta el orden recibido, que el servicio entrega por antigüedad.
export function elegirAsesorConMenorCarga(cargas: Array<{ asesorId: string; abiertos: number }>): string | null {
  if (cargas.length === 0) {
    return null;
  }

  return cargas.reduce((menor, actual) => (actual.abiertos < menor.abiertos ? actual : menor)).asesorId;
}

export function componerCodigoTicket(anio: number, consecutivo: number): string {
  return `TCK-${anio}-${String(consecutivo).padStart(4, '0')}`;
}

export const TIPOS_SOLUCION = [
  'Corrección aplicada',
  'Configuración ajustada',
  'Capacitación al usuario',
  'Solución temporal',
  'Escalado a desarrollo',
  'Sin falla encontrada',
] as const;
