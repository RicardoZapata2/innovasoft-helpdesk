import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import type { CrearPerfilDto } from '../presentation/dto/crear-perfil.dto.js';
import type { PermisosDelPerfilDto } from '../presentation/dto/permisos-del-perfil.dto.js';

@Injectable()
export class PerfilesService {
  constructor(private readonly prisma: PrismaService) {}

  // El catálogo llega agrupado por módulo porque así es como se concede en la
  // práctica: "todo lo de citas" antes que permiso por permiso.
  async catalogoDePermisos() {
    const permisos = await this.prisma.permiso.findMany({
      orderBy: [{ modulo: 'asc' }, { accion: 'asc' }],
      select: { id: true, clave: true, modulo: true, accion: true, descripcion: true },
    });

    const modulos = new Map<string, typeof permisos>();

    for (const permiso of permisos) {
      modulos.set(permiso.modulo, [...(modulos.get(permiso.modulo) ?? []), permiso]);
    }

    return [...modulos.entries()].map(([modulo, lista]) => ({ modulo, permisos: lista }));
  }

  listar() {
    return this.prisma.perfil.findMany({
      orderBy: [{ ambito: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        ambito: true,
        esSistema: true,
        _count: { select: { permisos: true, usuarios: true } },
      },
    });
  }

  async obtener(perfilId: string) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { id: perfilId },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        ambito: true,
        esSistema: true,
        permisos: { select: { permiso: { select: { clave: true } } } },
        _count: { select: { usuarios: true } },
      },
    });

    if (perfil === null) {
      throw new NotFoundException('El perfil no existe');
    }

    return {
      ...perfil,
      permisos: perfil.permisos.map((asignacion) => asignacion.permiso.clave),
    };
  }

  async crear(datos: CrearPerfilDto, autor: UsuarioAutenticado) {
    if (await this.prisma.perfil.findUnique({ where: { nombre: datos.nombre } })) {
      throw new ConflictException('Ya existe un perfil con ese nombre');
    }

    const permisos = await this.resolver(datos.permisos ?? []);

    const perfil = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.perfil.create({
        data: {
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          ambito: datos.ambito,
          esSistema: false,
        },
      });

      if (permisos.length > 0) {
        await tx.perfilPermiso.createMany({
          data: permisos.map((permisoId) => ({ perfilId: creado.id, permisoId })),
        });
      }

      await tx.registroAuditoria.create({
        data: {
          usuarioId: autor.id,
          entidad: 'perfil',
          entidadId: creado.id,
          accion: 'CREAR',
          datosNuevos: { nombre: datos.nombre, permisos: datos.permisos ?? [] },
        },
      });

      return creado;
    });

    return this.obtener(perfil.id);
  }

  // Se reemplaza el conjunto completo en lugar de conceder y revocar uno a uno.
  // La pantalla envía el estado final de las casillas, que es lo que el
  // administrador ve; traducirlo a una lista de altas y bajas solo añadiría una
  // oportunidad de equivocarse.
  async reemplazarPermisos(perfilId: string, datos: PermisosDelPerfilDto, autor: UsuarioAutenticado) {
    const anterior = await this.obtener(perfilId);
    const permisos = await this.resolver(datos.permisos);

    await this.prisma.$transaction(async (tx) => {
      await tx.perfilPermiso.deleteMany({ where: { perfilId } });

      if (permisos.length > 0) {
        await tx.perfilPermiso.createMany({
          data: permisos.map((permisoId) => ({ perfilId, permisoId })),
        });
      }

      await tx.registroAuditoria.create({
        data: {
          usuarioId: autor.id,
          entidad: 'perfil',
          entidadId: perfilId,
          accion: 'ASIGNAR_PERMISOS',
          datosAnteriores: { permisos: anterior.permisos },
          datosNuevos: { permisos: datos.permisos },
        },
      });
    });

    return this.obtener(perfilId);
  }

  async eliminar(perfilId: string, autor: UsuarioAutenticado) {
    const perfil = await this.obtener(perfilId);

    if (perfil.esSistema) {
      throw new BadRequestException(
        'Los cinco perfiles iniciales no se pueden eliminar: el sistema los necesita para funcionar',
      );
    }

    if (perfil._count.usuarios > 0) {
      throw new ConflictException(
        `El perfil tiene ${perfil._count.usuarios} usuarios asignados. Muévelos a otro perfil primero.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.perfil.delete({ where: { id: perfilId } });

      await tx.registroAuditoria.create({
        data: {
          usuarioId: autor.id,
          entidad: 'perfil',
          entidadId: perfilId,
          accion: 'ELIMINAR',
          datosAnteriores: { nombre: perfil.nombre },
        },
      });
    });

    return { mensaje: `Perfil "${perfil.nombre}" eliminado` };
  }

  private async resolver(claves: string[]): Promise<string[]> {
    if (claves.length === 0) {
      return [];
    }

    const permisos = await this.prisma.permiso.findMany({
      where: { clave: { in: claves } },
      select: { id: true, clave: true },
    });

    const desconocidos = claves.filter(
      (clave) => !permisos.some((permiso) => permiso.clave === clave),
    );

    if (desconocidos.length > 0) {
      throw new BadRequestException(`Estos permisos no existen: ${desconocidos.join(', ')}`);
    }

    return permisos.map((permiso) => permiso.id);
  }
}
