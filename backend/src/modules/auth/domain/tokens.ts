import { createHash, randomBytes } from 'node:crypto';

export function generarToken(): string {
  return randomBytes(32).toString('hex');
}

// En la base solo se guarda el hash. Si alguien lee la tabla de tokens no puede
// usarlos, igual que ocurre con las contraseñas.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function enMinutos(minutos: number): Date {
  return new Date(Date.now() + minutos * 60 * 1000);
}

export function enSegundos(segundos: number): Date {
  return new Date(Date.now() + segundos * 1000);
}
