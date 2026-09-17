import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CorreoService } from '../../../shared/correo/correo.service.js';
import { generarPasswordTemporal } from '../../../shared/seguridad/credenciales.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { hashPassword } from '../../auth/domain/password.js';
import type { CrearUsuarioDto } from '../presentation/dto/crear-usuario.dto.js';

const PERFIL_ASESOR = 'Asesor';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
  ) {}

  listarPerfiles() {
    return this.prisma.perfil.findMany({
      orderBy: { nombre: 'asc' },
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
}
