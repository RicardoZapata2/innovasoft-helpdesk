import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import { empresaDelUsuario } from '../../../shared/seguridad/empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { CitasService } from '../application/citas.service.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { ConsultaCitasDto } from './dto/consulta-citas.dto.js';
import { ConsultaFranjasDto } from './dto/consulta-franjas.dto.js';
import { CrearCitaDto } from './dto/crear-cita.dto.js';
import { ReprogramarCitaDto } from './dto/reprogramar-cita.dto.js';

@ApiBearerAuth()
@ApiTags('citas')
@Controller('citas')
export class CitasController {
  constructor(private readonly citas: CitasService) {}

  @RequierePermisos('citas.ver_todas', 'citas.ver_empresa', 'citas.ver_propias')
  @Get('franjas')
  franjas(@Query() consulta: ConsultaFranjasDto) {
    return this.citas.franjasDisponibles(consulta);
  }

  @RequierePermisos('citas.crear')
  @HttpCode(HttpStatus.CREATED)
  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearCitaDto) {
    return this.citas.crear(empresaDelUsuario(usuario, datos.empresaId), datos, usuario.id);
  }

  @RequierePermisos('citas.ver_todas', 'citas.ver_empresa', 'citas.ver_propias')
  @Get()
  listar(@UsuarioActual() usuario: UsuarioAutenticado, @Query() consulta: ConsultaCitasDto) {
    // El personal de Innovasoft ve la agenda completa si no acota la empresa;
    // el usuario de una empresa cliente queda siempre restringido a la suya.
    const empresaId =
      usuario.ambito === 'INNOVASOFT'
        ? consulta.empresaId
        : empresaDelUsuario(usuario, consulta.empresaId);

    return this.citas.listar(usuario, consulta, empresaId);
  }

  @RequierePermisos('citas.ver_todas', 'citas.ver_empresa', 'citas.ver_propias')
  @Get(':id')
  obtener(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.citas.obtener(id, usuario.ambito === 'INNOVASOFT' ? undefined : empresaDelUsuario(usuario));
  }

  @RequierePermisos('citas.confirmar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/confirmar')
  confirmar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarEstadoDto,
  ) {
    return this.citas.cambiarEstado(id, 'confirmada', datos, usuario, this.ambito(usuario));
  }

  @RequierePermisos('citas.reprogramar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/reprogramar')
  reprogramar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ReprogramarCitaDto,
  ) {
    return this.citas.reprogramar(id, datos, usuario, this.ambito(usuario));
  }

  @RequierePermisos('citas.cancelar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancelar')
  cancelar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarEstadoDto,
  ) {
    return this.citas.cambiarEstado(id, 'cancelada', datos, usuario, this.ambito(usuario));
  }

  @RequierePermisos('citas.marcar_realizada')
  @HttpCode(HttpStatus.OK)
  @Post(':id/iniciar')
  iniciar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarEstadoDto,
  ) {
    return this.citas.cambiarEstado(id, 'en_curso', datos, usuario, this.ambito(usuario));
  }

  // Aquí es donde la cita se convierte en consumo: el motor de puntos descuenta
  // la tarifa de la modalidad contra las bolsas vigentes de la empresa.
  @RequierePermisos('citas.marcar_realizada')
  @HttpCode(HttpStatus.OK)
  @Post(':id/realizada')
  realizada(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarEstadoDto,
  ) {
    return this.citas.cambiarEstado(id, 'realizada', datos, usuario, this.ambito(usuario));
  }

  @RequierePermisos('citas.marcar_realizada')
  @HttpCode(HttpStatus.OK)
  @Post(':id/no-asistida')
  noAsistida(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarEstadoDto,
  ) {
    return this.citas.cambiarEstado(id, 'no_asistida', datos, usuario, this.ambito(usuario));
  }

  private ambito(usuario: UsuarioAutenticado): string | undefined {
    return usuario.ambito === 'INNOVASOFT' ? undefined : empresaDelUsuario(usuario);
  }
}
