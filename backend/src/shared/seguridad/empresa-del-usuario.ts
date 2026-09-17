import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../tipos/usuario-autenticado.js';

// Decide sobre qué empresa opera una petición. Es el punto único donde se
// resuelve el aislamiento entre empresas: si cada consulta lo decidiera por su
// cuenta, bastaría con que una se olvidara para filtrar datos ajenos.
//
// El personal de Innovasoft trabaja sobre cualquier empresa, pero debe decir
// cuál. El usuario de una empresa cliente solo puede operar sobre la suya, y
// pedir otra es un intento de acceso indebido, no un error de datos.
export function empresaDelUsuario(
  usuario: UsuarioAutenticado,
  empresaSolicitada?: string,
): string {
  if (usuario.ambito === 'INNOVASOFT') {
    if (empresaSolicitada === undefined) {
      throw new BadRequestException('Indica sobre qué empresa quieres consultar');
    }

    return empresaSolicitada;
  }

  if (usuario.empresaId === null) {
    throw new ForbiddenException('El usuario no está asociado a ninguna empresa');
  }

  if (empresaSolicitada !== undefined && empresaSolicitada !== usuario.empresaId) {
    throw new ForbiddenException('No puedes consultar información de otra empresa');
  }

  return usuario.empresaId;
}
