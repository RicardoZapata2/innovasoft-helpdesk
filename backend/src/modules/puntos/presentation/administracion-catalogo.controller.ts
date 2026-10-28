import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { CatalogoService } from '../application/catalogo.service.js';
import { ActualizarPlanDto, ActualizarTarifaDto, PlanDto, TarifaDto } from './dto/catalogo.dto.js';

// A diferencia del catálogo público, aquí se ven también los planes y tarifas
// inactivos, con su identificador, para poder editarlos.
@ApiBearerAuth()
@ApiTags('catálogo')
@Controller('catalogo')
export class AdministracionCatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @RequierePermisos('puntos.administrar_planes')
  @Get('planes')
  planes() {
    return this.catalogo.listarPlanes();
  }

  @RequierePermisos('puntos.administrar_planes')
  @Post('planes')
  crearPlan(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: PlanDto) {
    return this.catalogo.crearPlan(datos, usuario.id);
  }

  @RequierePermisos('puntos.administrar_planes')
  @Patch('planes/:id')
  actualizarPlan(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarPlanDto,
  ) {
    return this.catalogo.actualizarPlan(id, datos, usuario.id);
  }

  @RequierePermisos('puntos.administrar_tarifas')
  @Get('tarifas')
  tarifas() {
    return this.catalogo.listarTarifas();
  }

  @RequierePermisos('puntos.administrar_tarifas')
  @Post('tarifas')
  crearTarifa(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: TarifaDto) {
    return this.catalogo.crearTarifa(datos, usuario.id);
  }

  @RequierePermisos('puntos.administrar_tarifas')
  @Patch('tarifas/:id')
  actualizarTarifa(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarTarifaDto,
  ) {
    return this.catalogo.actualizarTarifa(id, datos, usuario.id);
  }
}
