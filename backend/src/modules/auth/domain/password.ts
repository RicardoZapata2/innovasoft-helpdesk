import { hash, verify } from '@node-rs/argon2';

// Argon2id es el algoritmo por defecto de la librería y la recomendación actual
// de OWASP frente a bcrypt. La prueba de este módulo comprueba que el hash
// generado empieza por "$argon2id$", de modo que la garantía está verificada y
// no solo declarada.
//
// 19456 KiB son 19 MiB de memoria por intento, el mínimo que recomienda OWASP.
// La memoria es la defensa principal: una GPU tiene miles de núcleos pero poca
// memoria por núcleo, así que exigirla reduce cuántos intentos caben en
// paralelo mucho más que subir el número de iteraciones.
const PARAMETROS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMETROS);
}

export async function passwordCoincide(passwordHash: string, password: string): Promise<boolean> {
  try {
    // Los parámetros y la sal con que se generó viajan dentro del propio hash,
    // así que verify no necesita que se los repitan. Eso permite además validar
    // contraseñas guardadas con parámetros distintos a los actuales.
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
