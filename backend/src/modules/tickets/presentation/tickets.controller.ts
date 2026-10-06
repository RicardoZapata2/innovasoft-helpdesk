import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { UsuarioActual } from '../../../shared/decoradores/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { ConsultaSaldoDto } from '../../puntos/presentation/dto/consulta-saldo.dto.js';
import { generarReporteCierre } from '../application/reporte-cierre.js';
import { TicketsService } from '../application/tickets.service.js';
import type { ArchivoSubido } from '../application/tickets.service.js';
import {
  ActividadDto,
  AsignarTicketDto,
  CambiarEstadoTicketDto,
  CerrarTicketDto,
  ConsultaTicketsDto,
  CrearTicketDto,
  EncuestaDto,
  ResolverTicketDto,
} from './dto/tickets.dto.js';

const VER = ['tickets.ver_todos', 'tickets.ver_empresa', 'tickets.ver_propios'];

@ApiBearerAuth()
@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @RequierePermisos(...VER, 'tickets.crear')
  @Get('catalogos')
  catalogos() {
    return this.tickets.catalogos();
  }

  @RequierePermisos(...VER)
  @Get('satisfaccion')
  satisfaccion(@UsuarioActual() usuario: UsuarioAutenticado, @Query() consulta: ConsultaSaldoDto) {
    return this.tickets.satisfaccion(usuario, consulta.empresaId);
  }

  @RequierePermisos(...VER)
  @Get()
  listar(@UsuarioActual() usuario: UsuarioAutenticado, @Query() consulta: ConsultaTicketsDto) {
    return this.tickets.listar(usuario, consulta);
  }

  @RequierePermisos('tickets.crear')
  @HttpCode(HttpStatus.CREATED)
  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearTicketDto) {
    return this.tickets.crear(usuario, datos);
  }

  @RequierePermisos(...VER)
  @Get(':id')
  obtener(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.obtener(id, usuario);
  }

  @RequierePermisos('tickets.asignar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/asignar')
  asignar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: AsignarTicketDto,
  ) {
    return this.tickets.asignar(id, datos, usuario);
  }

  // Los permisos concretos de cada salto se validan contra la tabla de
  // transiciones; aquí solo se exige poder mover tickets de algún modo.
  @RequierePermisos('tickets.cambiar_estado', 'tickets.reabrir', 'tickets.asignar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/estado')
  cambiarEstado(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarEstadoTicketDto,
  ) {
    return this.tickets.cambiarEstado(id, datos, usuario);
  }

  @RequierePermisos('tickets.cambiar_estado')
  @HttpCode(HttpStatus.OK)
  @Post(':id/resolver')
  resolver(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ResolverTicketDto,
  ) {
    return this.tickets.resolver(id, datos, usuario);
  }

  // Aquí el ticket se convierte en consumo: el cierre descuenta los puntos de
  // la tarifa aplicada contra las bolsas vigentes de la empresa.
  @RequierePermisos('tickets.cerrar')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cerrar')
  cerrar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CerrarTicketDto,
  ) {
    return this.tickets.cerrar(id, datos, usuario);
  }

  @RequierePermisos('tickets.registrar_actividad')
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/actividades')
  registrarActividad(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActividadDto,
  ) {
    return this.tickets.registrarActividad(id, datos, usuario);
  }

  @RequierePermisos('tickets.subir_evidencias', 'tickets.crear')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/adjuntos')
  subirAdjunto(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: ArchivoSubido | undefined,
  ) {
    return this.tickets.subirAdjunto(id, archivo, usuario);
  }

  @RequierePermisos(...VER)
  @Get(':id/adjuntos/:adjuntoId')
  async descargarAdjunto(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adjuntoId', ParseUUIDPipe) adjuntoId: string,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const archivo = await this.tickets.adjunto(id, adjuntoId, usuario);

    respuesta.set({
      'Content-Type': archivo.tipoMime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(archivo.nombre)}"`,
    });

    return new StreamableFile(createReadStream(archivo.ruta));
  }

  @RequierePermisos(...VER)
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/encuesta')
  encuesta(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: EncuestaDto,
  ) {
    return this.tickets.responderEncuesta(id, datos, usuario);
  }

  @RequierePermisos('tickets.exportar_pdf')
  @Get(':id/pdf')
  async pdf(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const ticket = await this.tickets.obtener(id, usuario);
    const contenido = await generarReporteCierre(ticket);

    respuesta.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${ticket.codigo}.pdf"`,
    });

    return new StreamableFile(contenido);
  }
}
