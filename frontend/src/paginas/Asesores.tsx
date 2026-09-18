import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Aviso, Boton, Cargando, ErrorDelServidor, Tarjeta, Vacio } from '../componentes/base';
import { api } from '../lib/api';
import { DIAS } from '../lib/formato';
import type { Asesor } from '../lib/tipos';

type Tramo = { diaSemana: number; horaInicio: string; horaFin: string };

const LABORABLES = [1, 2, 3, 4, 5];

export function Asesores() {
  const clienteQuery = useQueryClient();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [tramos, setTramos] = useState<Tramo[]>([]);

  const asesores = useQuery({ queryKey: ['asesores'], queryFn: () => api.get<Asesor[]>('/asesores') });

  const activo = asesores.data?.find((asesor) => asesor.id === seleccionado) ?? null;

  useEffect(() => {
    if (activo !== null) {
      setTramos(activo.disponibilidad.map((franja) => ({ ...franja })));
    }
  }, [activo]);

  const guardar = useMutation({
    mutationFn: () => api.put(`/asesores/${seleccionado}/disponibilidad`, { franjas: tramos }),
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['asesores'] }),
  });

  function agregar(dia: number) {
    setTramos((actual) => [...actual, { diaSemana: dia, horaInicio: '08:00', horaFin: '12:00' }]);
  }

  function quitar(indice: number) {
    setTramos((actual) => actual.filter((_, posicion) => posicion !== indice));
  }

  function editar(indice: number, campo: 'horaInicio' | 'horaFin', valor: string) {
    setTramos((actual) =>
      actual.map((tramo, posicion) => (posicion === indice ? { ...tramo, [campo]: valor } : tramo)),
    );
  }

  function jornadaEstandar() {
    setTramos(
      LABORABLES.flatMap((dia) => [
        { diaSemana: dia, horaInicio: '08:00', horaFin: '12:00' },
        { diaSemana: dia, horaInicio: '14:00', horaFin: '17:00' },
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Agenda de asesores</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Las horas que declares aquí son las que el sistema ofrece al agendar una cita.
        </p>
      </div>

      {asesores.isPending && <Cargando />}
      {asesores.isError && <ErrorDelServidor error={asesores.error} />}
      {asesores.data?.length === 0 && (
        <Vacio texto="No hay asesores. Créalos desde Usuarios con el perfil Asesor." />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Asesores" className="lg:col-span-1">
          <ul className="space-y-2">
            {asesores.data?.map((asesor) => (
              <li key={asesor.id}>
                <button
                  type="button"
                  onClick={() => setSeleccionado(asesor.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    seleccionado === asesor.id
                      ? 'border-marca-500 bg-marca-50 dark:border-marca-500 dark:bg-marca-900/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {asesor.usuario.nombres} {asesor.usuario.apellidos}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {asesor.especialidad ?? 'Sin especialidad'} · {asesor.disponibilidad.length} tramos
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta
          titulo={activo === null ? 'Disponibilidad' : `Disponibilidad de ${activo.usuario.nombres}`}
          className="lg:col-span-2"
          accion={
            activo !== null && (
              <Boton variante="plano" onClick={jornadaEstandar}>
                Jornada estándar
              </Boton>
            )
          }
        >
          {activo === null ? (
            <Vacio texto="Elige un asesor de la lista." />
          ) : (
            <div className="space-y-5">
              {guardar.isError && <ErrorDelServidor error={guardar.error} />}
              {guardar.isSuccess && <Aviso tipo="exito">Disponibilidad guardada.</Aviso>}

              {DIAS.map((nombre, dia) => {
                const delDia = tramos
                  .map((tramo, indice) => ({ tramo, indice }))
                  .filter((entrada) => entrada.tramo.diaSemana === dia);

                return (
                  <div key={nombre} className="border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{nombre}</span>
                      <Boton variante="plano" onClick={() => agregar(dia)}>
                        Añadir tramo
                      </Boton>
                    </div>

                    {delDia.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-400">No atiende</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {delDia.map(({ tramo, indice }) => (
                          <div key={indice} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={tramo.horaInicio}
                              onChange={(evento) => editar(indice, 'horaInicio', evento.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <span className="text-slate-400">a</span>
                            <input
                              type="time"
                              value={tramo.horaFin}
                              onChange={(evento) => editar(indice, 'horaFin', evento.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <Boton variante="plano" onClick={() => quitar(indice)}>
                              Quitar
                            </Boton>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Boton onClick={() => guardar.mutate()} disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar disponibilidad'}
              </Boton>
            </div>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
