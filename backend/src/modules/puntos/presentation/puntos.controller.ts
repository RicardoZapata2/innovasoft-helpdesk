import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import { empresaDelUsuario } from '../../../shared/seguridad/empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { PuntosService } from '../application/puntos.service.js';
import { AjusteDto } from './dto/ajuste.dto.js';
import { ConsultaKardexDto } from './dto/consulta-kardex.dto.js';
import { ConsultaSaldoDto } from './dto/consulta-saldo.dto.js';
import { ContratarPlanDto } from './dto/contratar-plan.dto.js';

@ApiBearerAuth()
@ApiTags('puntos')
@Controller('puntos')
export class PuntosController {
  constructor(private readonly puntos: PuntosService) {}

  @RequierePermisos('puntos.ver_saldo_empresa', 'puntos.ver_saldo_todos')
  @Get('saldo')
  saldo(@UsuarioActual() usuario: UsuarioAutenticado, @Query() consulta: ConsultaSaldoDto) {
    return this.puntos.obtenerEstadoDeCuenta(empresaDelUsuario(usuario, consulta.empresaId));
  }

  @RequierePermisos('puntos.ver_kardex')
  @Get('kardex')
  kardex(@UsuarioActual() usuario: UsuarioAutenticado, @Query() consulta: ConsultaKardexDto) {
    return this.puntos.obtenerKardex(empresaDelUsuario(usuario, consulta.empresaId), consulta);
  }

  @RequierePermisos('puntos.contratar_plan', 'puntos.renovar_plan')
  @Post('contratar')
  contratar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: ContratarPlanDto) {
    return this.puntos.contratarPlan(empresaDelUsuario(usuario, datos.empresaId), datos, usuario.id);
  }

  @RequierePermisos('puntos.ajustar_saldo')
  @HttpCode(HttpStatus.CREATED)
  @Post('ajustes')
  ajustar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: AjusteDto) {
    return this.puntos.ajustarSaldo(empresaDelUsuario(usuario, datos.empresaId), datos, usuario.id);
  }
}
