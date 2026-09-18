import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Publico } from '../../../shared/decoradores/publico.decorator.js';
import { PuntosService } from '../application/puntos.service.js';

// El catálogo es la vitrina del sitio público: se consulta sin iniciar sesión
// porque una empresa tiene que poder comparar los planes antes de ser cliente.
@ApiTags('catálogo')
@Controller()
export class CatalogoController {
  constructor(private readonly puntos: PuntosService) {}

  @Publico()
  @Get('planes')
  planes() {
    return this.puntos.listarPlanes();
  }

  @Publico()
  @Get('tarifas')
  tarifas() {
    return this.puntos.listarTarifas();
  }

  @Publico()
  @Get('recompensas')
  recompensas() {
    return this.puntos.listarRecompensas();
  }

  @Publico()
  @Get('reglas-fidelizacion')
  reglasDeFidelizacion() {
    return this.puntos.listarReglasDeFidelizacion();
  }
}
