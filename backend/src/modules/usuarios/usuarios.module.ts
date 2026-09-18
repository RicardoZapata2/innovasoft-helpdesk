import { Module } from '@nestjs/common';
import { PerfilesService } from './application/perfiles.service.js';
import { UsuariosService } from './application/usuarios.service.js';
import { PerfilesController } from './presentation/perfiles.controller.js';
import { UsuariosController } from './presentation/usuarios.controller.js';

@Module({
  controllers: [UsuariosController, PerfilesController],
  providers: [UsuariosService, PerfilesService],
})
export class UsuariosModule {}
