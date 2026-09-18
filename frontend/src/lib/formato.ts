const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const HORA = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export const fechaLarga = (valor: string) => FECHA_LARGA.format(new Date(valor));
export const fechaCorta = (valor: string) => FECHA_CORTA.format(new Date(valor));
export const hora = (valor: string) => HORA.format(new Date(valor));
export const pesos = (valor: string) => PESOS.format(Number(valor));

export function puntos(cantidad: number): string {
  const absoluto = Math.abs(cantidad);

  return `${cantidad} ${absoluto === 1 ? 'punto' : 'puntos'}`;
}

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// El input de tipo datetime-local trabaja con la hora local sin zona, que es
// justo lo que espera la API para las citas.
export function aEntradaLocal(fecha: Date): string {
  const desfase = fecha.getTimezoneOffset() * 60000;

  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}
