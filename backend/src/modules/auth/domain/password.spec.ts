import { hashPassword, passwordCoincide } from './password.js';

describe('hash de contraseñas', () => {
  it('no guarda la contraseña en claro', async () => {
    const hash = await hashPassword('Contrasena123');

    expect(hash).not.toContain('Contrasena123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('produce un hash distinto para la misma contraseña', async () => {
    const primero = await hashPassword('Contrasena123');
    const segundo = await hashPassword('Contrasena123');

    expect(primero).not.toBe(segundo);
  });

  it('acepta la contraseña correcta y rechaza cualquier otra', async () => {
    const hash = await hashPassword('Contrasena123');

    expect(await passwordCoincide(hash, 'Contrasena123')).toBe(true);
    expect(await passwordCoincide(hash, 'Contrasena124')).toBe(false);
  });

  it('devuelve falso en lugar de reventar si el hash está corrupto', async () => {
    expect(await passwordCoincide('esto-no-es-un-hash', 'Contrasena123')).toBe(false);
  });
});
