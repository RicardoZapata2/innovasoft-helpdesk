import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { empresaDelUsuario } from './empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../tipos/usuario-autenticado.js';

const base: UsuarioAutenticado = {
  id: '1',
  email: 'x@y.com',
  nombres: 'X',
  apellidos: 'Y',
  empresaId: null,
  perfil: 'Administrador Innovasoft',
  ambito: 'INNOVASOFT',
  permisos: [],
  debeCambiarPassword: false,
};

const deInnovasoft = base;
const deEmpresa: UsuarioAutenticado = {
  ...base,
  empresaId: 'empresa-a',
  perfil: 'Administrador de empresa cliente',
  ambito: 'EMPRESA',
};

describe('aislamiento por empresa', () => {
  it('el personal de Innovasoft opera sobre la empresa que indique', () => {
    expect(empresaDelUsuario(deInnovasoft, 'empresa-b')).toBe('empresa-b');
  });

  it('el personal de Innovasoft debe indicar una empresa', () => {
    expect(() => empresaDelUsuario(deInnovasoft)).toThrow(BadRequestException);
  });

  it('el usuario de una empresa opera sobre la suya sin indicarla', () => {
    expect(empresaDelUsuario(deEmpresa)).toBe('empresa-a');
  });

  it('el usuario de una empresa puede indicar la suya', () => {
    expect(empresaDelUsuario(deEmpresa, 'empresa-a')).toBe('empresa-a');
  });

  it('rechaza el acceso a los datos de otra empresa', () => {
    expect(() => empresaDelUsuario(deEmpresa, 'empresa-b')).toThrow(ForbiddenException);
  });
});
