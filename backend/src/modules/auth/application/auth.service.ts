import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';
import { hashPassword, passwordCoincide } from '../domain/password.js';
import { enMinutos, enSegundos, generarToken, hashToken } from '../domain/tokens.js';
import { CorreoService } from '../../../shared/correo/correo.service.js';
import type { CambioPasswordDto } from '../presentation/dto/cambio-password.dto.js';
import type { LoginDto } from '../presentation/dto/login.dto.js';
import type { RecuperacionDto } from '../presentation/dto/recuperacion.dto.js';
import type { RegistroDto } from '../presentation/dto/registro.dto.js';
import type { RestablecerPasswordDto } from '../presentation/dto/restablecer-password.dto.js';

const VIGENCIA_RECUPERACION_MINUTOS = 60;
const VIGENCIA_VERIFICACION_MINUTOS = 24 * 60;
const PERFIL_ADMIN_EMPRESA = 'Administrador de empresa cliente';

type Sesion = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly correo: CorreoService,
  ) {}

  async login(datos: LoginDto): Promise<Sesion & { usuario: UsuarioAutenticado }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: datos.email.toLowerCase() },
      include: { perfil: { include: { permisos: { include: { permiso: true } } } } },
    });

    // El mismo mensaje para correo inexistente y contraseña equivocada: si
    // fueran distintos, la pantalla de login serviría para averiguar qué
    // correos están registrados.
    if (usuario === null || !usuario.activo) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    if (!(await passwordCoincide(usuario.passwordHash, datos.password))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    if (!usuario.emailVerificado) {
      throw new UnauthorizedException('La cuenta todavía no ha sido verificada');
    }

    const sesion = await this.emitirSesion(usuario.id);

    return {
      ...sesion,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        empresaId: usuario.empresaId,
        perfil: usuario.perfil.nombre,
        ambito: usuario.perfil.ambito,
        permisos: usuario.perfil.permisos.map((asignacion) => asignacion.permiso.clave),
        debeCambiarPassword: usuario.debeCambiarPassword,
      },
    };
  }

  // Registro público: una empresa se da de alta sola desde el sitio. Quien se
  // registra queda como administrador de su empresa, pero la cuenta no entra
  // hasta confirmar el correo. Así nadie puede abrir una cuenta a nombre de un
  // correo ajeno.
  async registrar(datos: RegistroDto) {
    const email = datos.email.toLowerCase();

    const [nitOcupado, emailOcupado, perfil] = await Promise.all([
      this.prisma.empresa.findUnique({ where: { nit: datos.nit } }),
      this.prisma.usuario.findUnique({ where: { email } }),
      this.prisma.perfil.findUnique({ where: { nombre: PERFIL_ADMIN_EMPRESA } }),
    ]);

    if (nitOcupado !== null) {
      throw new ConflictException('Ya hay una empresa registrada con ese NIT');
    }

    if (emailOcupado !== null) {
      throw new ConflictException('Ya hay una cuenta registrada con ese correo');
    }

    if (perfil === null) {
      throw new InternalServerErrorException('Los perfiles iniciales no están cargados. Ejecuta npm run db:seed.');
    }

    const passwordHash = await hashPassword(datos.password);
    const token = generarToken();

    await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: { nit: datos.nit, razonSocial: datos.razonSocial.trim() },
      });

      const usuario = await tx.usuario.create({
        data: {
          empresaId: empresa.id,
          perfilId: perfil.id,
          nombres: datos.nombres.trim(),
          apellidos: datos.apellidos.trim(),
          email,
          passwordHash,
        },
      });

      await tx.tokenUsuario.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          tipo: 'VERIFICACION_EMAIL',
          expiraEn: enMinutos(VIGENCIA_VERIFICACION_MINUTOS),
        },
      });

      await tx.registroAuditoria.create({
        data: {
          usuarioId: usuario.id,
          entidad: 'empresa_cliente',
          entidadId: empresa.id,
          accion: 'REGISTRO_PUBLICO',
          datosNuevos: { nit: empresa.nit, razonSocial: empresa.razonSocial, administrador: email },
        },
      });
    });

    const enlace = this.enlace('verificar-email', token);
    this.correo.enviarVerificacion(email, enlace);

    return {
      mensaje: 'Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.',
      ...this.enlaceVisible(enlace),
    };
  }

  async refrescar(refreshToken: string): Promise<Sesion> {
    let usuarioId: string;

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refrescoSecreto'),
      });
      usuarioId = payload.sub;
    } catch {
      throw new UnauthorizedException('La sesión expiró, vuelve a iniciar sesión');
    }

    const sesion = await this.prisma.sesionRefresh.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });

    if (sesion === null) {
      throw new UnauthorizedException('La sesión expiró, vuelve a iniciar sesión');
    }

    // Un token que ya fue rotado o revocado y vuelve a aparecer significa que
    // alguien tiene una copia. Ante la duda se cierran todas las sesiones del
    // usuario en lugar de solo rechazar esta petición.
    if (sesion.revocadoEn !== null || sesion.reemplazadoPor !== null) {
      await this.prisma.sesionRefresh.updateMany({
        where: { usuarioId, revocadoEn: null },
        data: { revocadoEn: new Date() },
      });

      throw new UnauthorizedException('La sesión fue cerrada por seguridad');
    }

    if (sesion.expiraEn.getTime() < Date.now()) {
      throw new UnauthorizedException('La sesión expiró, vuelve a iniciar sesión');
    }

    const nueva = await this.emitirSesion(usuarioId);

    await this.prisma.sesionRefresh.update({
      where: { id: sesion.id },
      data: { revocadoEn: new Date(), reemplazadoPor: hashToken(nueva.refreshToken) },
    });

    return nueva;
  }

  async cerrarSesion(refreshToken: string): Promise<{ mensaje: string }> {
    await this.prisma.sesionRefresh.updateMany({
      where: { tokenHash: hashToken(refreshToken), revocadoEn: null },
      data: { revocadoEn: new Date() },
    });

    return { mensaje: 'Sesión cerrada' };
  }

  async verificarEmail(token: string): Promise<{ mensaje: string }> {
    const registro = await this.consumirToken(token, 'VERIFICACION_EMAIL');

    await this.prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { emailVerificado: true },
    });

    return { mensaje: 'Cuenta verificada, ya puedes iniciar sesión' };
  }

  async solicitarRecuperacion(datos: RecuperacionDto): Promise<{ mensaje: string }> {
    const email = datos.email.toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    let enlace: string | null = null;

    if (usuario !== null && usuario.activo) {
      const token = generarToken();

      await this.prisma.tokenUsuario.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          tipo: 'RECUPERACION_PASSWORD',
          expiraEn: enMinutos(VIGENCIA_RECUPERACION_MINUTOS),
        },
      });

      enlace = this.enlace('restablecer-password', token);
      this.correo.enviarRecuperacion(email, enlace);
    }

    // La respuesta es la misma exista o no la cuenta, por el mismo motivo que
    // en el login.
    return {
      mensaje: 'Si el correo corresponde a una cuenta, recibirás las instrucciones',
      ...(enlace === null ? {} : this.enlaceVisible(enlace)),
    };
  }

  async restablecerPassword(datos: RestablecerPasswordDto): Promise<{ mensaje: string }> {
    const registro = await this.consumirToken(datos.token, 'RECUPERACION_PASSWORD');
    const passwordHash = await hashPassword(datos.password);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { passwordHash, debeCambiarPassword: false },
      }),
      this.prisma.sesionRefresh.updateMany({
        where: { usuarioId: registro.usuarioId, revocadoEn: null },
        data: { revocadoEn: new Date() },
      }),
    ]);

    return { mensaje: 'Contraseña actualizada, inicia sesión de nuevo' };
  }

  async cambiarPassword(usuarioId: string, datos: CambioPasswordDto): Promise<{ mensaje: string }> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });

    if (!(await passwordCoincide(usuario.passwordHash, datos.passwordActual))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    const passwordHash = await hashPassword(datos.passwordNueva);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { passwordHash, debeCambiarPassword: false },
      }),
      this.prisma.sesionRefresh.updateMany({
        where: { usuarioId, revocadoEn: null },
        data: { revocadoEn: new Date() },
      }),
    ]);

    return { mensaje: 'Contraseña actualizada, vuelve a iniciar sesión' };
  }

  private async emitirSesion(usuarioId: string): Promise<Sesion> {
    const refrescoSegundos = this.config.getOrThrow<number>('jwt.refrescoSegundos');

    const accessToken = await this.jwt.signAsync(
      { sub: usuarioId },
      {
        secret: this.config.getOrThrow<string>('jwt.accesoSecreto'),
        expiresIn: this.config.getOrThrow<number>('jwt.accesoSegundos'),
      },
    );

    // El identificador aleatorio no es decorativo: sin él, dos refresh tokens
    // emitidos para el mismo usuario dentro del mismo segundo tendrían idéntico
    // contenido y por tanto idéntica firma, y el segundo chocaría contra la
    // restricción de unicidad de sesion_refresh. Ocurre justo al rotar.
    const refreshToken = await this.jwt.signAsync(
      { sub: usuarioId, jti: randomUUID() },
      {
        secret: this.config.getOrThrow<string>('jwt.refrescoSecreto'),
        expiresIn: refrescoSegundos,
      },
    );

    await this.prisma.sesionRefresh.create({
      data: {
        usuarioId,
        tokenHash: hashToken(refreshToken),
        expiraEn: enSegundos(refrescoSegundos),
      },
    });

    return { accessToken, refreshToken };
  }

  private async consumirToken(token: string, tipo: 'VERIFICACION_EMAIL' | 'RECUPERACION_PASSWORD') {
    const registro = await this.prisma.tokenUsuario.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (registro === null || registro.tipo !== tipo) {
      throw new UnauthorizedException('El enlace no es válido');
    }

    if (registro.usadoEn !== null) {
      throw new UnauthorizedException('El enlace ya fue utilizado');
    }

    if (registro.expiraEn.getTime() < Date.now()) {
      throw new UnauthorizedException('El enlace expiró, solicita uno nuevo');
    }

    await this.prisma.tokenUsuario.update({
      where: { id: registro.id },
      data: { usadoEn: new Date() },
    });

    return registro;
  }

  private enlace(ruta: string, token: string): string {
    return `${this.config.getOrThrow<string>('corsOrigin')}/${ruta}?token=${token}`;
  }

  // El sistema no tiene servidor de correo. En el ambiente de demostración el
  // enlace que iría en el mensaje se devuelve en la respuesta para poder
  // completar el flujo; en producción la variable va apagada y el enlace solo
  // viaja por correo.
  private enlaceVisible(enlace: string): { enlace?: string } {
    return this.config.get<boolean>('correo.mostrarEnlaces') === true ? { enlace } : {};
  }
}
