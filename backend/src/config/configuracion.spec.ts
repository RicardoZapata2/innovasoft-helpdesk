import { cargarConfiguracion } from './configuracion.js';

const entornoOriginal = { ...process.env };

function entorno(valores: Record<string, string | undefined>): void {
  process.env = { ...entornoOriginal, ...valores } as NodeJS.ProcessEnv;
}

describe('configuración de arranque', () => {
  afterEach(() => {
    process.env = { ...entornoOriginal };
  });

  it('convierte las duraciones a segundos', () => {
    entorno({
      DATABASE_URL: 'postgresql://x',
      JWT_ACCESS_SECRET: 'a',
      JWT_REFRESH_SECRET: 'b',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    });

    const config = cargarConfiguracion();

    expect(config.jwt.accesoSegundos).toBe(900);
    expect(config.jwt.refrescoSegundos).toBe(604800);
  });

  it('no arranca si falta un secreto', () => {
    entorno({
      DATABASE_URL: 'postgresql://x',
      JWT_ACCESS_SECRET: undefined,
      JWT_REFRESH_SECRET: 'b',
    });

    expect(() => cargarConfiguracion()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('no arranca si una duración está mal escrita', () => {
    entorno({
      DATABASE_URL: 'postgresql://x',
      JWT_ACCESS_SECRET: 'a',
      JWT_REFRESH_SECRET: 'b',
      JWT_ACCESS_TTL: 'quince minutos',
    });

    expect(() => cargarConfiguracion()).toThrow(/Duración mal escrita/);
  });
});
