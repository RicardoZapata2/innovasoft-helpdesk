import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { Publico } from '../shared/decoradores/publico.decorator.js';

@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get()
  async estado() {
    await this.prisma.$queryRaw`SELECT 1`;

    return { estado: 'ok', baseDatos: 'conectada', fecha: new Date().toISOString() };
  }
}
