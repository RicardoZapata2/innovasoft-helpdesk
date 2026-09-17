import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { ConsumoPuntosService } from '../../puntos/application/consumo-puntos.service.js';
import { calcularFranjasLibres, estaDentroDelPlazo, seSolapan } from '../domain/agenda.js';
import { componerCodigoCita } from '../domain/codigo-cita.js';
import { permisoDeTransicion, transicionPermitida } from '../domain/estados-cita.js';
import type { ClaveEstadoCita } from '../domain/estados-cita.js';
import type { CambiarEstadoDto } from '../presentation/dto/cambiar-estado.dto.js';
import type { ConsultaFranjasDto } from '../presentation/dto/consulta-franjas.dto.js';
import type { ConsultaCitasDto } from '../presentation/dto/consulta-citas.dto.js';
import type { CrearCitaDto } from '../presentation/dto/crear-cita.dto.js';
import type { ReprogramarCitaDto } from '../presentation/dto/reprogramar-cita.dto.js';

type ClientePrisma = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class CitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly consumo: ConsumoPuntosService,
  ) {}

  async franjasDisponibles(consulta: ConsultaFranjasDto) {
    const asesor = await this.prisma.asesor.findUnique({
      where: { id: consulta.asesorId },
      include: { disponibilidad: true, usuario: { select: { nombres: true, apellidos: true } } },
    });

    if (asesor === null || !asesor.activo) {
      throw new NotFoundException('El asesor no existe o no está activo');
    }

    const dia = new Date(`${consulta.fecha}T00:00:00`);
    const finDia = new Date(dia);
    finDia.setHours(23, 59, 59, 999);

    const ocupadas = await this.prisma.cita.findMany({
      where: {
        asesorId: asesor.id,
        inicioEn: { gte: dia, lte: finDia },
        estado: { clave: { notIn: ['cancelada', 'no_asistida'] } },
      },
      select: { inicioEn: true, finEn: true },
    });

    const duracion = consulta.duracionMinutos ?? this.duracionPorDefecto();

    return {
      asesor: `${asesor.usuario.nombres} ${asesor.usuario.apellidos}`,
      fecha: consulta.fecha,
      duracionMinutos: duracion,
      franjas: calcularFranjasLibres(
        dia,
        asesor.disponibilidad.map((franja) => ({
          diaSemana: franja.diaSemana,
          horaInicio: franja.horaInicio,
          horaFin: franja.horaFin,
        })),
        ocupadas.map((cita) => ({ inicio: cita.inicioEn, fin: cita.finEn })),
        duracion,
      ),
    };
  }

  async crear(empresaId: string, datos: CrearCitaDto, solicitanteId: string) {
    const duracion = datos.duracionMinutos ?? this.duracionPorDefecto();
    const inicioEn = new Date(datos.inicioEn);
    const finEn = new Date(inicioEn.getTime() + duracion * 60 * 1000);

    if (inicioEn.getTime() <= Date.now()) {
      throw new BadRequestException('No se puede agendar una cita en el pasado');
    }

    const [asesor, modalidad, estadoInicial] = await Promise.all([
      this.prisma.asesor.findUnique({ where: { id: datos.asesorId } }),
      this.prisma.modalidad.findUnique({
        where: { clave: datos.modalidad },
        include: { tarifaPorDefecto: true },
      }),
      this.prisma.estadoCita.findUnique({ where: { clave: 'solicitada' } }),
    ]);

    if (asesor === null || !asesor.activo) {
      throw new NotFoundException('El asesor no existe o no está activo');
    }

    if (modalidad === null) {
      throw new NotFoundException(`No existe la modalidad "${datos.modalidad}"`);
    }

    if (estadoInicial === null) {
      throw new NotFoundException('Faltan los estados de cita. Ejecuta npm run db:seed.');
    }

    if (modalidad.clave === 'presencial' && (datos.direccion ?? '').trim() === '') {
      throw new BadRequestException('Una visita presencial necesita una dirección');
    }

    if (datos.ticketId !== undefined) {
      const ticket = await this.prisma.ticket.findUnique({ where: { id: datos.ticketId } });

      if (ticket === null || ticket.empresaId !== empresaId) {
        throw new NotFoundException('El ticket no existe o no pertenece a esta empresa');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await this.bloquearAgendaDelAsesor(tx, asesor.id);
      await this.verificarSinSolape(tx, asesor.id, { inicio: inicioEn, fin: finEn });

      return tx.cita.create({
        data: {
          codigo: await this.siguienteCodigo(tx, inicioEn.getFullYear()),
          empresaId,
          asesorId: asesor.id,
          solicitanteId,
          ticketId: datos.ticketId ?? null,
          modalidadId: modalidad.id,
          estadoId: estadoInicial.id,
          inicioEn,
          finEn,
          direccion: datos.direccion ?? null,
          enlace: datos.enlace ?? null,
          tarifaAplicadaId: modalidad.tarifaPorDefectoId,
        },
        include: this.detalle(),
      });
    });
  }

  async listar(usuario: UsuarioAutenticado, consulta: ConsultaCitasDto, empresaId?: string) {
    const pagina = consulta.pagina ?? 1;
    const tamano = consulta.tamano ?? 20;

    const filtro = {
      ...(empresaId === undefined ? {} : { empresaId }),
      ...(consulta.asesorId === undefined ? {} : { asesorId: consulta.asesorId }),
      ...(consulta.estado === undefined ? {} : { estado: { clave: consulta.estado } }),
      // "Propias" significa cosas distintas según quién pregunte: para el
      // usuario de una empresa, las citas que solicitó; para un asesor, las que
      // tiene asignadas. Ambas caben en el mismo filtro.
      ...(usuario.permisos.includes('citas.ver_todas') ||
      usuario.permisos.includes('citas.ver_empresa')
        ? {}
        : { OR: [{ solicitanteId: usuario.id }, { asesor: { usuarioId: usuario.id } }] }),
      ...(consulta.desde === undefined && consulta.hasta === undefined
        ? {}
        : {
            inicioEn: {
              ...(consulta.desde === undefined ? {} : { gte: new Date(consulta.desde) }),
              ...(consulta.hasta === undefined ? {} : { lte: new Date(consulta.hasta) }),
            },
          }),
    };

    const [total, citas] = await Promise.all([
      this.prisma.cita.count({ where: filtro }),
      this.prisma.cita.findMany({
        where: filtro,
        orderBy: { inicioEn: 'asc' },
        skip: (pagina - 1) * tamano,
        take: tamano,
        include: this.detalle(),
      }),
    ]);

    return { pagina, tamano, total, paginas: Math.max(1, Math.ceil(total / tamano)), citas };
  }

  async obtener(id: string, empresaId?: string) {
    const cita = await this.prisma.cita.findUnique({ where: { id }, include: this.detalle() });

    if (cita === null || (empresaId !== undefined && cita.empresaId !== empresaId)) {
      throw new NotFoundException('La cita no existe');
    }

    return cita;
  }

  async reprogramar(id: string, datos: ReprogramarCitaDto, usuario: UsuarioAutenticado, empresaId?: string) {
    const cita = await this.obtener(id, empresaId);
    const estadoActual = cita.estado.clave as ClaveEstadoCita;

    this.verificarTransicion(estadoActual, 'reprogramada', usuario);

    const duracion = Math.round((cita.finEn.getTime() - cita.inicioEn.getTime()) / 60000);
    const inicioEn = new Date(datos.inicioEn);
    const finEn = new Date(inicioEn.getTime() + duracion * 60 * 1000);

    if (inicioEn.getTime() <= Date.now()) {
      throw new BadRequestException('No se puede reprogramar una cita hacia el pasado');
    }

    const horasMinimas = this.config.getOrThrow<number>('citas.horasMinimasParaCambios');
    const dentroDelPlazo = estaDentroDelPlazo(cita.inicioEn, new Date(), horasMinimas);

    const estadoDestino = await this.estadoPorClave('reprogramada');

    return this.prisma.$transaction(async (tx) => {
      await this.bloquearAgendaDelAsesor(tx, cita.asesorId);
      await this.verificarSinSolape(tx, cita.asesorId, { inicio: inicioEn, fin: finEn }, cita.id);

      await tx.registroAuditoria.create({
        data: {
          usuarioId: usuario.id,
          entidad: 'cita',
          entidadId: cita.id,
          accion: dentroDelPlazo ? 'REPROGRAMAR' : 'REPROGRAMAR_FUERA_DE_PLAZO',
          datosAnteriores: { inicioEn: cita.inicioEn, finEn: cita.finEn },
          datosNuevos: { inicioEn, finEn, motivo: datos.motivo },
        },
      });

      return tx.cita.update({
        where: { id: cita.id },
        data: { inicioEn, finEn, estadoId: estadoDestino.id },
        include: this.detalle(),
      });
    });
  }

  // Un único método para todos los cambios de estado. La alternativa —un método
  // por transición— repetiría en cada uno la misma validación y dejaría la
  // tabla de transiciones implícita en el código.
  async cambiarEstado(
    id: string,
    destino: ClaveEstadoCita,
    datos: CambiarEstadoDto,
    usuario: UsuarioAutenticado,
    empresaId?: string,
  ) {
    const cita = await this.obtener(id, empresaId);
    const estadoActual = cita.estado.clave as ClaveEstadoCita;

    this.verificarTransicion(estadoActual, destino, usuario);

    if (destino === 'cancelada' && (datos.motivo ?? '').trim() === '') {
      throw new BadRequestException('Cancelar una cita exige indicar el motivo');
    }

    const estadoDestino = await this.estadoPorClave(destino);

    const actualizada = await this.prisma.$transaction(async (tx) => {
      await tx.registroAuditoria.create({
        data: {
          usuarioId: usuario.id,
          entidad: 'cita',
          entidadId: cita.id,
          accion: `ESTADO_${destino.toUpperCase()}`,
          datosAnteriores: { estado: estadoActual },
          datosNuevos: { estado: destino, motivo: datos.motivo ?? null },
        },
      });

      return tx.cita.update({
        where: { id: cita.id },
        data: {
          estadoId: estadoDestino.id,
          motivoCancelacion: destino === 'cancelada' ? (datos.motivo ?? null) : cita.motivoCancelacion,
        },
        include: this.detalle(),
      });
    });

    // El consumo ocurre después de cerrar la transacción del cambio de estado y
    // en la suya propia, porque el motor de puntos necesita bloquear las bolsas
    // de la empresa y anidar ese bloqueo dentro de otra transacción alargaría el
    // tiempo que las filas quedan retenidas.
    if (destino === 'realizada') {
      const consumo = await this.consumirPorCitaRealizada(actualizada, usuario.id);

      return { ...actualizada, consumo };
    }

    return actualizada;
  }

  private async consumirPorCitaRealizada(
    cita: { id: string; codigo: string; empresaId: string; tarifaAplicadaId: string | null; cubiertaPorCanjeId: string | null },
    usuarioId: string,
  ) {
    if (cita.cubiertaPorCanjeId !== null) {
      return { cubiertaPorRecompensa: true, puntos: 0 };
    }

    if (cita.tarifaAplicadaId === null) {
      return { cubiertaPorRecompensa: false, puntos: 0 };
    }

    const tarifa = await this.prisma.tarifaServicio.findUnique({ where: { id: cita.tarifaAplicadaId } });

    if (tarifa === null || tarifa.puntos <= 0) {
      return { cubiertaPorRecompensa: false, puntos: 0 };
    }

    const resultado = await this.consumo.consumir({
      empresaId: cita.empresaId,
      costo: tarifa.puntos,
      descripcion: `Cita ${cita.codigo} — ${tarifa.nombre}`,
      citaId: cita.id,
      registradoPorId: usuarioId,
    });

    return { cubiertaPorRecompensa: false, puntos: tarifa.puntos, ...resultado };
  }

  private verificarTransicion(desde: ClaveEstadoCita, hasta: ClaveEstadoCita, usuario: UsuarioAutenticado): void {
    if (!transicionPermitida(desde, hasta)) {
      throw new ConflictException(`Una cita en estado "${desde}" no puede pasar a "${hasta}"`);
    }

    const permiso = permisoDeTransicion(desde, hasta);

    if (permiso !== undefined && !usuario.permisos.includes(permiso)) {
      throw new ForbiddenException(`La operación exige el permiso ${permiso}`);
    }
  }

  // Bloquea la fila del asesor, no las citas: lo que hay que impedir es que dos
  // peticiones comprueben a la vez que una franja está libre y la ocupen las
  // dos. Un bloqueo sobre las citas existentes no serviría, porque la fila en
  // conflicto todavía no existe cuando se comprueba.
  private async bloquearAgendaDelAsesor(tx: ClientePrisma, asesorId: string): Promise<void> {
    // Los identificadores son columnas de texto, no del tipo uuid de
    // PostgreSQL: Prisma traduce así los campos String aunque su valor por
    // defecto sea un UUID. Convertir el parámetro rompería la comparación.
    await tx.$queryRaw`SELECT id FROM asesor WHERE id = ${asesorId} FOR UPDATE`;
  }

  private async verificarSinSolape(
    tx: ClientePrisma,
    asesorId: string,
    intervalo: { inicio: Date; fin: Date },
    excluirCitaId?: string,
  ): Promise<void> {
    const vecinas = await tx.cita.findMany({
      where: {
        asesorId,
        ...(excluirCitaId === undefined ? {} : { id: { not: excluirCitaId } }),
        estado: { clave: { notIn: ['cancelada', 'no_asistida'] } },
        inicioEn: { lt: intervalo.fin },
        finEn: { gt: intervalo.inicio },
      },
      select: { codigo: true, inicioEn: true, finEn: true },
    });

    const choque = vecinas.find((cita) => seSolapan(intervalo, { inicio: cita.inicioEn, fin: cita.finEn }));

    if (choque !== undefined) {
      throw new ConflictException(
        `El asesor ya tiene la cita ${choque.codigo} en ese horario`,
      );
    }
  }

  private async siguienteCodigo(tx: ClientePrisma, anio: number): Promise<string> {
    const desde = new Date(anio, 0, 1);
    const hasta = new Date(anio + 1, 0, 1);
    const cuantas = await tx.cita.count({ where: { createdAt: { gte: desde, lt: hasta } } });

    return componerCodigoCita(anio, cuantas + 1);
  }

  private async estadoPorClave(clave: ClaveEstadoCita) {
    const estado = await this.prisma.estadoCita.findUnique({ where: { clave } });

    if (estado === null) {
      throw new NotFoundException(`No existe el estado de cita "${clave}"`);
    }

    return estado;
  }

  private duracionPorDefecto(): number {
    return this.config.getOrThrow<number>('citas.duracionPorDefectoMinutos');
  }

  private detalle() {
    return {
      estado: { select: { clave: true, nombre: true, esFinal: true } },
      modalidad: { select: { clave: true, nombre: true } },
      tarifaAplicada: { select: { clave: true, nombre: true, puntos: true } },
      empresa: { select: { id: true, razonSocial: true } },
      asesor: { select: { id: true, usuario: { select: { nombres: true, apellidos: true, email: true } } } },
      solicitante: { select: { nombres: true, apellidos: true, email: true } },
    };
  }
}
