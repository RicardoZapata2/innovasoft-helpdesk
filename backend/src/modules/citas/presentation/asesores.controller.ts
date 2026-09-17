import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { AsesoresService } from '../application/asesores.service.js';
import { DisponibilidadDto } from './dto/disponibilidad.dto.js';

@ApiBearerAuth()
@ApiTags('asesores')
@Controller('asesores')
export class AsesoresController {
  constructor(private readonly asesores: AsesoresService) {}

  // Cualquiera que pueda agendar necesita ver la lista de asesores para elegir
  // uno, así que basta con tener permiso sobre citas.
  @RequierePermisos('citas.crear', 'citas.ver_todas', 'citas.administrar_disponibilidad')
  @Get()
  listar() {
    return this.asesores.listar();
  }

  @RequierePermisos('citas.administrar_disponibilidad')
  @Put(':id/disponibilidad')
  declarar(@Param('id', ParseUUIDPipe) id: string, @Body() datos: DisponibilidadDto) {
    return this.asesores.declararDisponibilidad(id, datos);
  }
}
