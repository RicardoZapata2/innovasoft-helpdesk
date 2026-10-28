import { Module } from '@nestjs/common';
import { CatalogoFidelizacionService } from './application/catalogo-fidelizacion.service.js';
import { FidelizacionService } from './application/fidelizacion.service.js';
import { CatalogoFidelizacionController } from './presentation/catalogo-fidelizacion.controller.js';
import { FidelizacionController } from './presentation/fidelizacion.controller.js';

@Module({
  controllers: [FidelizacionController, CatalogoFidelizacionController],
  providers: [FidelizacionService, CatalogoFidelizacionService],
  // Los tickets y la contratación de planes disparan eventos que otorgan puntos
  // de fidelidad, así que necesitan el servicio.
  exports: [FidelizacionService],
})
export class FidelizacionModule {}
