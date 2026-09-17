import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CorreoService } from '../../../shared/correo/correo.service.js';
import { hashPassword } from '../../auth/domain/password.js';
import { generarPasswordTemporal } from '../domain/credenciales.js';
import type { ActualizarEmpresaDto } from '../presentation/dto/actualizar-empresa.dto.js';
import type { CrearEmpresaDto } from '../presentation/dto/crear-empresa.dto.js';

const PERFIL_ADMIN_EMPRESA = 'Administrador de empresa cliente';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
  ) {}

  // No hay registro público ni pasarela de pago: Innovasoft habilita a la
  // empresa cliente y le entrega las credenciales. Por eso la cuenta nace ya
  // verificada —quien la creó confirmó al cliente por otro canal— pero con la
  // obligación de cambiar la contraseña, que es lo que impide que la temporal
  // circule indefinidamente.
  async habilitar(datos: CrearEmpresaDto, creadaPorId: string) {
    const email = datos.emailAdministrador.toLowerCase();

    const [nitOcupado, emailOcupado] = await Promise.all([
      this.prisma.empresa.findUnique({ where: { nit: datos.nit } }),
      this.prisma.usuario.findUnique({ where: { email } }),
    ]);

    if (nitOcupado !== null) {
      throw new ConflictException('Ya hay una empresa registrada con ese NIT');
    }

    if (emailOcupado !== null) {
      throw new ConflictException('Ya hay una cuenta registrada con ese correo');
    }

    const perfil = await this.prisma.perfil.findUnique({ where: { nombre: PERFIL_ADMIN_EMPRESA } });

    if (perfil === null) {
      throw new InternalServerErrorException(
        'Los perfiles iniciales no están cargados. Ejecuta npm run db:seed.',
      );
    }

    const passwordTemporal = generarPasswordTemporal();
    const passwordHash = await hashPassword(passwordTemporal);

    const creada = await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nit: datos.nit,
          razonSocial: datos.razonSocial,
          direccion: datos.direccion ?? null,
          telefono: datos.telefono ?? null,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          empresaId: empresa.id,
          perfilId: perfil.id,
          nombres: datos.nombresAdministrador,
          apellidos: datos.apellidosAdministrador,
          email,
          passwordHash,
          emailVerificado: true,
          debeCambiarPassword: true,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          usuarioId: creadaPorId,
          entidad: 'empresa_cliente',
          entidadId: empresa.id,
          accion: 'HABILITAR',
          datosNuevos: { nit: empresa.nit, razonSocial: empresa.razonSocial, administrador: email },
        },
      });

      return { empresa, usuario };
    });

    this.correo.enviarCredenciales(email, creada.empresa.razonSocial, passwordTemporal);

    return {
      empresaId: creada.empresa.id,
      usuarioId: creada.usuario.id,
      razonSocial: creada.empresa.razonSocial,
      emailAdministrador: email,
      mensaje:
        'Empresa habilitada. Las credenciales de acceso se enviaron al correo del administrador.',
    };
  }

  listar() {
    return this.prisma.empresa.findMany({
      orderBy: { razonSocial: 'asc' },
      select: {
        id: true,
        nit: true,
        razonSocial: true,
        direccion: true,
        telefono: true,
        activa: true,
        createdAt: true,
        _count: { select: { usuarios: true, tickets: true } },
      },
    });
  }

  async obtener(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        nit: true,
        razonSocial: true,
        direccion: true,
        telefono: true,
        activa: true,
        createdAt: true,
        usuarios: {
          where: { activo: true },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
            perfil: { select: { nombre: true } },
          },
        },
      },
    });

    if (empresa === null) {
      throw new NotFoundException('La empresa no existe');
    }

    return empresa;
  }

  async actualizar(empresaId: string, datos: ActualizarEmpresaDto, usuarioId: string) {
    const anterior = await this.prisma.empresa.findUnique({ where: { id: empresaId } });

    if (anterior === null) {
      throw new NotFoundException('La empresa no existe');
    }

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.update({
        where: { id: empresaId },
        data: {
          razonSocial: datos.razonSocial ?? anterior.razonSocial,
          direccion: datos.direccion ?? anterior.direccion,
          telefono: datos.telefono ?? anterior.telefono,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          usuarioId,
          entidad: 'empresa_cliente',
          entidadId: empresaId,
          accion: 'EDITAR',
          datosAnteriores: {
            razonSocial: anterior.razonSocial,
            direccion: anterior.direccion,
            telefono: anterior.telefono,
          },
          datosNuevos: {
            razonSocial: empresa.razonSocial,
            direccion: empresa.direccion,
            telefono: empresa.telefono,
          },
        },
      });

      return empresa;
    });
  }

  // Desactivar no borra: el historial de tickets, citas y movimientos de una
  // empresa tiene que seguir existiendo aunque deje de ser cliente.
  async desactivar(empresaId: string, usuarioId: string) {
    await this.obtener(empresaId);

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.update({
        where: { id: empresaId },
        data: { activa: false },
      });

      await tx.usuario.updateMany({ where: { empresaId }, data: { activo: false } });

      await tx.registroAuditoria.create({
        data: {
          usuarioId,
          entidad: 'empresa_cliente',
          entidadId: empresaId,
          accion: 'DESACTIVAR',
          datosNuevos: { activa: false },
        },
      });

      return { id: empresa.id, activa: empresa.activa };
    });
  }
}
