// Los puntos de fidelidad nunca quedan en negativo, a diferencia de los de
// servicio: un canje no es un servicio ya prestado que haya que registrar,
// sino un beneficio que se pide. Si no alcanza, simplemente no se entrega.
export function puedeCanjear(saldo: number, costo: number): boolean {
  return costo > 0 && saldo >= costo;
}

export function venceElBeneficio(desde: Date, dias: number | null): Date | null {
  if (dias === null) {
    return null;
  }

  return new Date(desde.getTime() + dias * 24 * 60 * 60 * 1000);
}

// Al renovar se aplica el mayor descuento que la empresa tenga vigente. Los
// descuentos no se suman: dos canjes del 5 % no equivalen a uno del 10 %, que
// cuesta más del doble en el catálogo.
export function elegirDescuento<T extends { porcentaje: number }>(disponibles: T[]): T | null {
  return disponibles.reduce<T | null>(
    (mejor, actual) => (mejor === null || actual.porcentaje > mejor.porcentaje ? actual : mejor),
    null,
  );
}

export function aplicarDescuento(precio: number, porcentaje: number): number {
  return Math.round(precio * (1 - porcentaje / 100));
}
