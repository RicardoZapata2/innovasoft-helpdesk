import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import { empresaDelUsuario } from '../../../shared/seguridad/empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { EmpresasService } from '../application/empresas.service.js';
import { ActualizarEmpresaDto } from './dto/actualizar-empresa.dto.js';
import { CrearEmpresaDto } from './dto/crear-empresa.dto.js';

@ApiBearerAuth()
@ApiTags('empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @RequierePermisos('empresas.crear')
  @HttpCode(HttpStatus.CREATED)
  @Post()
  habilitar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearEmpresaDto) {
    return this.empresas.habilitar(datos, usuario.id);
  }

  @RequierePermisos('empresas.ver_todas')
  @Get()
  listar() {
    return this.empresas.listar();
  }

  // Ruta fija antes que la paramétrica: si estuviera después, "mia" entraría
  // por :id y fallaría al no ser un UUID.
  @RequierePermisos('empresas.ver_propia')
  @Get('mia')
  mia(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.empresas.obtener(empresaDelUsuario(usuario));
  }

  @RequierePermisos('empresas.ver_todas', 'empresas.ver_propia')
  @Get(':id')
  obtener(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.empresas.obtener(empresaDelUsuario(usuario, id));
  }

  @RequierePermisos('empresas.editar')
  @Patch(':id')
  actualizar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarEmpresaDto,
  ) {
    return this.empresas.actualizar(empresaDelUsuario(usuario, id), datos, usuario.id);
  }

  @RequierePermisos('empresas.desactivar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/desactivar')
  desactivar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.empresas.cambiarEstado(id, false, usuario.id);
  }

  @RequierePermisos('empresas.desactivar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/activar')
  activar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.empresas.cambiarEstado(id, true, usuario.id);
  }
}
