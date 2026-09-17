import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { UsuarioAutenticado } from '../tipos/usuario-autenticado.js';

export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const request = contexto.switchToHttp().getRequest<{ user: UsuarioAutenticado }>();
    return request.user;
  },
);
