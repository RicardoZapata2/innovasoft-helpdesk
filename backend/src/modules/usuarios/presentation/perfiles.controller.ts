import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { PerfilesService } from '../application/perfiles.service.js';
import { CrearPerfilDto } from './dto/crear-perfil.dto.js';
import { PermisosDelPerfilDto } from './dto/permisos-del-perfil.dto.js';

@ApiBearerAuth()
@ApiTags('perfiles y permisos')
@Controller()
export class PerfilesController {
  constructor(private readonly perfiles: PerfilesService) {}

  @RequierePermisos('perfiles.ver', 'usuarios.crear')
  @Get('perfiles')
  listar() {
    return this.perfiles.listar();
  }

  @RequierePermisos('perfiles.ver')
  @Get('permisos')
  permisos() {
    return this.perfiles.catalogoDePermisos();
  }

  @RequierePermisos('perfiles.ver')
  @Get('perfiles/:id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.perfiles.obtener(id);
  }

  @RequierePermisos('perfiles.crear')
  @HttpCode(HttpStatus.CREATED)
  @Post('perfiles')
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearPerfilDto) {
    return this.perfiles.crear(datos, usuario);
  }

  @RequierePermisos('perfiles.asignar_permisos')
  @Put('perfiles/:id/permisos')
  asignarPermisos(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: PermisosDelPerfilDto,
  ) {
    return this.perfiles.reemplazarPermisos(id, datos, usuario);
  }

  @RequierePermisos('perfiles.eliminar')
  @Delete('perfiles/:id')
  eliminar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.perfiles.eliminar(id, usuario);
  }
}
