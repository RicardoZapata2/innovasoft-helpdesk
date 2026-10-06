import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { empresaDelUsuario } from '../../../shared/seguridad/empresa-del-usuario.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { FidelizacionService } from '../../fidelizacion/application/fidelizacion.service.js';
import { ConsumoPuntosService } from '../../puntos/application/consumo-puntos.service.js';
import type { ClientePrisma, ResultadoConsumo } from '../../puntos/application/consumo-puntos.service.js';
import {
  TIPOS_PERMITIDOS,
  TIPOS_SOLUCION,
  componerCodigoTicket,
  destinosDisponibles,
  elegirAsesorConMenorCarga,
  evaluarTransicion,
  sugerirTarifa,
  tieneEvidenciaCompleta,
  validarAdjunto,
} from '../domain/reglas-ticket.js';
import type { Transicion } from '../domain/reglas-ticket.js';
import type {
  ActividadDto,
  AsignarTicketDto,
  CambiarEstadoTicketDto,
  CerrarTicketDto,
  ConsultaTicketsDto,
  CrearTicketDto,
  EncuestaDto,
  ResolverTicketDto,
} from '../presentation/dto/tickets.dto.js';

export type ArchivoSubido = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly consumo: ConsumoPuntosService,
    private readonly fidelizacion: FidelizacionService,
  ) {}

  async catalogos() {
    const [categorias, estados, tarifas, asesores] = await Promise.all([
      this.prisma.categoriaServicio.findMany({
        where: { activa: true },
        orderBy: { nombre: 'asc' },
        select: { clave: true, nombre: true, descripcion: true },
      }),
      this.prisma.estadoTicket.findMany({
        orderBy: { orden: 'asc' },
        select: { clave: true, nombre: true, esFinal: true },
      }),
      this.prisma.tarifaServicio.findMany({
        where: { activo: true },
        orderBy: { puntos: 'asc' },
        select: { clave: true, nombre: true, puntos: true },
      }),
      this.prisma.asesor.findMany({
        where: { activo: true, usuario: { activo: true } },
        select: { id: true, especialidad: true, usuario: { select: { nombres: true, apellidos: true } } },
      }),
    ]);

    return {
      categorias,
      estados,
      tarifas,
      asesores,
      tiposSolucion: TIPOS_SOLUCION,
      prioridades: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'],
      maxMbAdjunto: this.config.getOrThrow<number>('subidas.maxMb'),
      tiposAdjunto: Object.keys(TIPOS_PERMITIDOS),
    };
  }

  async crear(usuario: UsuarioAutenticado, datos: CrearTicketDto) {
    const empresaId = empresaDelUsuario(usuario, datos.empresaId);

    const [empresa, categoria, abierto] = await Promise.all([
      this.prisma.empresa.findUnique({ where: { id: empresaId } }),
      this.prisma.categoriaServicio.findUnique({ where: { clave: datos.categoria } }),
      this.estadoPorClave('abierto'),
    ]);

    if (empresa === null || !empresa.activa) {
      throw new NotFoundException('La empresa no existe o está desactivada');
    }

    if (categoria === null || !categoria.activa) {
      throw new NotFoundException(`No existe la categoría "${datos.categoria}"`);
    }

    const anio = new Date().getFullYear();

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          codigo: await this.siguienteCodigo(tx, anio),
          empresaId,
          solicitanteId: usuario.id,
          categoriaId: categoria.id,
          estadoId: abierto.id,
          prioridad: datos.prioridad,
          titulo: datos.titulo.trim(),
          descripcion: datos.descripcion.trim(),
        },
      });

      // El historial arranca con la creación: estado anterior nulo, estado
      // nuevo "abierto". Así la línea de tiempo empieza en el primer evento.
      await tx.ticketHistorial.create({
        data: {
          ticketId: ticket.id,
          estadoAnteriorId: null,
          estadoNuevoId: abierto.id,
          usuarioId: usuario.id,
          comentario: 'Ticket registrado',
        },
      });

      await this.auditar(tx, usuario.id, ticket.id, 'CREAR', null, {
        codigo: ticket.codigo,
        categoria: categoria.clave,
        prioridad: ticket.prioridad,
      });

      return ticket;
    });
  }

  async listar(usuario: UsuarioAutenticado, consulta: ConsultaTicketsDto) {
    const pagina = consulta.pagina ?? 1;
    const tamano = consulta.tamano ?? 20;
    const alcance = this.alcance(usuario, consulta.empresaId);

    const filtros: Prisma.TicketWhereInput = {
      ...(consulta.categoria === undefined ? {} : { categoria: { clave: consulta.categoria } }),
      ...(consulta.prioridad === undefined ? {} : { prioridad: consulta.prioridad }),
      ...(consulta.asesorId === undefined ? {} : { asesorId: consulta.asesorId }),
      ...(consulta.desde === undefined && consulta.hasta === undefined
        ? {}
        : {
            abiertoEn: {
              ...(consulta.desde === undefined ? {} : { gte: new Date(consulta.desde) }),
              ...(consulta.hasta === undefined ? {} : { lte: new Date(consulta.hasta) }),
            },
          }),
      ...(consulta.buscar === undefined || consulta.buscar.trim() === ''
        ? {}
        : {
            OR: [
              { codigo: { contains: consulta.buscar.trim(), mode: 'insensitive' as const } },
              { titulo: { contains: consulta.buscar.trim(), mode: 'insensitive' as const } },
            ],
          }),
    };

    const filtro: Prisma.TicketWhereInput = {
      AND: [
        alcance,
        filtros,
        consulta.estado === undefined ? {} : { estado: { clave: consulta.estado } },
      ],
    };

    // El conteo por estado ignora el filtro de estado a propósito: es lo que
    // alimenta las pestañas de la bandeja, y cada pestaña debe mostrar cuántos
    // casos tiene aunque la que esté elegida sea otra.
    const [total, tickets, porEstado, estados] = await Promise.all([
      this.prisma.ticket.count({ where: filtro }),
      this.prisma.ticket.findMany({
        where: filtro,
        orderBy: { abiertoEn: 'desc' },
        skip: (pagina - 1) * tamano,
        take: tamano,
        select: this.resumen(),
      }),
      this.prisma.ticket.groupBy({
        by: ['estadoId'],
        where: { AND: [alcance, filtros] },
        _count: { _all: true },
      }),
      this.prisma.estadoTicket.findMany({ orderBy: { orden: 'asc' } }),
    ]);

    const conteo = new Map(porEstado.map((fila) => [fila.estadoId, fila._count._all]));

    return {
      pagina,
      tamano,
      total,
      paginas: Math.max(1, Math.ceil(total / tamano)),
      tickets,
      porEstado: estados.map((estado) => ({
        clave: estado.clave,
        nombre: estado.nombre,
        cantidad: conteo.get(estado.id) ?? 0,
      })),
    };
  }

  async obtener(id: string, usuario: UsuarioAutenticado) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { AND: [{ id }, this.alcance(usuario)] },
      include: {
        empresa: { select: { id: true, nit: true, razonSocial: true, direccion: true, telefono: true } },
        solicitante: { select: { id: true, nombres: true, apellidos: true, email: true } },
        asesor: { select: { id: true, especialidad: true, usuario: { select: { id: true, nombres: true, apellidos: true, email: true } } } },
        categoria: { select: { clave: true, nombre: true } },
        estado: { select: { clave: true, nombre: true, esFinal: true } },
        tarifaAplicada: { select: { clave: true, nombre: true, puntos: true } },
        historial: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            comentario: true,
            createdAt: true,
            estadoAnterior: { select: { clave: true, nombre: true } },
            estadoNuevo: { select: { clave: true, nombre: true } },
            usuario: { select: { nombres: true, apellidos: true } },
          },
        },
        actividades: {
          orderBy: { fecha: 'asc' },
          select: {
            id: true,
            descripcion: true,
            horas: true,
            fecha: true,
            asesor: { select: { usuario: { select: { nombres: true, apellidos: true } } } },
          },
        },
        adjuntos: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            nombreArchivo: true,
            tipoMime: true,
            tamanoBytes: true,
            createdAt: true,
            subidoPor: { select: { nombres: true, apellidos: true } },
          },
        },
        encuesta: true,
        movimientos: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, tipo: true, puntos: true, descripcion: true, createdAt: true },
        },
        fidelidad: { select: { id: true, puntos: true, descripcion: true, createdAt: true } },
      },
    });

    if (ticket === null) {
      throw new NotFoundException('El ticket no existe o no tienes acceso a él');
    }

    const transiciones = await this.transiciones();
    const horasTrabajadas = ticket.actividades.reduce((total, actividad) => total + Number(actividad.horas), 0);
    const puntosConsumidos = -ticket.movimientos.reduce((total, movimiento) => total + movimiento.puntos, 0);

    return {
      ...ticket,
      horasTrabajadas,
      puntosConsumidos,
      tarifaSugerida: sugerirTarifa(horasTrabajadas),
      // El frontend pinta un botón por cada destino que el usuario puede
      // ejecutar desde el estado actual. Así la regla vive en un solo lugar.
      acciones: destinosDisponibles(transiciones, ticket.estado.clave, usuario.permisos),
    };
  }

  async asignar(id: string, datos: AsignarTicketDto, usuario: UsuarioAutenticado) {
    const ticket = await this.obtener(id, usuario);

    if (ticket.estado.esFinal) {
      throw new ConflictException('No se puede asignar un ticket cerrado');
    }

    const asesorId = datos.asesorId ?? (await this.asesorConMenorCarga());

    if (asesorId === null) {
      throw new ConflictException('No hay asesores activos para asignar el ticket');
    }

    const asesor = await this.prisma.asesor.findUnique({
      where: { id: asesorId },
      include: { usuario: { select: { nombres: true, apellidos: true } } },
    });

    if (asesor === null || !asesor.activo) {
      throw new NotFoundException('El asesor no existe o no está activo');
    }

    // Solo un ticket abierto cambia de estado al asignarse. Si ya estaba en
    // atención, cambiar el asesor es una reasignación y el estado se conserva.
    const cambiaEstado = ticket.estado.clave === 'abierto';

    if (cambiaEstado) {
      this.verificar(await this.transiciones(), ticket.estado.clave, 'asignado', usuario);
    }

    const actual = await this.estadoPorClave(ticket.estado.clave);
    const asignado = cambiaEstado ? await this.estadoPorClave('asignado') : null;
    const nombre = `${asesor.usuario.nombres} ${asesor.usuario.apellidos}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { asesorId: asesor.id, ...(asignado === null ? {} : { estadoId: asignado.id }) },
      });

      await tx.ticketHistorial.create({
        data: {
          ticketId: ticket.id,
          estadoAnteriorId: actual.id,
          estadoNuevoId: asignado?.id ?? actual.id,
          usuarioId: usuario.id,
          comentario: `${datos.asesorId === undefined ? 'Asignación automática' : 'Asignado'} a ${nombre}`,
        },
      });

      await this.auditar(tx, usuario.id, ticket.id, 'ASIGNAR', { asesorId: ticket.asesor?.id ?? null }, { asesorId: asesor.id });
    });

    return this.obtener(id, usuario);
  }

  async cambiarEstado(id: string, datos: CambiarEstadoTicketDto, usuario: UsuarioAutenticado) {
    const ticket = await this.obtener(id, usuario);
    this.verificar(await this.transiciones(), ticket.estado.clave, datos.estado, usuario);

    if (datos.estado === 'en_atencion' && ticket.asesor === null) {
      throw new ConflictException('Asigna un asesor antes de iniciar la atención');
    }

    if (datos.estado === 'reabierto' && (datos.comentario ?? '').trim() === '') {
      throw new BadRequestException('Reabrir un ticket exige explicar el motivo');
    }

    await this.moverEstado(ticket, datos.estado, usuario, datos.comentario, async (tx) => {
      if (datos.estado === 'reabierto') {
        await tx.ticket.update({ where: { id: ticket.id }, data: { resueltoEn: null, cerradoEn: null } });
      }
    });

    return this.obtener(id, usuario);
  }

  async resolver(id: string, datos: ResolverTicketDto, usuario: UsuarioAutenticado) {
    const ticket = await this.obtener(id, usuario);
    this.verificar(await this.transiciones(), ticket.estado.clave, 'resuelto', usuario);

    // Sin actividades no hay horas, y sin horas no hay forma de justificar los
    // puntos que se descontarán al cerrar.
    if (ticket.actividades.length === 0) {
      throw new ConflictException('Registra al menos una actividad con sus horas antes de resolver');
    }

    await this.moverEstado(ticket, 'resuelto', usuario, datos.tipoSolucion, async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          tipoSolucion: datos.tipoSolucion,
          descripcionSolucion: datos.descripcionSolucion.trim(),
          resueltoEn: new Date(),
        },
      });
    });

    return this.obtener(id, usuario);
  }

  // El cierre y el descuento de puntos ocurren en la misma transacción. Si el
  // motor de consumo falla —por ejemplo, porque la empresa superó el tope de
  // descubierto— el ticket no queda cerrado sin cobrar.
  async cerrar(id: string, datos: CerrarTicketDto, usuario: UsuarioAutenticado) {
    const ticket = await this.obtener(id, usuario);
    this.verificar(await this.transiciones(), ticket.estado.clave, 'cerrado', usuario);

    const claveTarifa = datos.tarifa ?? ticket.tarifaSugerida;
    const tarifa = await this.prisma.tarifaServicio.findUnique({ where: { clave: claveTarifa } });

    if (tarifa === null || !tarifa.activo) {
      throw new NotFoundException(`No existe la tarifa "${claveTarifa}"`);
    }

    // Un ticket reabierto y vuelto a cerrar no cobra otra vez: la reapertura
    // es garantía sobre un servicio que ya se pagó.
    const yaCobrado = ticket.movimientos.some((m) => m.tipo === 'CONSUMO' || m.tipo === 'DESCUBIERTO');
    let consumo: ResultadoConsumo | null = null;

    await this.moverEstado(ticket, 'cerrado', usuario, datos.comentario ?? `Cerrado con ${tarifa.nombre}`, async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { cerradoEn: new Date(), tarifaAplicadaId: tarifa.id },
      });

      if (!yaCobrado) {
        consumo = await this.consumo.consumirEn(tx, {
          empresaId: ticket.empresaId,
          costo: tarifa.puntos,
          descripcion: `Ticket ${ticket.codigo} — ${tarifa.nombre}`,
          ticketId: ticket.id,
          registradoPorId: usuario.id,
        });
      }
    });

    return { ticket: await this.obtener(id, usuario), consumo, cobradoAntes: yaCobrado };
  }

  async registrarActividad(id: string, datos: ActividadDto, usuario: UsuarioAutenticado) {
    const ticket = await this.obtener(id, usuario);

    if (!['asignado', 'en_atencion', 'en_espera_cliente', 'reabierto'].includes(ticket.estado.clave)) {
      throw new ConflictException(`No se registran actividades en un ticket "${ticket.estado.nombre}"`);
    }

    // Quien registra es el asesor que trabajó. Si lo hace el coordinador, la
    // actividad se atribuye al asesor asignado al caso.
    const propio = await this.prisma.asesor.findUnique({ where: { usuarioId: usuario.id } });
    const asesorId = propio?.id ?? ticket.asesor?.id;

    if (asesorId === undefined) {
      throw new ConflictException('El ticket no tiene un asesor asignado');
    }

    await this.prisma.$transaction(async (tx) => {
      const actividad = await tx.ticketActividad.create({
        data: {
          ticketId: ticket.id,
          asesorId,
          descripcion: datos.descripcion.trim(),
          horas: datos.horas,
          fecha: datos.fecha === undefined ? new Date() : new Date(datos.fecha),
        },
      });

      await this.auditar(tx, usuario.id, ticket.id, 'REGISTRAR_ACTIVIDAD', null, {
        actividadId: actividad.id,
        horas: datos.horas,
      });
    });

    return this.obtener(id, usuario);
  }

  async subirAdjunto(id: string, archivo: ArchivoSubido | undefined, usuario: UsuarioAutenticado) {
    if (archivo === undefined) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const ticket = await this.obtener(id, usuario);

    if (ticket.estado.esFinal) {
      throw new ConflictException('No se adjuntan evidencias a un ticket cerrado');
    }

    const maxMb = this.config.getOrThrow<number>('subidas.maxMb');
    const error = validarAdjunto(archivo.mimetype, archivo.size, maxMb);

    if (error !== null) {
      throw new BadRequestException(error);
    }

    // El archivo se guarda con un nombre generado, nunca con el original: un
    // nombre como "../../main.js" no debe poder escribir fuera de la carpeta.
    const carpeta = resolve(this.config.getOrThrow<string>('subidas.directorio'), 'tickets', ticket.id);
    const nombreEnDisco = `${randomUUID()}.${TIPOS_PERMITIDOS[archivo.mimetype]}`;

    await mkdir(carpeta, { recursive: true });
    await writeFile(join(carpeta, nombreEnDisco), archivo.buffer);

    await this.prisma.$transaction(async (tx) => {
      await tx.adjunto.create({
        data: {
          ticketId: ticket.id,
          nombreArchivo: archivo.originalname.slice(0, 200),
          ruta: join('tickets', ticket.id, nombreEnDisco),
          tipoMime: archivo.mimetype,
          tamanoBytes: archivo.size,
          subidoPorId: usuario.id,
        },
      });

      if (usuario.ambito === 'EMPRESA' && tieneEvidenciaCompleta(ticket.descripcion, ticket.adjuntos.length + 1)) {
        await this.fidelizacion.otorgarEn(tx, {
          empresaId: ticket.empresaId,
          evento: 'TICKET_CON_EVIDENCIA',
          ticketId: ticket.id,
        });
      }
    });

    return this.obtener(id, usuario);
  }

  async adjunto(id: string, adjuntoId: string, usuario: UsuarioAutenticado) {
    const ticket = await this.obtener(id, usuario);
    const adjunto = await this.prisma.adjunto.findFirst({ where: { id: adjuntoId, ticketId: ticket.id } });

    const ruta = adjunto === null ? null : resolve(this.config.getOrThrow<string>('subidas.directorio'), adjunto.ruta);

    if (adjunto === null || ruta === null || !existsSync(ruta)) {
      throw new NotFoundException('El archivo no existe o ya no está disponible en el servidor');
    }

    return {
      ruta,
      nombre: adjunto.nombreArchivo,
      tipoMime: adjunto.tipoMime,
    };
  }

  async responderEncuesta(id: string, datos: EncuestaDto, usuario: UsuarioAutenticado) {
    const ticket = await this.obtener(id, usuario);

    if (usuario.ambito !== 'EMPRESA') {
      throw new ForbiddenException('La encuesta de satisfacción la responde el cliente');
    }

    if (!['resuelto', 'cerrado'].includes(ticket.estado.clave)) {
      throw new ConflictException('La encuesta se responde cuando el ticket ya fue resuelto');
    }

    if (ticket.encuesta !== null) {
      throw new ConflictException('La encuesta de este ticket ya fue respondida');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.encuestaTicket.create({
        data: {
          ticketId: ticket.id,
          calificacion: datos.calificacion,
          comentario: datos.comentario?.trim() || null,
        },
      });

      await this.fidelizacion.otorgarEn(tx, {
        empresaId: ticket.empresaId,
        evento: 'ENCUESTA_RESPONDIDA',
        ticketId: ticket.id,
      });

      await this.auditar(tx, usuario.id, ticket.id, 'ENCUESTA', null, { calificacion: datos.calificacion });
    });

    return this.obtener(id, usuario);
  }

  // Indicadores de satisfacción: promedio de calificación y distribución.
  // Alimentan el reporte de calificación de clientes en el panel.
  async satisfaccion(usuario: UsuarioAutenticado, empresaId?: string) {
    const alcance = this.alcance(usuario, empresaId);
    const encuestas = await this.prisma.encuestaTicket.findMany({
      where: { ticket: alcance },
      select: { calificacion: true },
    });

    const distribucion = [1, 2, 3, 4, 5].map((valor) => ({
      calificacion: valor,
      cantidad: encuestas.filter((encuesta) => encuesta.calificacion === valor).length,
    }));

    const promedio =
      encuestas.length === 0
        ? null
        : Math.round((encuestas.reduce((total, e) => total + e.calificacion, 0) / encuestas.length) * 10) / 10;

    return { respondidas: encuestas.length, promedio, distribucion };
  }

  // Decide qué tickets puede ver el usuario. Es el equivalente, para tickets,
  // del aislamiento por empresa: un cliente nunca ve casos de otra empresa y,
  // si su perfil es de "propios", tampoco los de sus compañeros.
  private alcance(usuario: UsuarioAutenticado, empresaSolicitada?: string): Prisma.TicketWhereInput {
    if (usuario.ambito === 'EMPRESA') {
      const empresaId = empresaDelUsuario(usuario, empresaSolicitada);

      return usuario.permisos.includes('tickets.ver_empresa')
        ? { empresaId }
        : { empresaId, solicitanteId: usuario.id };
    }

    if (usuario.permisos.includes('tickets.ver_todos')) {
      return empresaSolicitada === undefined ? {} : { empresaId: empresaSolicitada };
    }

    return {
      asesor: { usuarioId: usuario.id },
      ...(empresaSolicitada === undefined ? {} : { empresaId: empresaSolicitada }),
    };
  }

  private async moverEstado(
    ticket: { id: string; estado: { clave: string } },
    destino: string,
    usuario: UsuarioAutenticado,
    comentario: string | undefined,
    adicional: (tx: ClientePrisma) => Promise<void>,
  ) {
    const [anterior, nuevo] = await Promise.all([
      this.estadoPorClave(ticket.estado.clave),
      this.estadoPorClave(destino),
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({ where: { id: ticket.id }, data: { estadoId: nuevo.id } });

      await tx.ticketHistorial.create({
        data: {
          ticketId: ticket.id,
          estadoAnteriorId: anterior.id,
          estadoNuevoId: nuevo.id,
          usuarioId: usuario.id,
          comentario: comentario?.trim() || null,
        },
      });

      await adicional(tx);

      await this.auditar(tx, usuario.id, ticket.id, `ESTADO_${destino.toUpperCase()}`, { estado: anterior.clave }, { estado: nuevo.clave });
    });
  }

  private verificar(transiciones: Transicion[], desde: string, hasta: string, usuario: UsuarioAutenticado): void {
    const evaluacion = evaluarTransicion(transiciones, desde, hasta, usuario.permisos);

    if (!evaluacion.permitida) {
      throw evaluacion.motivo.includes('permiso')
        ? new ForbiddenException(evaluacion.motivo)
        : new ConflictException(evaluacion.motivo);
    }
  }

  private async transiciones(): Promise<Transicion[]> {
    const filas = await this.prisma.transicionTicket.findMany({
      include: { desdeEstado: { select: { clave: true } }, hastaEstado: { select: { clave: true } } },
    });

    return filas.map((fila) => ({
      desde: fila.desdeEstado.clave,
      hasta: fila.hastaEstado.clave,
      permiso: fila.permisoRequerido,
    }));
  }

  private async asesorConMenorCarga(): Promise<string | null> {
    const asesores = await this.prisma.asesor.findMany({
      where: { activo: true, usuario: { activo: true } },
      select: {
        id: true,
        _count: { select: { tickets: { where: { estado: { esFinal: false } } } } },
      },
    });

    return elegirAsesorConMenorCarga(asesores.map((a) => ({ asesorId: a.id, abiertos: a._count.tickets })));
  }

  private async siguienteCodigo(tx: ClientePrisma, anio: number): Promise<string> {
    const cuantos = await tx.ticket.count({
      where: { abiertoEn: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } },
    });

    return componerCodigoTicket(anio, cuantos + 1);
  }

  private async estadoPorClave(clave: string) {
    const estado = await this.prisma.estadoTicket.findUnique({ where: { clave } });

    if (estado === null) {
      throw new NotFoundException(`No existe el estado de ticket "${clave}". Ejecuta npm run db:seed.`);
    }

    return estado;
  }

  private auditar(
    tx: ClientePrisma,
    usuarioId: string,
    ticketId: string,
    accion: string,
    anteriores: Prisma.InputJsonValue | null,
    nuevos: Prisma.InputJsonValue,
  ) {
    return tx.registroAuditoria.create({
      data: {
        usuarioId,
        entidad: 'ticket',
        entidadId: ticketId,
        accion,
        ...(anteriores === null ? {} : { datosAnteriores: anteriores }),
        datosNuevos: nuevos,
      },
    });
  }

  private resumen() {
    return {
      id: true,
      codigo: true,
      titulo: true,
      prioridad: true,
      abiertoEn: true,
      cerradoEn: true,
      empresa: { select: { id: true, razonSocial: true } },
      solicitante: { select: { nombres: true, apellidos: true } },
      asesor: { select: { id: true, usuario: { select: { nombres: true, apellidos: true } } } },
      categoria: { select: { clave: true, nombre: true } },
      estado: { select: { clave: true, nombre: true, esFinal: true } },
      _count: { select: { adjuntos: true, actividades: true } },
    } satisfies Prisma.TicketSelect;
  }
}
