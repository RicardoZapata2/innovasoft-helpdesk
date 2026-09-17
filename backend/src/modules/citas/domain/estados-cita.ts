export type ClaveEstadoCita =
  | 'solicitada'
  | 'confirmada'
  | 'reprogramada'
  | 'en_curso'
  | 'realizada'
  | 'cancelada'
  | 'no_asistida';

// Qué puede pasar después de cada estado, y qué permiso exige el paso. La tabla
// vive aquí y no repartida entre los métodos del servicio: así se lee de una
// vez cuál es el ciclo de vida completo de una cita.
//
// "En curso" existe para reflejar la visita mientras ocurre, pero no es
// obligatorio pasar por él: un asesor que atiende y cierra al terminar marca la
// cita como realizada directamente.
const TRANSICIONES: Record<ClaveEstadoCita, Partial<Record<ClaveEstadoCita, string>>> = {
  solicitada: {
    confirmada: 'citas.confirmar',
    reprogramada: 'citas.reprogramar',
    cancelada: 'citas.cancelar',
  },
  confirmada: {
    en_curso: 'citas.marcar_realizada',
    realizada: 'citas.marcar_realizada',
    reprogramada: 'citas.reprogramar',
    cancelada: 'citas.cancelar',
    no_asistida: 'citas.marcar_realizada',
  },
  reprogramada: {
    confirmada: 'citas.confirmar',
    en_curso: 'citas.marcar_realizada',
    realizada: 'citas.marcar_realizada',
    reprogramada: 'citas.reprogramar',
    cancelada: 'citas.cancelar',
    no_asistida: 'citas.marcar_realizada',
  },
  en_curso: {
    realizada: 'citas.marcar_realizada',
    no_asistida: 'citas.marcar_realizada',
  },
  realizada: {},
  cancelada: {},
  no_asistida: {},
};

export const ESTADOS_FINALES: ClaveEstadoCita[] = ['realizada', 'cancelada', 'no_asistida'];

export function transicionPermitida(desde: ClaveEstadoCita, hasta: ClaveEstadoCita): boolean {
  return TRANSICIONES[desde][hasta] !== undefined;
}

export function permisoDeTransicion(desde: ClaveEstadoCita, hasta: ClaveEstadoCita): string | undefined {
  return TRANSICIONES[desde][hasta];
}

export function estadosAlcanzables(desde: ClaveEstadoCita): ClaveEstadoCita[] {
  return Object.keys(TRANSICIONES[desde]) as ClaveEstadoCita[];
}
