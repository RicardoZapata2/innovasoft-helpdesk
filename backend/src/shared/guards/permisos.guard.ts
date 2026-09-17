import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLAVE_PERMISOS } from '../decoradores/permisos.decorator.js';
import type { UsuarioAutenticado } from '../tipos/usuario-autenticado.js';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<string[]>(CLAVE_PERMISOS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (requeridos === undefined || requeridos.length === 0) {
      return true;
    }

    const request = contexto.switchToHttp().getRequest<{ user?: UsuarioAutenticado }>();
    const usuario = request.user;

    if (usuario === undefined) {
      throw new ForbiddenException('No hay sesión activa');
    }

    const autorizado = requeridos.some((clave) => usuario.permisos.includes(clave));

    if (!autorizado) {
      throw new ForbiddenException(`La operación exige el permiso ${requeridos.join(' o ')}`);
    }

    return true;
  }
}
