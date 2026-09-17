import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../shared/tipos/usuario-autenticado.js';

type Payload = { sub: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accesoSecreto'),
    });
  }

  // Los permisos se leen de la base en cada petición, no del token. Así, quitar
  // un permiso o desactivar un usuario tiene efecto inmediato en lugar de
  // esperar a que caduque el token que ya emitimos.
  async validate(payload: Payload): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { perfil: { include: { permisos: { include: { permiso: true } } } } },
    });

    if (usuario === null || !usuario.activo) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      empresaId: usuario.empresaId,
      perfil: usuario.perfil.nombre,
      ambito: usuario.perfil.ambito,
      permisos: usuario.perfil.permisos.map((asignacion) => asignacion.permiso.clave),
      debeCambiarPassword: usuario.debeCambiarPassword,
    };
  }
}
