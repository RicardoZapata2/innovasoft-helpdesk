import { Injectable, Logger } from '@nestjs/common';

// El sistema corre en red local y no tiene servidor de correo. El mensaje se
// escribe en la consola del servidor y el dato que importa —el token o la
// contraseña temporal— queda en la base de datos, que es lo que la aplicación
// necesita para funcionar. Pasar a correo real es sustituir el cuerpo de estos
// métodos sin tocar a quien los llama.
@Injectable()
export class CorreoService {
  private readonly logger = new Logger('Correo');

  enviarVerificacion(destino: string, enlace: string): void {
    this.logger.log(`Verificación de cuenta para ${destino}: ${enlace}`);
  }

  enviarRecuperacion(destino: string, enlace: string): void {
    this.logger.log(`Recuperación de contraseña para ${destino}: ${enlace}`);
  }

  enviarCredenciales(destino: string, empresa: string, passwordTemporal: string): void {
    this.logger.log(
      `Credenciales de acceso para ${destino} (${empresa}): ` +
        `contraseña temporal "${passwordTemporal}". Debe cambiarla al entrar.`,
    );
  }
}
