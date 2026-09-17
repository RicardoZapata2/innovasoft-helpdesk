import { Module } from '@nestjs/common';
import { UsuariosService } from './application/usuarios.service.js';
import { UsuariosController } from './presentation/usuarios.controller.js';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
