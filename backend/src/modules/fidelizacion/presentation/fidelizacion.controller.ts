import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import { empresaDelUsuario } from '../../../shared/seguridad/empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { ConsultaSaldoDto } from '../../puntos/presentation/dto/consulta-saldo.dto.js';
import { FidelizacionService } from '../application/fidelizacion.service.js';
import { CanjearDto } from './dto/canjear.dto.js';

@ApiBearerAuth()
@ApiTags('fidelización')
@Controller('fidelizacion')
export class FidelizacionController {
  constructor(private readonly fidelizacion: FidelizacionService) {}

  @RequierePermisos('fidelizacion.ver_saldo', 'fidelizacion.ver_historial')
  @Get()
  resumen(@UsuarioActual() usuario: UsuarioAutenticado, @Query() consulta: ConsultaSaldoDto) {
    return this.fidelizacion.resumen(empresaDelUsuario(usuario, consulta.empresaId));
  }

  @RequierePermisos('fidelizacion.canjear')
  @HttpCode(HttpStatus.CREATED)
  @Post('canjes')
  canjear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CanjearDto) {
    return this.fidelizacion.canjear(empresaDelUsuario(usuario, datos.empresaId), datos.recompensa, usuario.id);
  }
}
