import { excedeElDescubierto, planificarConsumo } from './motor-consumo.js';
import type { BolsaVigente } from './motor-consumo.js';

function bolsa(id: string, saldo: number, dias: number, esIlimitada = false): BolsaVigente {
  return { id, saldo, esIlimitada, venceEn: new Date(2026, 0, dias) };
}

describe('reparto del consumo entre bolsas', () => {
  it('consume de la bolsa que vence antes, no de la comprada antes', () => {
    const bolsas = [bolsa('comprada-primero', 50, 30), bolsa('vence-antes', 50, 10)];

    const plan = planificarConsumo(bolsas, 20);

    expect(plan.aplicaciones).toEqual([{ bolsaId: 'vence-antes', puntos: 20 }]);
    expect(plan.descubierto).toBe(0);
  });

  it('atraviesa varias bolsas y registra una aplicación por cada una', () => {
    const bolsas = [bolsa('a', 30, 10), bolsa('b', 40, 20), bolsa('c', 100, 30)];

    const plan = planificarConsumo(bolsas, 50);

    expect(plan.aplicaciones).toEqual([
      { bolsaId: 'a', puntos: 30 },
      { bolsaId: 'b', puntos: 20 },
    ]);
    expect(plan.descubierto).toBe(0);
  });

  it('ignora las bolsas sin saldo', () => {
    const bolsas = [bolsa('agotada', 0, 5), bolsa('con-saldo', 10, 20)];

    const plan = planificarConsumo(bolsas, 8);

    expect(plan.aplicaciones).toEqual([{ bolsaId: 'con-saldo', puntos: 8 }]);
  });

  it('deja como descubierto lo que ninguna bolsa alcanza a cubrir', () => {
    const plan = planificarConsumo([bolsa('a', 3, 10)], 10);

    expect(plan.aplicaciones).toEqual([{ bolsaId: 'a', puntos: 3 }]);
    expect(plan.descubierto).toBe(7);
  });

  it('sin bolsas, todo el costo queda en descubierto', () => {
    const plan = planificarConsumo([], 5);

    expect(plan.aplicaciones).toEqual([]);
    expect(plan.descubierto).toBe(5);
  });

  it('el plan ilimitado cubre la operación sin tocar las demás bolsas', () => {
    const bolsas = [bolsa('recarga', 25, 10), bolsa('ilimitado', 0, 30, true)];

    const plan = planificarConsumo(bolsas, 8);

    expect(plan.cubiertoPorPlanIlimitado).toBe(true);
    expect(plan.aplicaciones).toEqual([{ bolsaId: 'ilimitado', puntos: 8 }]);
    expect(plan.descubierto).toBe(0);
  });

  it('un costo de cero o negativo no es un consumo válido', () => {
    expect(() => planificarConsumo([bolsa('a', 10, 10)], 0)).toThrow();
    expect(() => planificarConsumo([bolsa('a', 10, 10)], -3)).toThrow();
  });
});

describe('tope de saldo en descubierto', () => {
  it('permite quedar en negativo mientras no pase el tope', () => {
    expect(excedeElDescubierto(2, 10, 20)).toBe(false);
    expect(excedeElDescubierto(-15, 5, 20)).toBe(false);
  });

  it('bloquea el consumo que pasaría del tope', () => {
    expect(excedeElDescubierto(-15, 6, 20)).toBe(true);
    expect(excedeElDescubierto(0, 21, 20)).toBe(true);
  });

  it('el tope se mide sobre el saldo resultante, no sobre el costo', () => {
    expect(excedeElDescubierto(100, 115, 20)).toBe(false);
    expect(excedeElDescubierto(100, 121, 20)).toBe(true);
  });
});
