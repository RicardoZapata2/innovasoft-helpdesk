import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  ActualizarRecompensaDto,
  ActualizarReglaDto,
  RecompensaDto,
} from '../presentation/dto/catalogo-fidelizacion.dto.js';

// Límites del campo "valor", que significa cosas distintas según el tipo: un
// porcentaje de descuento, una cantidad de puntos de servicio o un número de
// servicios cubiertos.
const LIMITES_VALOR: Record<RecompensaDto['tipo'], { maximo: number; mensaje: string }> = {
  DESCUENTO_RENOVACION: { maximo: 50, mensaje: 'Un descuento no puede pasar del 50 %' },
  RECARGA_PUNTOS: { maximo: 500, mensaje: 'Una recarga no puede pasar de 500 puntos de servicio' },
  SERVICIO_SIN_CONSUMO: { maximo: 10, mensaje: 'Una recompensa cubre como máximo 10 servicios' },
};

@Injectable()
export class CatalogoFidelizacionService {
  constructor(private readonly prisma: PrismaService) {}

  listarRecompensas() {
    return this.prisma.recompensa.findMany({
      orderBy: [{ activa: 'desc' }, { costoPuntos: 'asc' }],
      include: { _count: { select: { canjes: true } } },
    });
  }

  async crearRecompensa(datos: RecompensaDto, usuarioId: string) {
    this.validarValor(datos.tipo, datos.valor);

    const recompensa = await this.prisma.recompensa.create({
      data: {
        clave: datos.clave,
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim(),
        costoPuntos: datos.costoPuntos,
        tipo: datos.tipo,
        valor: new Prisma.Decimal(datos.valor),
        diasVigenciaBeneficio: datos.diasVigenciaBeneficio ?? null,
        activa: datos.activa ?? true,
      },
    });

    await this.auditar(usuarioId, 'recompensa', recompensa.id, 'CREAR', null, recompensa);

    return recompensa;
  }

  // Editar una recompensa no cambia los canjes ya hechos: cada canje guarda su
  // fecha de vencimiento y el beneficio se aplica con lo pactado al canjear.
  async actualizarRecompensa(id: string, datos: ActualizarRecompensaDto, usuarioId: string) {
    const actual = await this.prisma.recompensa.findUnique({ where: { id } });

    if (actual === null) {
      throw new NotFoundException('La recompensa no existe');
    }

    this.validarValor(datos.tipo ?? actual.tipo, datos.valor ?? Number(actual.valor));

    const recompensa = await this.prisma.recompensa.update({
      where: { id },
      data: {
        ...(datos.clave === undefined ? {} : { clave: datos.clave }),
        ...(datos.nombre === undefined ? {} : { nombre: datos.nombre.trim() }),
        ...(datos.descripcion === undefined ? {} : { descripcion: datos.descripcion.trim() }),
        ...(datos.costoPuntos === undefined ? {} : { costoPuntos: datos.costoPuntos }),
        ...(datos.tipo === undefined ? {} : { tipo: datos.tipo }),
        ...(datos.valor === undefined ? {} : { valor: new Prisma.Decimal(datos.valor) }),
        ...(datos.diasVigenciaBeneficio === undefined ? {} : { diasVigenciaBeneficio: datos.diasVigenciaBeneficio }),
        ...(datos.activa === undefined ? {} : { activa: datos.activa }),
      },
    });

    await this.auditar(usuarioId, 'recompensa', id, 'EDITAR', actual, recompensa);

    return recompensa;
  }

  listarReglas() {
    return this.prisma.reglaFidelizacion.findMany({
      orderBy: { puntos: 'asc' },
      include: { _count: { select: { movimientos: true } } },
    });
  }

  // Las reglas no se crean libremente: cada una responde a un evento que el
  // código sabe disparar (ticket con evidencia, encuesta, renovación). Lo que
  // se administra es cuánto vale y si está activa.
  async actualizarRegla(id: string, datos: ActualizarReglaDto, usuarioId: string) {
    const actual = await this.prisma.reglaFidelizacion.findUnique({ where: { id } });

    if (actual === null) {
      throw new NotFoundException('La regla no existe');
    }

    const regla = await this.prisma.reglaFidelizacion.update({
      where: { id },
      data: {
        ...(datos.nombre === undefined ? {} : { nombre: datos.nombre.trim() }),
        ...(datos.puntos === undefined ? {} : { puntos: datos.puntos }),
        ...(datos.activa === undefined ? {} : { activa: datos.activa }),
      },
    });

    await this.auditar(usuarioId, 'regla_fidelizacion', id, 'EDITAR', actual, regla);

    return regla;
  }

  private validarValor(tipo: RecompensaDto['tipo'], valor: number): void {
    const limite = LIMITES_VALOR[tipo];

    if (valor > limite.maximo) {
      throw new BadRequestException(limite.mensaje);
    }
  }

  private async auditar(
    usuarioId: string,
    entidad: string,
    entidadId: string,
    accion: string,
    anterior: object | null,
    nuevo: object,
  ): Promise<void> {
    await this.prisma.registroAuditoria.create({
      data: {
        usuarioId,
        entidad,
        entidadId,
        accion,
        ...(anterior === null ? {} : { datosAnteriores: JSON.parse(JSON.stringify(anterior)) as Prisma.InputJsonValue }),
        datosNuevos: JSON.parse(JSON.stringify(nuevo)) as Prisma.InputJsonValue,
      },
    });
  }
}
