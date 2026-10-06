import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectorEmpresa } from '../componentes/SelectorEmpresa';
import {
  Aviso, Boton, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Tabla, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { Recompensa, ResumenFidelizacion } from '../lib/tipos';

const COLOR_CANJE = { EMITIDO: 'azul', APLICADO: 'verde', VENCIDO: 'slate' } as const;

export function Fidelizacion() {
  const { usuario, puede } = useSesion();
  const clienteQuery = useQueryClient();
  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';
  const [empresaId, setEmpresaId] = useState('');
  const [porCanjear, setPorCanjear] = useState<Recompensa | null>(null);
  const [mensaje, setMensaje] = useState('');

  const listo = !esInnovasoft || empresaId !== '';
  const sufijo = esInnovasoft ? `?empresaId=${empresaId}` : '';

  const resumen = useQuery({
    queryKey: ['fidelizacion', empresaId],
    queryFn: () => api.get<ResumenFidelizacion>(`/fidelizacion${sufijo}`),
    enabled: listo,
  });

  const canjear = useMutation({
    mutationFn: (recompensa: Recompensa) =>
      api.post<{ recompensa: string; saldoNuevo: number }>('/fidelizacion/canjes', {
        recompensa: recompensa.clave,
        ...(esInnovasoft ? { empresaId } : {}),
      }),
    onSuccess: (resultado) => {
      void clienteQuery.invalidateQueries({ queryKey: ['fidelizacion'] });
      void clienteQuery.invalidateQueries({ queryKey: ['saldo'] });
      void clienteQuery.invalidateQueries({ queryKey: ['kardex'] });
      setPorCanjear(null);
      setMensaje(`Canjeaste "${resultado.recompensa}". Te quedan ${resultado.saldoNuevo} puntos de fidelidad.`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Programa de fidelización</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Puntos que tu empresa gana por usar bien la plataforma. Son distintos de los puntos de servicio: no se
          compran ni se gastan en soporte, se canjean por beneficios.
        </p>
      </div>

      {esInnovasoft && (
        <Tarjeta>
          <SelectorEmpresa valor={empresaId} onCambio={setEmpresaId} />
        </Tarjeta>
      )}

      {!listo && <Vacio texto="Elige una empresa para ver su programa de fidelización." />}
      {listo && resumen.isPending && <Cargando />}
      {resumen.isError && <ErrorDelServidor error={resumen.error} />}
      {mensaje !== '' && <Aviso tipo="exito">{mensaje}</Aviso>}

      {resumen.data !== undefined && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Tarjeta titulo="Puntos de fidelidad">
              <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">{resumen.data.saldo}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">disponibles para canjear</p>
            </Tarjeta>

            <Tarjeta titulo="Cómo se ganan" className="lg:col-span-2">
              <ul className="space-y-2">
                {resumen.data.reglas.map((regla) => (
                  <li key={regla.clave} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{regla.nombre}</span>
                    <Etiqueta texto={`+${regla.puntos}`} color="verde" />
                  </li>
                ))}
              </ul>
            </Tarjeta>
          </div>

          <Tarjeta titulo="Catálogo de recompensas">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumen.data.recompensas.map((recompensa) => {
                const alcanza = resumen.data.saldo >= recompensa.costoPuntos;

                return (
                  <div
                    key={recompensa.clave}
                    className="flex flex-col rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-200">{recompensa.nombre}</p>
                    <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">{recompensa.descripcion}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-marca-700 dark:text-marca-300">
                        {recompensa.costoPuntos} pts
                      </span>
                      {puede('fidelizacion.canjear') && (
                        <Boton
                          variante={alcanza ? 'principal' : 'secundario'}
                          disabled={!alcanza}
                          title={alcanza ? undefined : `Te faltan ${recompensa.costoPuntos - resumen.data.saldo} puntos`}
                          onClick={() => setPorCanjear(recompensa)}
                        >
                          Canjear
                        </Boton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Tarjeta>

          <div className="grid gap-6 lg:grid-cols-2">
            <Tarjeta titulo="Detalle de puntos obtenidos">
              {resumen.data.movimientos.length === 0 ? (
                <Vacio texto="Aún no hay movimientos. Registra tickets con evidencia y califica la atención." />
              ) : (
                <Tabla cabeceras={['Fecha', 'Concepto', 'Puntos']}>
                  {resumen.data.movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td className="py-2 pr-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {fechaCorta(movimiento.createdAt)}
                      </td>
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                        {movimiento.descripcion}
                        {movimiento.ticket !== null && (
                          <Link
                            to={`/tickets/${movimiento.ticket.id}`}
                            className="ml-1 text-xs text-marca-600 hover:underline dark:text-marca-300"
                          >
                            {movimiento.ticket.codigo}
                          </Link>
                        )}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          movimiento.puntos < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {movimiento.puntos > 0 ? '+' : ''}
                        {movimiento.puntos}
                      </td>
                    </tr>
                  ))}
                </Tabla>
              )}
            </Tarjeta>

            <Tarjeta titulo="Historial de canjes">
              {resumen.data.canjes.length === 0 ? (
                <Vacio texto="Todavía no has canjeado recompensas." />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resumen.data.canjes.map((canje) => (
                    <li key={canje.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{canje.recompensa.nombre}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {fechaCorta(canje.createdAt)} · {canje.usuario.nombres} {canje.usuario.apellidos} ·{' '}
                          {canje.recompensa.costoPuntos} pts
                          {canje.venceEn !== null && canje.estado === 'EMITIDO' && ` · vence ${fechaCorta(canje.venceEn)}`}
                        </p>
                      </div>
                      <Etiqueta texto={canje.estado} color={COLOR_CANJE[canje.estado]} />
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>
        </>
      )}

      {porCanjear !== null && (
        <Dialogo
          titulo={`Canjear "${porCanjear.nombre}"`}
          descripcion={`Se descontarán ${porCanjear.costoPuntos} puntos de fidelidad. ${porCanjear.descripcion}. Esta operación no se puede deshacer.`}
          textoConfirmar="Confirmar canje"
          ocupado={canjear.isPending}
          onConfirmar={() => canjear.mutate(porCanjear)}
          onCancelar={() => setPorCanjear(null)}
        />
      )}
      {canjear.isError && <ErrorDelServidor error={canjear.error} />}
    </div>
  );
}
