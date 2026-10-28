import { planificarConsumo } from './motor-consumo.js';
import type { AplicacionEnBolsa, BolsaVigente } from './motor-consumo.js';

export type PlanDeCierre = {
  expiraciones: AplicacionEnBolsa[];
  cobros: AplicacionEnBolsa[];
  trasladado: number;
};

// Decide qué pasa con los puntos al cerrar un periodo de facturación:
//
// 1. Las bolsas que ya vencieron y conservan saldo lo pierden: ese saldo sale
//    como expiración, para que el kardex explique a dónde se fue.
// 2. El descubierto acumulado en el periodo (lo que se consumió sin saldo) se
//    cobra de las bolsas vigentes, empezando por la que vence antes, igual que
//    cualquier consumo.
// 3. Lo que las bolsas no alcanzan a cubrir se traslada al periodo siguiente
//    como descubierto pendiente.
//
// Igual que el motor de consumo, la función no toca la base de datos: recibe
// el estado y devuelve el reparto.
export function planificarCierre(bolsas: BolsaVigente[], descubiertoPendiente: number, ahora: Date): PlanDeCierre {
  if (descubiertoPendiente < 0) {
    throw new Error('El descubierto pendiente se expresa como un número positivo');
  }

  const expiraciones = bolsas
    .filter((bolsa) => !bolsa.esIlimitada && bolsa.venceEn.getTime() <= ahora.getTime() && bolsa.saldo > 0)
    .map((bolsa) => ({ bolsaId: bolsa.id, puntos: bolsa.saldo }));

  if (descubiertoPendiente === 0) {
    return { expiraciones, cobros: [], trasladado: 0 };
  }

  const vigentes = bolsas.filter((bolsa) => bolsa.venceEn.getTime() > ahora.getTime());
  const cobro = planificarConsumo(vigentes, descubiertoPendiente);

  return { expiraciones, cobros: cobro.aplicaciones, trasladado: cobro.descubierto };
}
