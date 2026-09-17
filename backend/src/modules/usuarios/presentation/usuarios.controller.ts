import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import { empresaDelUsuario } from '../../../shared/seguridad/empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { UsuariosService } from '../application/usuarios.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';

@ApiBearerAuth()
@ApiTags('usuarios')
@Controller()
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @RequierePermisos('perfiles.ver', 'usuarios.crear')
  @Get('perfiles')
  perfiles() {
    return this.usuarios.listarPerfiles();
  }

  @RequierePermisos('usuarios.ver')
  @Get('usuarios')
  listar(@UsuarioActual() usuario: UsuarioAutenticado, @Query('empresaId') empresaId?: string) {
    return this.usuarios.listar(
      usuario.ambito === 'INNOVASOFT' ? empresaId : empresaDelUsuario(usuario, empresaId),
    );
  }

  @RequierePermisos('usuarios.crear')
  @HttpCode(HttpStatus.CREATED)
  @Post('usuarios')
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearUsuarioDto) {
    return this.usuarios.crear(datos, usuario);
  }
}
