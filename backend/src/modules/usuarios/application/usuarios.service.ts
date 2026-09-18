import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CorreoService } from '../../../shared/correo/correo.service.js';
import { generarPasswordTemporal } from '../../../shared/seguridad/credenciales.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { hashPassword } from '../../auth/domain/password.js';
import type { ActualizarUsuarioDto } from '../presentation/dto/actualizar-usuario.dto.js';
import type { CrearUsuarioDto } from '../presentation/dto/crear-usuario.dto.js';

const PERFIL_ASESOR = 'Asesor';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
  ) {}

  listar(empresaId?: string) {
    return this.prisma.usuario.findMany({
      where: empresaId === undefined ? {} : { empresaId },
      orderBy: [{ activo: 'desc' }, { nombres: 'asc' }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        activo: true,
        emailVerificado: true,
        debeCambiarPassword: true,
        perfil: { select: { nombre: true, ambito: true } },
        empresa: { select: { id: true, razonSocial: true } },
        asesor: { select: { id: true, especialidad: true } },
      },
    });
  }

  // Igual que con las empresas, los usuarios los crea alguien con permiso y se
  // les entrega una contraseña temporal. El ámbito del perfil decide si el
  // usuario pertenece a una empresa cliente o al personal de Innovasoft, y de
  // ahí sale su aislamiento.
  async crear(datos: CrearUsuarioDto, autor: UsuarioAutenticado) {
    const email = datos.email.toLowerCase();

    if ((await this.prisma.usuario.findUnique({ where: { email } })) !== null) {
      throw new ConflictException('Ya hay una cuenta registrada con ese correo');
    }

    const perfil = await this.prisma.perfil.findUnique({ where: { nombre: datos.perfil } });

    if (perfil === null) {
      throw new NotFoundException(`No existe el perfil "${datos.perfil}"`);
    }

    let empresaId: string | null = null;

    if (perfil.ambito === 'EMPRESA') {
      empresaId = autor.ambito === 'INNOVASOFT' ? (datos.empresaId ?? null) : autor.empresaId;

      if (empresaId === null) {
        throw new ConflictException('Un perfil de empresa cliente exige indicar la empresa');
      }

      if (autor.ambito === 'EMPRESA' && datos.empresaId !== undefined && datos.empresaId !== autor.empresaId) {
        throw new ForbiddenException('No puedes crear usuarios en otra empresa');
      }
    } else if (autor.ambito !== 'INNOVASOFT') {
      // Sin esta comprobación, el administrador de una empresa cliente podría
      // crearse a sí mismo un usuario con perfil de Innovasoft y saltarse el
      // aislamiento por completo.
      throw new ForbiddenException('Solo el personal de Innovasoft puede crear perfiles internos');
    }

    const passwordTemporal = generarPasswordTemporal();
    const passwordHash = await hashPassword(passwordTemporal);

    const creado = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          empresaId,
          perfilId: perfil.id,
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          email,
          passwordHash,
          emailVerificado: true,
          debeCambiarPassword: true,
        },
      });

      if (perfil.nombre === PERFIL_ASESOR) {
        await tx.asesor.create({
          data: { usuarioId: usuario.id, especialidad: datos.especialidad ?? null },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          usuarioId: autor.id,
          entidad: 'usuario',
          entidadId: usuario.id,
          accion: 'CREAR',
          datosNuevos: { email, perfil: perfil.nombre, empresaId },
        },
      });

      return usuario;
    });

    this.correo.enviarCredenciales(email, perfil.nombre, passwordTemporal);

    return {
      id: creado.id,
      email,
      perfil: perfil.nombre,
      empresaId,
      mensaje: 'Usuario creado. Las credenciales se enviaron a su correo.',
    };
  }

  async actualizar(usuarioId: string, datos: ActualizarUsuarioDto, autor: UsuarioAutenticado) {
    const usuario = await this.exigir(usuarioId, autor);

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          nombres: datos.nombres ?? usuario.nombres,
          apellidos: datos.apellidos ?? usuario.apellidos,
        },
      });

      if (datos.especialidad !== undefined && usuario.asesor !== null) {
        await tx.asesor.update({
          where: { id: usuario.asesor.id },
          data: { especialidad: datos.especialidad },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          usuarioId: autor.id,
          entidad: 'usuario',
          entidadId: usuarioId,
          accion: 'EDITAR',
          datosAnteriores: { nombres: usuario.nombres, apellidos: usuario.apellidos },
          datosNuevos: { nombres: actualizado.nombres, apellidos: actualizado.apellidos },
        },
      });

      return actualizado;
    });
  }

  // Desactivar en lugar de borrar, por lo mismo que con las empresas: los
  // tickets, las citas y los movimientos que registró ese usuario tienen que
  // seguir apuntando a alguien.
  async cambiarEstado(usuarioId: string, activo: boolean, autor: UsuarioAutenticado) {
    const usuario = await this.exigir(usuarioId, autor);

    if (usuarioId === autor.id && !activo) {
      throw new ConflictException('No puedes desactivar tu propia cuenta');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({ where: { id: usuarioId }, data: { activo } });

      if (usuario.asesor !== null) {
        await tx.asesor.update({ where: { id: usuario.asesor.id }, data: { activo } });
      }

      // Desactivar tiene que cortar el acceso ya, no cuando caduque el token.
      if (!activo) {
        await tx.sesionRefresh.updateMany({
          where: { usuarioId, revocadoEn: null },
          data: { revocadoEn: new Date() },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          usuarioId: autor.id,
          entidad: 'usuario',
          entidadId: usuarioId,
          accion: activo ? 'ACTIVAR' : 'DESACTIVAR',
          datosNuevos: { activo },
        },
      });

      return { id: actualizado.id, activo: actualizado.activo };
    });
  }

  async cambiarPerfil(usuarioId: string, nombrePerfil: string, autor: UsuarioAutenticado) {
    const usuario = await this.exigir(usuarioId, autor);
    const perfil = await this.prisma.perfil.findUnique({ where: { nombre: nombrePerfil } });

    if (perfil === null) {
      throw new NotFoundException(`No existe el perfil "${nombrePerfil}"`);
    }

    // El ámbito del perfil y la pertenencia a una empresa tienen que seguir
    // siendo coherentes: un usuario de empresa con perfil interno vería datos de
    // todas las empresas, y uno interno con perfil de empresa no vería ninguna.
    if (perfil.ambito === 'EMPRESA' && usuario.empresaId === null) {
      throw new ConflictException('Un usuario de Innovasoft no puede tener un perfil de empresa cliente');
    }

    if (perfil.ambito === 'INNOVASOFT' && usuario.empresaId !== null) {
      throw new ConflictException('Un usuario de empresa cliente no puede tener un perfil interno');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { perfilId: perfil.id },
        include: { perfil: { select: { nombre: true } } },
      });

      if (perfil.nombre === PERFIL_ASESOR && usuario.asesor === null) {
        await tx.asesor.create({ data: { usuarioId } });
      }

      // Cambiar el perfil cambia los permisos, y los permisos se leen de la base
      // en cada petición: con cerrar las sesiones basta para que el cambio tenga
      // efecto inmediato incluso si el usuario está conectado.
      await tx.sesionRefresh.updateMany({
        where: { usuarioId, revocadoEn: null },
        data: { revocadoEn: new Date() },
      });

      await tx.registroAuditoria.create({
        data: {
          usuarioId: autor.id,
          entidad: 'usuario',
          entidadId: usuarioId,
          accion: 'ASIGNAR_PERFIL',
          datosAnteriores: { perfil: usuario.perfil.nombre },
          datosNuevos: { perfil: perfil.nombre },
        },
      });

      return { id: actualizado.id, perfil: actualizado.perfil.nombre };
    });
  }

  private async exigir(usuarioId: string, autor: UsuarioAutenticado) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { asesor: true, perfil: { select: { nombre: true } } },
    });

    if (usuario === null) {
      throw new NotFoundException('El usuario no existe');
    }

    if (autor.ambito === 'EMPRESA' && usuario.empresaId !== autor.empresaId) {
      throw new ForbiddenException('No puedes administrar usuarios de otra empresa');
    }

    return usuario;
  }
}
