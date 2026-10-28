import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../shared/decoradores/permisos.decorator.js';
import { AuditoriaService } from '../application/auditoria.service.js';
import { ConsultaAuditoriaDto } from './dto/consulta-auditoria.dto.js';

@ApiBearerAuth()
@ApiTags('auditoría')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  @RequierePermisos('auditoria.ver')
  @Get()
  listar(@Query() consulta: ConsultaAuditoriaDto) {
    return this.auditoria.listar(consulta);
  }
}
