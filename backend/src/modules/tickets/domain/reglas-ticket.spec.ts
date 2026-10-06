import {
  componerCodigoTicket,
  destinosDisponibles,
  elegirAsesorConMenorCarga,
  evaluarTransicion,
  sugerirTarifa,
  tieneEvidenciaCompleta,
  validarAdjunto,
} from './reglas-ticket.js';
import type { Transicion } from './reglas-ticket.js';

const TRANSICIONES: Transicion[] = [
  { desde: 'abierto', hasta: 'asignado', permiso: 'tickets.asignar' },
  { desde: 'asignado', hasta: 'en_atencion', permiso: 'tickets.cambiar_estado' },
  { desde: 'en_atencion', hasta: 'resuelto', permiso: 'tickets.cambiar_estado' },
  { desde: 'resuelto', hasta: 'cerrado', permiso: 'tickets.cerrar' },
  { desde: 'cerrado', hasta: 'reabierto', permiso: 'tickets.reabrir' },
];

describe('máquina de estados del ticket', () => {
  it('permite un salto declarado cuando el usuario tiene el permiso', () => {
    const resultado = evaluarTransicion(TRANSICIONES, 'resuelto', 'cerrado', ['tickets.cerrar']);

    expect(resultado.permitida).toBe(true);
  });

  it('rechaza un salto que no está en la tabla aunque el usuario tenga permisos', () => {
    const resultado = evaluarTransicion(TRANSICIONES, 'abierto', 'cerrado', ['tickets.cerrar', 'tickets.asignar']);

    expect(resultado).toEqual({ permitida: false, motivo: expect.stringContaining('no puede pasar') });
  });

  it('rechaza un salto válido si el perfil no tiene el permiso que exige', () => {
    const resultado = evaluarTransicion(TRANSICIONES, 'cerrado', 'reabierto', ['tickets.cerrar']);

    expect(resultado).toEqual({ permitida: false, motivo: expect.stringContaining('tickets.reabrir') });
  });

  it('ofrece solo los destinos que el perfil puede ejecutar', () => {
    expect(destinosDisponibles(TRANSICIONES, 'abierto', ['tickets.cambiar_estado'])).toEqual([]);
    expect(destinosDisponibles(TRANSICIONES, 'abierto', ['tickets.asignar'])).toEqual(['asignado']);
  });
});

describe('tarifa sugerida al cerrar', () => {
  it('hasta una hora es soporte remoto básico', () => {
    expect(sugerirTarifa(0.5)).toBe('soporte_remoto_basico');
    expect(sugerirTarifa(1)).toBe('soporte_remoto_basico');
  });

  it('más de una hora es soporte remoto extendido', () => {
    expect(sugerirTarifa(1.25)).toBe('soporte_remoto_extendido');
  });
});

describe('evidencia completa para fidelización', () => {
  it('exige descripción suficiente y al menos un adjunto', () => {
    const descripcion = 'El módulo de facturación no genera el PDF desde ayer';

    expect(tieneEvidenciaCompleta(descripcion, 1)).toBe(true);
    expect(tieneEvidenciaCompleta(descripcion, 0)).toBe(false);
    expect(tieneEvidenciaCompleta('No sirve', 3)).toBe(false);
  });
});

describe('validación de adjuntos', () => {
  it('acepta una imagen dentro del límite', () => {
    expect(validarAdjunto('image/png', 2 * 1024 * 1024, 10)).toBeNull();
  });

  it('rechaza ejecutables y archivos que superan el tamaño', () => {
    expect(validarAdjunto('application/x-msdownload', 1000, 10)).toContain('no permitido');
    expect(validarAdjunto('application/pdf', 11 * 1024 * 1024, 10)).toContain('10 MB');
  });
});

describe('asignación automática', () => {
  it('elige al asesor con menos tickets abiertos', () => {
    const elegido = elegirAsesorConMenorCarga([
      { asesorId: 'mateo', abiertos: 4 },
      { asesorId: 'valentina', abiertos: 1 },
      { asesorId: 'sara', abiertos: 1 },
    ]);

    expect(elegido).toBe('valentina');
  });

  it('devuelve nulo cuando no hay asesores activos', () => {
    expect(elegirAsesorConMenorCarga([])).toBeNull();
  });
});

it('compone el código del ticket con consecutivo anual', () => {
  expect(componerCodigoTicket(2026, 7)).toBe('TCK-2026-0007');
});
