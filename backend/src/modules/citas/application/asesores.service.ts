import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { minutosDelDia } from '../domain/agenda.js';
import type { DisponibilidadDto } from '../presentation/dto/disponibilidad.dto.js';

@Injectable()
export class AsesoresService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.asesor.findMany({
      where: { activo: true },
      orderBy: { usuario: { nombres: 'asc' } },
      select: {
        id: true,
        especialidad: true,
        usuario: { select: { nombres: true, apellidos: true, email: true } },
        disponibilidad: {
          orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
          select: { diaSemana: true, horaInicio: true, horaFin: true },
        },
      },
    });
  }

  // La disponibilidad se reemplaza completa, no se parchea franja por franja.
  // Un horario es un conjunto coherente: permitir editar tramos sueltos
  // obligaría a validar los cruces entre lo viejo y lo nuevo en cada operación.
  async declararDisponibilidad(asesorId: string, datos: DisponibilidadDto) {
    const asesor = await this.prisma.asesor.findUnique({ where: { id: asesorId } });

    if (asesor === null) {
      throw new NotFoundException('El asesor no existe');
    }

    for (const franja of datos.franjas) {
      if (minutosDelDia(franja.horaFin) <= minutosDelDia(franja.horaInicio)) {
        throw new BadRequestException(
          `La franja del día ${franja.diaSemana} termina antes de empezar`,
        );
      }
    }

    const porDia = new Map<number, Array<{ desde: number; hasta: number }>>();

    for (const franja of datos.franjas) {
      const tramos = porDia.get(franja.diaSemana) ?? [];
      const nuevo = { desde: minutosDelDia(franja.horaInicio), hasta: minutosDelDia(franja.horaFin) };

      if (tramos.some((tramo) => nuevo.desde < tramo.hasta && tramo.desde < nuevo.hasta)) {
        throw new BadRequestException(
          `Hay dos tramos que se cruzan en el día ${franja.diaSemana}`,
        );
      }

      tramos.push(nuevo);
      porDia.set(franja.diaSemana, tramos);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.disponibilidadAsesor.deleteMany({ where: { asesorId } });

      await tx.disponibilidadAsesor.createMany({
        data: datos.franjas.map((franja) => ({
          asesorId,
          diaSemana: franja.diaSemana,
          horaInicio: franja.horaInicio,
          horaFin: franja.horaFin,
        })),
      });

      return tx.asesor.findUniqueOrThrow({
        where: { id: asesorId },
        select: {
          id: true,
          usuario: { select: { nombres: true, apellidos: true } },
          disponibilidad: {
            orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
            select: { diaSemana: true, horaInicio: true, horaFin: true },
          },
        },
      });
    });
  }
}
