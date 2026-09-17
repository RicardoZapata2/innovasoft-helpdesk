import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import { Publico } from '../../../shared/decoradores/publico.decorator.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { AuthService } from '../application/auth.service.js';
import { CambioPasswordDto } from './dto/cambio-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RecuperacionDto } from './dto/recuperacion.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto.js';
import { VerificacionDto } from './dto/verificacion.dto.js';

@ApiTags('autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() datos: LoginDto) {
    return this.auth.login(datos);
  }

  @Publico()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refrescar(@Body() datos: RefreshDto) {
    return this.auth.refrescar(datos.refreshToken);
  }

  @Publico()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  cerrarSesion(@Body() datos: RefreshDto) {
    return this.auth.cerrarSesion(datos.refreshToken);
  }

  @Publico()
  @HttpCode(HttpStatus.OK)
  @Post('verificar-email')
  verificarEmail(@Body() datos: VerificacionDto) {
    return this.auth.verificarEmail(datos.token);
  }

  @Publico()
  @HttpCode(HttpStatus.OK)
  @Post('recuperar-password')
  recuperarPassword(@Body() datos: RecuperacionDto) {
    return this.auth.solicitarRecuperacion(datos);
  }

  @Publico()
  @HttpCode(HttpStatus.OK)
  @Post('restablecer-password')
  restablecerPassword(@Body() datos: RestablecerPasswordDto) {
    return this.auth.restablecerPassword(datos);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('cambiar-password')
  cambiarPassword(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CambioPasswordDto) {
    return this.auth.cambiarPassword(usuario.id, datos);
  }

  @ApiBearerAuth()
  @Get('sesion')
  sesion(@UsuarioActual() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
