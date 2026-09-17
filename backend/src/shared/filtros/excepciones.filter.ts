import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errores?: string[];
};

@Catch()
export class FiltroExcepciones implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepciones.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const respuesta = contexto.getResponse<Response>();
    const peticion = contexto.getRequest<Request>();

    const problema = this.describir(excepcion, peticion.url);

    if (problema.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${peticion.method} ${peticion.url}`, excepcion as Error);
    }

    respuesta.status(problema.status).type('application/problem+json').json(problema);
  }

  private describir(excepcion: unknown, ruta: string): ProblemDetails {
    if (excepcion instanceof HttpException) {
      const status = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();
      const mensaje = typeof cuerpo === 'string' ? cuerpo : (cuerpo as { message?: string | string[] }).message;

      return {
        type: `https://httpstatuses.io/${status}`,
        title: this.titulo(status),
        status,
        detail: Array.isArray(mensaje) ? 'La petición tiene campos inválidos' : (mensaje ?? excepcion.message),
        instance: ruta,
        ...(Array.isArray(mensaje) ? { errores: mensaje } : {}),
      };
    }

    // Prisma no lanza excepciones de Nest. De sus códigos, el único que conviene
    // traducir es P2002: una violación de unicidad es un conflicto provocado por
    // los datos que envió el cliente, no un fallo del servidor, y devolverla
    // como 500 confundiría al frontend.
    if ((excepcion as { code?: unknown }).code === 'P2002') {
      return {
        type: 'https://httpstatuses.io/409',
        title: this.titulo(HttpStatus.CONFLICT),
        status: HttpStatus.CONFLICT,
        detail: 'Ya existe un registro con esos datos',
        instance: ruta,
      };
    }

    // Cualquier otro error se responde genérico: la traza va al log del
    // servidor, nunca al cliente.
    return {
      type: 'https://httpstatuses.io/500',
      title: 'Error interno',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Ocurrió un error inesperado al procesar la petición',
      instance: ruta,
    };
  }

  private titulo(status: number): string {
    const titulos: Record<number, string> = {
      400: 'Petición inválida',
      401: 'No autenticado',
      403: 'Sin permisos',
      404: 'No encontrado',
      409: 'Conflicto',
      422: 'No se puede procesar',
      429: 'Demasiadas peticiones',
    };

    return titulos[status] ?? 'Error';
  }
}
