import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { CatalogoFidelizacionService } from '../application/catalogo-fidelizacion.service.js';
import { ActualizarRecompensaDto, ActualizarReglaDto, RecompensaDto } from './dto/catalogo-fidelizacion.dto.js';

@ApiBearerAuth()
@ApiTags('fidelización')
@Controller('fidelizacion/catalogo')
export class CatalogoFidelizacionController {
  constructor(private readonly catalogo: CatalogoFidelizacionService) {}

  @RequierePermisos('fidelizacion.administrar_recompensas')
  @Get('recompensas')
  recompensas() {
    return this.catalogo.listarRecompensas();
  }

  @RequierePermisos('fidelizacion.administrar_recompensas')
  @Post('recompensas')
  crearRecompensa(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: RecompensaDto) {
    return this.catalogo.crearRecompensa(datos, usuario.id);
  }

  @RequierePermisos('fidelizacion.administrar_recompensas')
  @Patch('recompensas/:id')
  actualizarRecompensa(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarRecompensaDto,
  ) {
    return this.catalogo.actualizarRecompensa(id, datos, usuario.id);
  }

  @RequierePermisos('fidelizacion.administrar_reglas')
  @Get('reglas')
  reglas() {
    return this.catalogo.listarReglas();
  }

  @RequierePermisos('fidelizacion.administrar_reglas')
  @Patch('reglas/:id')
  actualizarRegla(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarReglaDto,
  ) {
    return this.catalogo.actualizarRegla(id, datos, usuario.id);
  }
}
