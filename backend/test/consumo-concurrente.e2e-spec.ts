import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { ConsumoPuntosService } from '../src/modules/puntos/application/consumo-puntos.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Dos cierres que llegan al mismo tiempo contra una bolsa con saldo para uno
// solo. Sin el bloqueo de filas, los dos leerían el mismo saldo y lo gastarían
// los dos: la bolsa quedaría en negativo y el descubierto no aparecería.
describe('consumo concurrente sobre la misma bolsa', () => {
  let modulo: TestingModule;
  let prisma: PrismaService;
  let consumo: ConsumoPuntosService;
  let empresaId: string;
  let bolsaId: string;

  beforeAll(async () => {
    modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = modulo.get(PrismaService);
    consumo = modulo.get(ConsumoPuntosService);

    const empresa = await prisma.empresa.create({
      data: { nit: `99${Date.now()}`.slice(0, 10), razonSocial: 'Empresa de prueba de concurrencia' },
    });
    empresaId = empresa.id;

    const bolsa = await prisma.bolsaPuntos.create({
      data: { empresaId, origen: 'PLAN', puntosIniciales: 5, venceEn: new Date(Date.now() + 86400000) },
    });
    bolsaId = bolsa.id;

    await prisma.movimientoPuntos.create({
      data: { empresaId, bolsaId, tipo: 'EMISION', puntos: 5, descripcion: 'Saldo inicial de la prueba' },
    });
  });

  afterAll(async () => {
    await prisma.movimientoPuntos.deleteMany({ where: { empresaId } });
    await prisma.bolsaPuntos.deleteMany({ where: { empresaId } });
    await prisma.empresa.delete({ where: { id: empresaId } });
    await modulo.close();
  });

  it('solo uno de los dos consumos sale de la bolsa; el otro queda en descubierto', async () => {
    const [primero, segundo] = await Promise.all([
      consumo.consumir({ empresaId, costo: 5, descripcion: 'Cierre A' }),
      consumo.consumir({ empresaId, costo: 5, descripcion: 'Cierre B' }),
    ]);

    const desdeLaBolsa = await prisma.movimientoPuntos.aggregate({
      where: { bolsaId, tipo: 'CONSUMO' },
      _sum: { puntos: true },
    });
    const descubierto = await prisma.movimientoPuntos.aggregate({
      where: { empresaId, tipo: 'DESCUBIERTO' },
      _sum: { puntos: true },
    });

    expect(desdeLaBolsa._sum.puntos).toBe(-5);
    expect(descubierto._sum.puntos).toBe(-5);
    expect([primero.descubierto, segundo.descubierto].sort()).toEqual([0, 5]);
    expect(Math.min(primero.saldoNuevo, segundo.saldoNuevo)).toBe(-5);
  });
});
