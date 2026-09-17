import { ESTADOS_FINALES, estadosAlcanzables, permisoDeTransicion, transicionPermitida } from './estados-cita.js';

describe('ciclo de vida de una cita', () => {
  it('una cita solicitada se confirma, se reprograma o se cancela', () => {
    expect(estadosAlcanzables('solicitada').sort()).toEqual(['cancelada', 'confirmada', 'reprogramada']);
  });

  it('no se puede realizar una cita que nadie confirmó', () => {
    expect(transicionPermitida('solicitada', 'realizada')).toBe(false);
  });

  it('una cita confirmada se puede marcar como realizada', () => {
    expect(transicionPermitida('confirmada', 'realizada')).toBe(true);
  });

  it('los estados finales no llevan a ninguna parte', () => {
    for (const estado of ESTADOS_FINALES) {
      expect(estadosAlcanzables(estado)).toEqual([]);
    }
  });

  it('una cita cancelada no se puede revivir', () => {
    expect(transicionPermitida('cancelada', 'confirmada')).toBe(false);
    expect(transicionPermitida('cancelada', 'reprogramada')).toBe(false);
  });

  it('cada transición declara el permiso que exige', () => {
    expect(permisoDeTransicion('solicitada', 'confirmada')).toBe('citas.confirmar');
    expect(permisoDeTransicion('confirmada', 'cancelada')).toBe('citas.cancelar');
    expect(permisoDeTransicion('en_curso', 'realizada')).toBe('citas.marcar_realizada');
  });

  it('una transición inexistente no tiene permiso asociado', () => {
    expect(permisoDeTransicion('realizada', 'cancelada')).toBeUndefined();
  });
});
