import { enMinutos, generarToken, hashToken } from './tokens.js';

describe('tokens de un solo uso', () => {
  it('genera 64 caracteres hexadecimales', () => {
    expect(generarToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('no repite el mismo token', () => {
    const generados = new Set(Array.from({ length: 100 }, () => generarToken()));

    expect(generados.size).toBe(100);
  });

  it('el hash es estable y no permite recuperar el token', () => {
    const token = generarToken();

    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });

  it('calcula el vencimiento sumando minutos', () => {
    const antes = Date.now();
    const vence = enMinutos(60);

    expect(vence.getTime() - antes).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(vence.getTime() - antes).toBeLessThan(60 * 60 * 1000 + 1000);
  });
});
