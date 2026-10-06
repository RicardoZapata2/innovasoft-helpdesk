import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { FiltroExcepciones } from './shared/filtros/excepciones.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true });
  app.useGlobalFilters(new FiltroExcepciones());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Innovasoft Helpdesk')
      .setDescription('Soporte técnico, puntos de servicio, citas y fidelización')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );

  SwaggerModule.setup('api/docs', app, documento);

  // En el servidor publicado la API también entrega el frontend ya compilado.
  // Un solo servicio y una sola dirección: el navegador habla con el mismo
  // origen, igual que en desarrollo a través del proxy de Vite.
  const frontend = resolve(process.env.FRONTEND_DIST ?? join(process.cwd(), '..', 'frontend', 'dist'));

  if (existsSync(join(frontend, 'index.html'))) {
    app.useStaticAssets(frontend);
    app.use((peticion: Request, respuesta: Response, siguiente: NextFunction) => {
      if (peticion.method !== 'GET' || peticion.path.startsWith('/api')) {
        siguiente();
        return;
      }

      respuesta.sendFile(join(frontend, 'index.html'));
    });
  }

  await app.listen(Number(process.env.PORT ?? 3000));
}

await bootstrap();
