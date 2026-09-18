import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SelectorEmpresa } from '../componentes/SelectorEmpresa';
import { Boton, Cargando, ErrorDelServidor, Etiqueta, Seleccion, Tabla, Tarjeta, Vacio } from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { Kardex as TipoKardex } from '../lib/tipos';

const TIPOS = ['', 'EMISION', 'CONSUMO', 'DESCUBIERTO', 'AJUSTE', 'EXPIRACION'];

const COLORES: Record<string, string> = {
  EMISION: 'verde',
  CONSUMO: 'azul',
  DESCUBIERTO: 'rojo',
  AJUSTE: 'ambar',
  EXPIRACION: 'slate',
};

export function Kardex() {
  const { usuario } = useSesion();
  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';

  const [empresaId, setEmpresaId] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);

  const consulta = new URLSearchParams({ pagina: String(pagina), tamano: '15' });
  if (tipo !== '') consulta.set('tipo', tipo);
  if (desde !== '') consulta.set('desde', `${desde}T00:00:00.000Z`);
  if (hasta !== '') consulta.set('hasta', `${hasta}T23:59:59.999Z`);
  if (esInnovasoft && empresaId !== '') consulta.set('empresaId', empresaId);

  const listo = !esInnovasoft || empresaId !== '';

  const kardex = useQuery({
    queryKey: ['kardex', consulta.toString()],
    queryFn: () => api.get<TipoKardex>(`/puntos/kardex?${consulta.toString()}`),
    enabled: listo,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Historial de consumos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada movimiento indica de qué bolsa salió y qué servicio lo originó.
        </p>
      </div>

      <Tarjeta>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {esInnovasoft && (
            <SelectorEmpresa
              valor={empresaId}
              onCambio={(valor) => {
                setEmpresaId(valor);
                setPagina(1);
              }}
            />
          )}

          <Seleccion
            etiqueta="Tipo de movimiento"
            value={tipo}
            onChange={(evento) => {
              setTipo(evento.target.value);
              setPagina(1);
            }}
          >
            {TIPOS.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion === '' ? 'Todos' : opcion}
              </option>
            ))}
          </Seleccion>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(evento) => {
                setDesde(evento.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm
                focus:border-marca-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(evento) => {
                setHasta(evento.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm
                focus:border-marca-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="mt-4">
          <Boton
            variante="secundario"
            onClick={() => {
              setTipo('');
              setDesde('');
              setHasta('');
              setPagina(1);
            }}
          >
            Limpiar filtros
          </Boton>
        </div>
      </Tarjeta>

      {!listo && <Vacio texto="Elige una empresa para ver su historial de consumos." />}
      {listo && kardex.isPending && <Cargando />}
      {kardex.isError && <ErrorDelServidor error={kardex.error} />}

      {kardex.data !== undefined && (
        <Tarjeta>
          {kardex.data.movimientos.length === 0 ? (
            <Vacio texto="No hay movimientos con esos filtros." />
          ) : (
            <Tabla cabeceras={['Fecha', 'Tipo', 'Concepto', 'Vence', 'Puntos']}>
              {kardex.data.movimientos.map((movimiento) => (
                <tr key={movimiento.id}>
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {fechaCorta(movimiento.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <Etiqueta texto={movimiento.tipo} color={COLORES[movimiento.tipo] ?? 'slate'} />
                  </td>
                  <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">{movimiento.descripcion}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                    {movimiento.bolsa === null ? '—' : fechaCorta(movimiento.bolsa.venceEn)}
                  </td>
                  <td
                    className={`py-3 text-right font-semibold whitespace-nowrap ${
                      movimiento.puntos < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {movimiento.puntos > 0 ? '+' : ''}
                    {movimiento.puntos}
                  </td>
                </tr>
              ))}
            </Tabla>
          )}

          {kardex.data.paginas > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Página {kardex.data.pagina} de {kardex.data.paginas} · {kardex.data.total} movimientos
              </span>
              <div className="flex gap-2">
                <Boton variante="secundario" disabled={pagina === 1} onClick={() => setPagina((a) => a - 1)}>
                  Anterior
                </Boton>
                <Boton
                  variante="secundario"
                  disabled={pagina >= kardex.data.paginas}
                  onClick={() => setPagina((a) => a + 1)}
                >
                  Siguiente
                </Boton>
              </div>
            </div>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
