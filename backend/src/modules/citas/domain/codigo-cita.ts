// Las citas se identifican internamente por UUID, pero el cliente y el asesor
// hablan por teléfono: necesitan un código corto que se pueda dictar. El
// consecutivo es por año para que no crezca indefinidamente.
export function componerCodigoCita(anio: number, consecutivo: number): string {
  return `CITA-${anio}-${String(consecutivo).padStart(4, '0')}`;
}
