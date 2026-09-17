import { Module } from '@nestjs/common';
import { EmpresasService } from './application/empresas.service.js';
import { EmpresasController } from './presentation/empresas.controller.js';

@Module({
  controllers: [EmpresasController],
  providers: [EmpresasService],
})
export class EmpresasModule {}
