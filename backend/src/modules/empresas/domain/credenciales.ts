import { randomInt } from 'node:crypto';

// Se excluyen los caracteres que se confunden al dictarlos o copiarlos a mano:
// la ele minúscula con el uno, la o mayúscula con el cero.
const MINUSCULAS = 'abcdefghijkmnpqrstuvwxyz';
const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';

function tomar(alfabeto: string): string {
  return alfabeto[randomInt(alfabeto.length)];
}

function barajar(caracteres: string[]): string[] {
  for (let i = caracteres.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }

  return caracteres;
}

// La contraseña que Innovasoft entrega al habilitar una empresa. Se construye
// garantizando que cumple la misma política que se exige al usuario, para que
// no pueda generarse una que el propio sistema rechazaría después.
export function generarPasswordTemporal(): string {
  const obligatorios = [tomar(MAYUSCULAS), tomar(MINUSCULAS), tomar(DIGITOS), tomar(DIGITOS)];
  const resto = Array.from({ length: 8 }, () => tomar(MINUSCULAS + MAYUSCULAS + DIGITOS));

  return barajar([...obligatorios, ...resto]).join('');
}
