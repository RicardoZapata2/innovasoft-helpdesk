import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { ActualizarPlanDto, ActualizarTarifaDto, PlanDto, TarifaDto } from '../presentation/dto/catalogo.dto.js';

// Administración del portafolio comercial. Los cambios no tocan lo ya vendido:
// una suscripción guarda el precio pagado y una bolsa sus puntos iniciales, así
// que editar un plan solo afecta las contrataciones que vengan después.
@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  listarPlanes() {
    return this.prisma.plan.findMany({
      orderBy: [{ activo: 'desc' }, { tipo: 'asc' }, { precio: 'asc' }],
      include: { _count: { select: { suscripciones: true } } },
    });
  }

  async crearPlan(datos: PlanDto, usuarioId: string) {
    const valores = this.validarPlan(datos);

    return this.guardar(usuarioId, 'plan', 'CREAR', null, () =>
      this.prisma.plan.create({ data: { ...valores, clave: datos.clave, activo: datos.activo ?? true } }),
    );
  }

  async actualizarPlan(id: string, datos: ActualizarPlanDto, usuarioId: string) {
    const actual = await this.prisma.plan.findUnique({ where: { id } });

    if (actual === null) {
      throw new NotFoundException('El plan no existe');
    }

    const combinado = {
      clave: datos.clave ?? actual.clave,
      nombre: datos.nombre ?? actual.nombre,
      descripcion: datos.descripcion ?? actual.descripcion,
      tipo: datos.tipo ?? actual.tipo,
      puntosIncluidos: datos.puntosIncluidos !== undefined ? datos.puntosIncluidos : actual.puntosIncluidos,
      esIlimitado: datos.esIlimitado ?? actual.esIlimitado,
      diasVigencia: datos.diasVigencia ?? actual.diasVigencia,
      precio: datos.precio ?? Number(actual.precio),
    };
    const valores = this.validarPlan(combinado);

    return this.guardar(usuarioId, 'plan', 'EDITAR', actual, () =>
      this.prisma.plan.update({
        where: { id },
        data: { ...valores, clave: combinado.clave, activo: datos.activo ?? actual.activo },
      }),
    );
  }

  listarTarifas() {
    return this.prisma.tarifaServicio.findMany({
      orderBy: [{ activo: 'desc' }, { puntos: 'asc' }],
      include: { modalidades: { select: { nombre: true } } },
    });
  }

  async crearTarifa(datos: TarifaDto, usuarioId: string) {
    return this.guardar(usuarioId, 'tarifa_servicio', 'CREAR', null, () =>
      this.prisma.tarifaServicio.create({
        data: { clave: datos.clave, nombre: datos.nombre.trim(), puntos: datos.puntos, activo: datos.activo ?? true },
      }),
    );
  }

  async actualizarTarifa(id: string, datos: ActualizarTarifaDto, usuarioId: string) {
    const actual = await this.prisma.tarifaServicio.findUnique({
      where: { id },
      include: { modalidades: { select: { nombre: true } } },
    });

    if (actual === null) {
      throw new NotFoundException('La tarifa no existe');
    }

    // Las citas toman su costo de la tarifa por defecto de su modalidad; si
    // esa tarifa se desactivara, agendar quedaría sin precio.
    if (datos.activo === false && actual.modalidades.length > 0) {
      throw new ConflictException(
        `No se puede desactivar: es la tarifa de las citas ${actual.modalidades.map((m) => m.nombre.toLowerCase()).join(' y ')}`,
      );
    }

    return this.guardar(usuarioId, 'tarifa_servicio', 'EDITAR', actual, () =>
      this.prisma.tarifaServicio.update({
        where: { id },
        data: {
          ...(datos.clave === undefined ? {} : { clave: datos.clave }),
          ...(datos.nombre === undefined ? {} : { nombre: datos.nombre.trim() }),
          ...(datos.puntos === undefined ? {} : { puntos: datos.puntos }),
          ...(datos.activo === undefined ? {} : { activo: datos.activo }),
        },
      }),
    );
  }

  private validarPlan(datos: Omit<PlanDto, 'clave' | 'activo'>) {
    if (!datos.esIlimitado && (datos.puntosIncluidos === undefined || datos.puntosIncluidos === null)) {
      throw new BadRequestException('Indica cuántos puntos incluye el plan, o márcalo como ilimitado');
    }

    return {
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion.trim(),
      tipo: datos.tipo,
      esIlimitado: datos.esIlimitado,
      puntosIncluidos: datos.esIlimitado ? null : datos.puntosIncluidos!,
      diasVigencia: datos.diasVigencia,
      precio: new Prisma.Decimal(datos.precio),
    };
  }

  // Cada cambio del catálogo queda en la bitácora con el valor anterior, para
  // poder responder después quién cambió un precio y cuánto valía antes.
  private async guardar<T extends { id: string }>(
    usuarioId: string,
    entidad: string,
    accion: string,
    anterior: object | null,
    operacion: () => Promise<T>,
  ): Promise<T> {
    // Una clave repetida la traduce a 409 el filtro global de excepciones.
    const resultado = await operacion();

    await this.prisma.registroAuditoria.create({
      data: {
        usuarioId,
        entidad,
        entidadId: resultado.id,
        accion,
        ...(anterior === null ? {} : { datosAnteriores: JSON.parse(JSON.stringify(anterior)) as Prisma.InputJsonValue }),
        datosNuevos: JSON.parse(JSON.stringify(resultado)) as Prisma.InputJsonValue,
      },
    });

    return resultado;
  }
}
