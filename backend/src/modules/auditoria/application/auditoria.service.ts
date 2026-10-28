import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { ConsultaAuditoriaDto } from '../presentation/dto/consulta-auditoria.dto.js';

// La bitácora solo se lee: ningún endpoint la modifica ni la borra. Cada módulo
// escribe en ella dentro de la misma transacción de la operación que registra.
@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(consulta: ConsultaAuditoriaDto) {
    const pagina = consulta.pagina ?? 1;
    const tamano = consulta.tamano ?? 25;

    const filtro = {
      ...(consulta.entidad === undefined || consulta.entidad === '' ? {} : { entidad: consulta.entidad }),
      ...(consulta.accion === undefined || consulta.accion === ''
        ? {}
        : { accion: { contains: consulta.accion.toUpperCase() } }),
      ...(consulta.desde === undefined && consulta.hasta === undefined
        ? {}
        : {
            createdAt: {
              ...(consulta.desde === undefined ? {} : { gte: new Date(consulta.desde) }),
              ...(consulta.hasta === undefined ? {} : { lte: new Date(`${consulta.hasta.slice(0, 10)}T23:59:59.999`) }),
            },
          }),
    };

    const [total, registros, entidades] = await Promise.all([
      this.prisma.registroAuditoria.count({ where: filtro }),
      this.prisma.registroAuditoria.findMany({
        where: filtro,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * tamano,
        take: tamano,
        select: {
          id: true,
          entidad: true,
          entidadId: true,
          accion: true,
          datosAnteriores: true,
          datosNuevos: true,
          createdAt: true,
          usuario: { select: { nombres: true, apellidos: true, email: true } },
        },
      }),
      this.prisma.registroAuditoria.groupBy({ by: ['entidad'], orderBy: { entidad: 'asc' } }),
    ]);

    return {
      pagina,
      tamano,
      total,
      paginas: Math.max(1, Math.ceil(total / tamano)),
      entidades: entidades.map((fila) => fila.entidad),
      registros,
    };
  }
}
