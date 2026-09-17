import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { cargarConfiguracion } from './config/configuracion.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EmpresasModule } from './modules/empresas/empresas.module.js';
import { PuntosModule } from './modules/puntos/puntos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SaludController } from './salud/salud.controller.js';
import { CorreoModule } from './shared/correo/correo.module.js';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard.js';
import { PermisosGuard } from './shared/guards/permisos.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, load: [cargarConfiguracion] }),
    PrismaModule,
    CorreoModule,
    AuthModule,
    EmpresasModule,
    PuntosModule,
  ],
  controllers: [SaludController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermisosGuard },
  ],
})
export class AppModule {}
