import { Module } from '@nestjs/common';
import { PuntosModule } from '../puntos/puntos.module.js';
import { AsesoresService } from './application/asesores.service.js';
import { CitasService } from './application/citas.service.js';
import { AsesoresController } from './presentation/asesores.controller.js';
import { CitasController } from './presentation/citas.controller.js';

@Module({
  // Se importa el módulo de puntos porque marcar una cita como realizada
  // descuenta del saldo de la empresa.
  imports: [PuntosModule],
  controllers: [CitasController, AsesoresController],
  providers: [CitasService, AsesoresService],
})
export class CitasModule {}
