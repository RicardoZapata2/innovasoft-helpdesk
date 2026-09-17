import { generarPasswordTemporal } from './credenciales.js';

describe('contraseña temporal', () => {
  it('cumple la política que exige el registro', () => {
    for (let i = 0; i < 200; i += 1) {
      const password = generarPasswordTemporal();

      expect(password.length).toBeGreaterThanOrEqual(10);
      expect(password).toMatch(/[A-Za-z]/);
      expect(password).toMatch(/\d/);
    }
  });

  it('no usa caracteres que se confunden al dictarlos', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generarPasswordTemporal()).not.toMatch(/[lIO01]/);
    }
  });

  it('no repite la misma contraseña', () => {
    const generadas = new Set(Array.from({ length: 200 }, () => generarPasswordTemporal()));

    expect(generadas.size).toBe(200);
  });
});
