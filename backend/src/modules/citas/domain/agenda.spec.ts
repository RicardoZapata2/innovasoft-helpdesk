import { calcularFranjasLibres, estaDentroDelPlazo, minutosDelDia, seSolapan } from './agenda.js';

// 2026-09-21 es un lunes.
const lunes = new Date(2026, 8, 21);

function hora(h: number, m = 0): Date {
  return new Date(2026, 8, 21, h, m, 0, 0);
}

const jornada = [{ diaSemana: 1, horaInicio: '08:00', horaFin: '12:00' }];

describe('solapamiento de intervalos', () => {
  it('detecta el cruce parcial', () => {
    expect(seSolapan({ inicio: hora(9), fin: hora(10) }, { inicio: hora(9, 30), fin: hora(10, 30) })).toBe(true);
  });

  it('detecta que uno contiene al otro', () => {
    expect(seSolapan({ inicio: hora(8), fin: hora(12) }, { inicio: hora(9), fin: hora(10) })).toBe(true);
  });

  it('dos citas seguidas no se solapan', () => {
    expect(seSolapan({ inicio: hora(9), fin: hora(10) }, { inicio: hora(10), fin: hora(11) })).toBe(false);
  });

  it('intervalos separados no se solapan', () => {
    expect(seSolapan({ inicio: hora(8), fin: hora(9) }, { inicio: hora(11), fin: hora(12) })).toBe(false);
  });
});

describe('lectura de horas', () => {
  it('convierte HH:MM a minutos desde medianoche', () => {
    expect(minutosDelDia('00:00')).toBe(0);
    expect(minutosDelDia('08:30')).toBe(510);
    expect(minutosDelDia('23:59')).toBe(1439);
  });

  it('rechaza horas imposibles', () => {
    expect(() => minutosDelDia('25:00')).toThrow();
    expect(() => minutosDelDia('8:00')).toThrow();
    expect(() => minutosDelDia('08:60')).toThrow();
  });
});

describe('cálculo de franjas libres', () => {
  it('parte la jornada en franjas de la duración pedida', () => {
    const franjas = calcularFranjasLibres(lunes, jornada, [], 60);

    expect(franjas).toHaveLength(4);
    expect(franjas[0].inicio.getHours()).toBe(8);
    expect(franjas[3].fin.getHours()).toBe(12);
  });

  it('no ofrece una franja que no cabe completa en la jornada', () => {
    const franjas = calcularFranjasLibres(lunes, jornada, [], 90);

    expect(franjas).toHaveLength(2);
    expect(franjas[1].fin.getHours()).toBe(11);
  });

  it('descarta las franjas ocupadas por una cita', () => {
    const franjas = calcularFranjasLibres(lunes, jornada, [{ inicio: hora(9), fin: hora(10) }], 60);

    expect(franjas).toHaveLength(3);
    expect(franjas.map((f) => f.inicio.getHours())).toEqual([8, 10, 11]);
  });

  it('una cita que cruza dos franjas elimina las dos', () => {
    const franjas = calcularFranjasLibres(lunes, jornada, [{ inicio: hora(9, 30), fin: hora(10, 30) }], 60);

    expect(franjas.map((f) => f.inicio.getHours())).toEqual([8, 11]);
  });

  it('no ofrece nada un día que el asesor no atiende', () => {
    const martes = new Date(2026, 8, 22);

    expect(calcularFranjasLibres(martes, jornada, [], 60)).toEqual([]);
  });

  it('combina varios tramos del mismo día', () => {
    const partida = [
      { diaSemana: 1, horaInicio: '08:00', horaFin: '10:00' },
      { diaSemana: 1, horaInicio: '14:00', horaFin: '16:00' },
    ];

    const franjas = calcularFranjasLibres(lunes, partida, [], 60);

    expect(franjas.map((f) => f.inicio.getHours())).toEqual([8, 9, 14, 15]);
  });

  it('rechaza una duración inválida', () => {
    expect(() => calcularFranjasLibres(lunes, jornada, [], 0)).toThrow();
  });
});

describe('plazo mínimo para reprogramar o cancelar', () => {
  const ahora = new Date(2026, 8, 21, 8, 0);

  it('está dentro del plazo si falta más que el mínimo', () => {
    expect(estaDentroDelPlazo(new Date(2026, 8, 23, 8, 0), ahora, 24)).toBe(true);
  });

  it('está fuera del plazo si falta menos', () => {
    expect(estaDentroDelPlazo(new Date(2026, 8, 21, 20, 0), ahora, 24)).toBe(false);
  });

  it('una cita ya pasada está fuera de plazo', () => {
    expect(estaDentroDelPlazo(new Date(2026, 8, 20, 8, 0), ahora, 24)).toBe(false);
  });
});
