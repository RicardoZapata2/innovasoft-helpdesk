import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import { empresaDelUsuario } from '../../../shared/seguridad/empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { UsuariosService } from '../application/usuarios.service.js';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';
import { CambiarPerfilDto } from './dto/cambiar-perfil.dto.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';

@ApiBearerAuth()
@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @RequierePermisos('usuarios.ver')
  @Get()
  listar(@UsuarioActual() usuario: UsuarioAutenticado, @Query('empresaId') empresaId?: string) {
    return this.usuarios.listar(
      usuario.ambito === 'INNOVASOFT' ? empresaId : empresaDelUsuario(usuario, empresaId),
    );
  }

  @RequierePermisos('usuarios.crear')
  @HttpCode(HttpStatus.CREATED)
  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearUsuarioDto) {
    return this.usuarios.crear(datos, usuario);
  }

  @RequierePermisos('usuarios.editar')
  @Patch(':id')
  actualizar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarUsuarioDto,
  ) {
    return this.usuarios.actualizar(id, datos, usuario);
  }

  @RequierePermisos('usuarios.asignar_perfil')
  @Patch(':id/perfil')
  cambiarPerfil(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarPerfilDto,
  ) {
    return this.usuarios.cambiarPerfil(id, datos.perfil, usuario);
  }

  @RequierePermisos('usuarios.desactivar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/activar')
  activar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.cambiarEstado(id, true, usuario);
  }

  @RequierePermisos('usuarios.desactivar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/desactivar')
  desactivar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.cambiarEstado(id, false, usuario);
  }
}
