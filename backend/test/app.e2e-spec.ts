import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { FiltroExcepciones } from '../src/shared/filtros/excepciones.filter.js';

// Pruebas de integración contra la base de datos de desarrollo con los datos
// de demostración cargados (npm run db:seed y npm run db:demo).
describe('API (integración)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new FiltroExcepciones());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const entrar = async (email: string, password: string) =>
    (await request(app.getHttpServer()).post('/api/auth/login').send({ email, password })).body as {
      accessToken: string;
    };

  it('responde el chequeo de salud con la base conectada', async () => {
    const respuesta = await request(app.getHttpServer()).get('/api/salud').expect(200);

    expect(respuesta.body.baseDatos).toBe('conectada');
  });

  it('rechaza el login con contraseña equivocada sin revelar si el correo existe', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@innovasoft.com', password: 'equivocada' })
      .expect(401);

    expect(respuesta.body.detail).toBe('Correo o contraseña incorrectos');
  });

  it('exige sesión para consultar tickets', async () => {
    await request(app.getHttpServer()).get('/api/tickets').expect(401);
  });

  it('un cliente no puede consultar el saldo de otra empresa', async () => {
    const andina = await entrar('gerencia@andina.com', 'Innovasoft2026');
    const empresas = await request(app.getHttpServer())
      .get('/api/empresas')
      .set('Authorization', `Bearer ${(await entrar('admin@innovasoft.com', 'Admin123*')).accessToken}`);
    const otra = (empresas.body as Array<{ id: string; nit: string }>).find((e) => e.nit === '901234567');

    await request(app.getHttpServer())
      .get(`/api/puntos/saldo?empresaId=${otra?.id}`)
      .set('Authorization', `Bearer ${andina.accessToken}`)
      .expect(403);
  });

  it('el usuario de empresa solo ve los tickets de su empresa', async () => {
    const norte = await entrar('gerencia@delnorte.com', 'Innovasoft2026');
    const respuesta = await request(app.getHttpServer())
      .get('/api/tickets')
      .set('Authorization', `Bearer ${norte.accessToken}`)
      .expect(200);

    const ajenos = (respuesta.body.tickets as Array<{ empresa: { razonSocial: string } }>).filter(
      (ticket) => ticket.empresa.razonSocial !== 'Transportes del Norte Ltda.',
    );

    expect(ajenos).toHaveLength(0);
  });
});
