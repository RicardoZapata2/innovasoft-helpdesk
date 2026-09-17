import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CLAVE_PUBLICO } from '../decoradores/publico.decorator.js';

// La API queda cerrada por defecto: cada endpoint exige sesión salvo que se
// marque con @Publico(). Olvidar el decorador deja el endpoint protegido, no
// expuesto, que es el error menos grave de los dos.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    return esPublico === true ? true : super.canActivate(contexto);
  }
}
