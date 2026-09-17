import { calcularAlertas } from './alertas.js';

const umbrales = { saldoBajo: 5, diasParaVencer: 10, topeDescubierto: 20 };
const ahora = new Date('2026-09-17T12:00:00Z');

function enDias(dias: number): Date {
  return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000);
}

describe('alertas de saldo', () => {
  it('no avisa nada cuando el saldo es holgado y nada vence pronto', () => {
    const alertas = calcularAlertas(
      80,
      [{ venceEn: enDias(25), saldo: 80, esIlimitada: false }],
      umbrales,
      ahora,
    );

    expect(alertas).toEqual([]);
  });

  it('avisa cuando el saldo baja del umbral', () => {
    const alertas = calcularAlertas(4, [], umbrales, ahora);

    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe('SALDO_BAJO');
  });

  it('avisa del descubierto e indica cuánto margen queda', () => {
    const alertas = calcularAlertas(-8, [], umbrales, ahora);

    expect(alertas[0].tipo).toBe('SALDO_EN_DESCUBIERTO');
    expect(alertas[0].mensaje).toContain('12 puntos de margen');
  });

  it('avisa de las bolsas que están por vencer', () => {
    const alertas = calcularAlertas(
      50,
      [
        { venceEn: enDias(3), saldo: 20, esIlimitada: false },
        { venceEn: enDias(40), saldo: 30, esIlimitada: false },
      ],
      umbrales,
      ahora,
    );

    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe('BOLSA_POR_VENCER');
    expect(alertas[0].mensaje).toContain('20 puntos');
  });

  it('no avisa por una bolsa vacía ni por una ilimitada', () => {
    const alertas = calcularAlertas(
      50,
      [
        { venceEn: enDias(2), saldo: 0, esIlimitada: false },
        { venceEn: enDias(2), saldo: 0, esIlimitada: true },
      ],
      umbrales,
      ahora,
    );

    expect(alertas).toEqual([]);
  });
});
