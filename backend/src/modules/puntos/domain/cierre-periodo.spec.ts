import { planificarCierre } from './cierre-periodo.js';
import type { BolsaVigente } from './motor-consumo.js';

const AHORA = new Date(2026, 0, 15);

function bolsa(id: string, saldo: number, dia: number, esIlimitada = false): BolsaVigente {
  return { id, saldo, esIlimitada, venceEn: new Date(2026, 0, dia) };
}

describe('cierre de periodo', () => {
  it('expira el saldo que quedó en las bolsas vencidas', () => {
    const plan = planificarCierre([bolsa('vencida', 12, 10), bolsa('vigente', 40, 30)], 0, AHORA);

    expect(plan.expiraciones).toEqual([{ bolsaId: 'vencida', puntos: 12 }]);
    expect(plan.cobros).toEqual([]);
    expect(plan.trasladado).toBe(0);
  });

  it('no registra expiración en una bolsa vencida que ya estaba en cero', () => {
    const plan = planificarCierre([bolsa('agotada', 0, 10)], 0, AHORA);

    expect(plan.expiraciones).toEqual([]);
  });

  it('cobra el descubierto de las bolsas vigentes, empezando por la que vence antes', () => {
    const plan = planificarCierre([bolsa('larga', 50, 40), bolsa('corta', 5, 20)], 8, AHORA);

    expect(plan.cobros).toEqual([
      { bolsaId: 'corta', puntos: 5 },
      { bolsaId: 'larga', puntos: 3 },
    ]);
    expect(plan.trasladado).toBe(0);
  });

  it('nunca cobra el descubierto de una bolsa vencida', () => {
    const plan = planificarCierre([bolsa('vencida', 30, 10)], 6, AHORA);

    expect(plan.expiraciones).toEqual([{ bolsaId: 'vencida', puntos: 30 }]);
    expect(plan.cobros).toEqual([]);
    expect(plan.trasladado).toBe(6);
  });

  it('traslada al periodo siguiente lo que las bolsas no alcanzan a cubrir', () => {
    const plan = planificarCierre([bolsa('vigente', 4, 30)], 10, AHORA);

    expect(plan.cobros).toEqual([{ bolsaId: 'vigente', puntos: 4 }]);
    expect(plan.trasladado).toBe(6);
  });

  it('un plan ilimitado vigente absorbe el descubierto completo', () => {
    const plan = planificarCierre([bolsa('ilimitada', 0, 30, true)], 9, AHORA);

    expect(plan.cobros).toEqual([{ bolsaId: 'ilimitada', puntos: 9 }]);
    expect(plan.trasladado).toBe(0);
  });
});
