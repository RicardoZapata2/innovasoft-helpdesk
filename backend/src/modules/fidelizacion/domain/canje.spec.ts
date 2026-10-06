import { aplicarDescuento, elegirDescuento, puedeCanjear, venceElBeneficio } from './canje.js';

describe('canje de recompensas', () => {
  it('permite canjear cuando el saldo cubre el costo exacto', () => {
    expect(puedeCanjear(100, 100)).toBe(true);
  });

  it('rechaza el canje cuando falta un solo punto', () => {
    expect(puedeCanjear(99, 100)).toBe(false);
  });

  it('calcula el vencimiento del beneficio desde la fecha del canje', () => {
    const desde = new Date(2026, 9, 1);

    expect(venceElBeneficio(desde, 30)).toEqual(new Date(2026, 9, 31));
    expect(venceElBeneficio(desde, null)).toBeNull();
  });

  it('aplica el mayor descuento disponible y no los acumula', () => {
    const elegido = elegirDescuento([
      { id: 'a', porcentaje: 5 },
      { id: 'b', porcentaje: 10 },
      { id: 'c', porcentaje: 5 },
    ]);

    expect(elegido?.id).toBe('b');
    expect(elegirDescuento([])).toBeNull();
  });

  it('redondea el precio con descuento a pesos enteros', () => {
    expect(aplicarDescuento(1150000, 5)).toBe(1092500);
    expect(aplicarDescuento(390000, 10)).toBe(351000);
  });
});
