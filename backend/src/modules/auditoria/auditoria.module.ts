import { Module } from '@nestjs/common';
import { AuditoriaService } from './application/auditoria.service.js';
import { AuditoriaController } from './presentation/auditoria.controller.js';

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
})
export class AuditoriaModule {}
