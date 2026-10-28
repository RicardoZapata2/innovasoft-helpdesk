import { Module } from '@nestjs/common';
import { FidelizacionModule } from '../fidelizacion/fidelizacion.module.js';
import { CatalogoService } from './application/catalogo.service.js';
import { CierrePeriodoService } from './application/cierre-periodo.service.js';
import { ConsumoPuntosService } from './application/consumo-puntos.service.js';
import { PuntosService } from './application/puntos.service.js';
import { AdministracionCatalogoController } from './presentation/administracion-catalogo.controller.js';
import { CatalogoController } from './presentation/catalogo.controller.js';
import { PuntosController } from './presentation/puntos.controller.js';

@Module({
  // La renovación anticipada de un plan otorga puntos de fidelidad.
  imports: [FidelizacionModule],
  controllers: [CatalogoController, AdministracionCatalogoController, PuntosController],
  providers: [PuntosService, ConsumoPuntosService, CatalogoService, CierrePeriodoService],
  // El motor de consumo se exporta porque el cierre de un ticket y la marca de
  // una cita como realizada lo necesitan.
  exports: [ConsumoPuntosService, PuntosService],
})
export class PuntosModule {}
