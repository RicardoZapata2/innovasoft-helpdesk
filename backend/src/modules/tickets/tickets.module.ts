import { Module } from '@nestjs/common';
import { FidelizacionModule } from '../fidelizacion/fidelizacion.module.js';
import { PuntosModule } from '../puntos/puntos.module.js';
import { TicketsService } from './application/tickets.service.js';
import { TicketsController } from './presentation/tickets.controller.js';

@Module({
  // Cerrar un ticket descuenta puntos de servicio, y documentarlo bien o
  // responder la encuesta otorga puntos de fidelidad.
  imports: [PuntosModule, FidelizacionModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
