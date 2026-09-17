export type Intervalo = {
  inicio: Date;
  fin: Date;
};

export type DisponibilidadDeclarada = {
  // 0 = domingo, 6 = sábado, igual que Date.getDay()
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
};

// Dos intervalos se solapan cuando cada uno empieza antes de que termine el
// otro. Que el fin de uno coincida con el inicio del siguiente no es solape:
// una cita de 9 a 10 y otra de 10 a 11 son compatibles.
export function seSolapan(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

export function minutosDelDia(hora: string): number {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);

  if (partes === null) {
    throw new Error(`Hora mal escrita: "${hora}". Se espera HH:MM en formato de 24 horas.`);
  }

  return Number(partes[1]) * 60 + Number(partes[2]);
}

function conHora(dia: Date, minutos: number): Date {
  const fecha = new Date(dia);
  fecha.setHours(0, minutos, 0, 0);

  return fecha;
}

// Cruza lo que el asesor declaró que atiende con lo que ya tiene agendado, y
// devuelve los huecos donde cabe una cita de la duración pedida.
//
// Las franjas se calculan, no se almacenan. Guardarlas obligaría a recalcular
// la tabla completa cada vez que alguien agenda, cancela o cambia su horario, y
// cualquier fallo dejaría ofreciendo horas que ya están ocupadas.
export function calcularFranjasLibres(
  dia: Date,
  disponibilidad: DisponibilidadDeclarada[],
  ocupadas: Intervalo[],
  duracionMinutos: number,
): Intervalo[] {
  if (duracionMinutos <= 0) {
    throw new Error('La duración de una cita debe ser mayor que cero');
  }

  const delDia = disponibilidad.filter((franja) => franja.diaSemana === dia.getDay());
  const libres: Intervalo[] = [];

  for (const franja of delDia) {
    const desde = minutosDelDia(franja.horaInicio);
    const hasta = minutosDelDia(franja.horaFin);

    for (let minuto = desde; minuto + duracionMinutos <= hasta; minuto += duracionMinutos) {
      const candidata = {
        inicio: conHora(dia, minuto),
        fin: conHora(dia, minuto + duracionMinutos),
      };

      if (!ocupadas.some((ocupada) => seSolapan(candidata, ocupada))) {
        libres.push(candidata);
      }
    }
  }

  return libres.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

// Reprogramar o cancelar con poca antelación deja al asesor con un hueco que ya
// no puede llenar. La regla no impide la operación: la marca como fuera de
// plazo para que quede registrada como tal.
export function estaDentroDelPlazo(inicioCita: Date, ahora: Date, horasMinimas: number): boolean {
  const horasFaltantes = (inicioCita.getTime() - ahora.getTime()) / (60 * 60 * 1000);

  return horasFaltantes >= horasMinimas;
}
