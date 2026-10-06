import { Module } from '@nestjs/common';
import { FidelizacionService } from './application/fidelizacion.service.js';
import { FidelizacionController } from './presentation/fidelizacion.controller.js';

@Module({
  controllers: [FidelizacionController],
  providers: [FidelizacionService],
  // Los tickets y la contratación de planes disparan eventos que otorgan puntos
  // de fidelidad, así que necesitan el servicio.
  exports: [FidelizacionService],
})
export class FidelizacionModule {}
