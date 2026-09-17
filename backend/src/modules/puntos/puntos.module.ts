import { Module } from '@nestjs/common';
import { ConsumoPuntosService } from './application/consumo-puntos.service.js';
import { PuntosService } from './application/puntos.service.js';
import { CatalogoController } from './presentation/catalogo.controller.js';
import { PuntosController } from './presentation/puntos.controller.js';

@Module({
  controllers: [CatalogoController, PuntosController],
  providers: [PuntosService, ConsumoPuntosService],
  // El motor de consumo se exporta porque el cierre de un ticket y la marca de
  // una cita como realizada lo necesitan.
  exports: [ConsumoPuntosService],
})
export class PuntosModule {}
