import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermisosGuard } from './permisos.guard.js';
import type { UsuarioAutenticado } from '../tipos/usuario-autenticado.js';

const usuario: UsuarioAutenticado = {
  id: '1',
  email: 'ana@empresa.com',
  nombres: 'Ana',
  apellidos: 'Gómez',
  empresaId: 'empresa-1',
  perfil: 'Usuario de empresa cliente',
  ambito: 'EMPRESA',
  permisos: ['citas.crear', 'citas.ver_propias'],
  debeCambiarPassword: false,
};

function contextoCon(user: UsuarioAutenticado | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function reflectorQueExige(permisos: string[] | undefined): Reflector {
  return { getAllAndOverride: () => permisos } as unknown as Reflector;
}

describe('guard de permisos', () => {
  it('deja pasar los endpoints que no exigen permisos', () => {
    const guard = new PermisosGuard(reflectorQueExige(undefined));

    expect(guard.canActivate(contextoCon(usuario))).toBe(true);
  });

  it('deja pasar cuando el perfil tiene el permiso exigido', () => {
    const guard = new PermisosGuard(reflectorQueExige(['citas.crear']));

    expect(guard.canActivate(contextoCon(usuario))).toBe(true);
  });

  it('rechaza cuando el perfil no tiene el permiso', () => {
    const guard = new PermisosGuard(reflectorQueExige(['citas.marcar_realizada']));

    expect(() => guard.canActivate(contextoCon(usuario))).toThrow(ForbiddenException);
  });

  it('basta con uno de los permisos alternativos', () => {
    const guard = new PermisosGuard(reflectorQueExige(['citas.ver_todas', 'citas.ver_propias']));

    expect(guard.canActivate(contextoCon(usuario))).toBe(true);
  });

  it('rechaza si no hay usuario en la petición', () => {
    const guard = new PermisosGuard(reflectorQueExige(['citas.crear']));

    expect(() => guard.canActivate(contextoCon(undefined))).toThrow(ForbiddenException);
  });
});
