import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectorEmpresa } from '../componentes/SelectorEmpresa';
import {
  Aviso, Boton, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Seleccion, Tabla, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta, fechaLarga, puntos } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { ListaTickets, Periodo, ResultadoCierre, Kardex as TipoKardex } from '../lib/tipos';

const TIPOS = ['', 'EMISION', 'CONSUMO', 'DESCUBIERTO', 'AJUSTE', 'EXPIRACION'];

const COLORES: Record<string, string> = {
  EMISION: 'verde',
  CONSUMO: 'azul',
  DESCUBIERTO: 'rojo',
  AJUSTE: 'ambar',
  EXPIRACION: 'slate',
};

export function Kardex() {
  const { usuario, puede } = useSesion();
  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';

  const [empresaId, setEmpresaId] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [pagina, setPagina] = useState(1);

  const consulta = new URLSearchParams({ pagina: String(pagina), tamano: '15' });
  if (tipo !== '') consulta.set('tipo', tipo);
  if (desde !== '') consulta.set('desde', `${desde}T00:00:00.000Z`);
  if (hasta !== '') consulta.set('hasta', `${hasta}T23:59:59.999Z`);
  if (ticketId !== '') consulta.set('ticketId', ticketId);
  if (esInnovasoft && empresaId !== '') consulta.set('empresaId', empresaId);

  const listo = !esInnovasoft || empresaId !== '';

  // Los tickets de la empresa, para filtrar el historial por el caso que
  // originó cada consumo.
  const tickets = useQuery({
    queryKey: ['tickets', 'para-kardex', empresaId],
    queryFn: () => api.get<ListaTickets>(`/tickets?tamano=100${esInnovasoft ? `&empresaId=${empresaId}` : ''}`),
    enabled: listo && puede('tickets.ver_todos', 'tickets.ver_empresa', 'tickets.ver_propios'),
  });

  const kardex = useQuery({
    queryKey: ['kardex', consulta.toString()],
    queryFn: () => api.get<TipoKardex>(`/puntos/kardex?${consulta.toString()}`),
    enabled: listo,
  });

  // El PDF lleva los mismos filtros que la tabla, pero sin paginar: es el
  // historial completo del periodo elegido.
  const exportar = useMutation({
    mutationFn: () => {
      const filtros = new URLSearchParams(consulta);
      filtros.delete('pagina');
      filtros.delete('tamano');

      return api.descargar(`/puntos/kardex/pdf?${filtros.toString()}`, 'kardex-puntos.pdf');
    },
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {esInnovasoft && (
            <SelectorEmpresa
              valor={empresaId}
              onCambio={(valor) => {
                setEmpresaId(valor);
                setTicketId('');
                setPagina(1);
              }}
            />
          )}

          <Seleccion
            etiqueta="Ticket asociado"
            value={ticketId}
            disabled={!listo}
            onChange={(evento) => {
              setTicketId(evento.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            {tickets.data?.tickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.codigo} · {ticket.titulo}
              </option>
            ))}
          </Seleccion>

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

        <div className="mt-4 flex flex-wrap gap-2">
          <Boton
            variante="secundario"
            onClick={() => {
              setTipo('');
              setDesde('');
              setHasta('');
              setTicketId('');
              setPagina(1);
            }}
          >
            Limpiar filtros
          </Boton>
          {puede('puntos.exportar_kardex') && (
            <Boton disabled={!listo || exportar.isPending} onClick={() => exportar.mutate()}>
              {exportar.isPending ? 'Generando…' : 'Exportar a PDF'}
            </Boton>
          )}
        </div>
        {exportar.isError && (
          <div className="mt-4">
            <ErrorDelServidor error={exportar.error} />
          </div>
        )}
      </Tarjeta>

      {!listo && <Vacio texto="Elige una empresa para ver su historial de consumos." />}
      {listo && kardex.isPending && <Cargando />}
      {kardex.isError && <ErrorDelServidor error={kardex.error} />}

      {kardex.data !== undefined && (
        <Tarjeta>
          {kardex.data.movimientos.length === 0 ? (
            <Vacio texto="No hay movimientos con esos filtros." />
          ) : (
            <Tabla cabeceras={['Fecha', 'Tipo', 'Concepto', 'Origen', 'Vence', 'Puntos']}>
              {kardex.data.movimientos.map((movimiento) => (
                <tr key={movimiento.id}>
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {fechaCorta(movimiento.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <Etiqueta texto={movimiento.tipo} color={COLORES[movimiento.tipo] ?? 'slate'} />
                  </td>
                  <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">{movimiento.descripcion}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {/* Lo que llegó por canje de fidelización se marca aparte:
                        el cliente debe distinguir lo pagado de lo regalado. */}
                    {movimiento.ticketId !== null ? (
                      <Link
                        to={`/tickets/${movimiento.ticketId}`}
                        className="text-xs font-medium text-marca-600 hover:underline dark:text-marca-300"
                      >
                        {movimiento.ticket?.codigo ?? 'Ticket'}
                      </Link>
                    ) : movimiento.citaId !== null ? (
                      <Link
                        to={`/citas?cita=${movimiento.citaId}`}
                        className="text-xs font-medium text-marca-600 hover:underline dark:text-marca-300"
                      >
                        {movimiento.cita?.codigo ?? 'Cita'}
                      </Link>
                    ) : movimiento.bolsa?.origen === 'PROMOCION' ? (
                      <Etiqueta texto="Beneficio" color="verde" />
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{movimiento.bolsa?.origen ?? '—'}</span>
                    )}
                  </td>
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

      {listo && <Periodos empresaId={esInnovasoft ? empresaId : undefined} />}
    </div>
  );
}

// Los periodos de facturación cerrados. El cierre expira el saldo de las
// bolsas vencidas y consolida el descubierto: lo cobra de las bolsas vigentes
// o lo traslada al periodo siguiente.
function Periodos({ empresaId }: { empresaId?: string }) {
  const { puede } = useSesion();
  const clienteQuery = useQueryClient();
  const [preguntando, setPreguntando] = useState(false);
  const filtro = empresaId === undefined ? '' : `?empresaId=${empresaId}`;

  const periodos = useQuery({
    queryKey: ['periodos', empresaId],
    queryFn: () => api.get<Periodo[]>(`/puntos/periodos${filtro}`),
  });

  const cerrar = useMutation({
    mutationFn: () => api.post<ResultadoCierre>('/puntos/periodos/cerrar', empresaId === undefined ? {} : { empresaId }),
    onSettled: () => setPreguntando(false),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['periodos'] });
      void clienteQuery.invalidateQueries({ queryKey: ['kardex'] });
      void clienteQuery.invalidateQueries({ queryKey: ['saldo'] });
    },
  });

  return (
    <Tarjeta
      titulo="Periodos de facturación"
      accion={
        puede('puntos.cerrar_periodo') && (
          <Boton variante="secundario" onClick={() => setPreguntando(true)} disabled={cerrar.isPending}>
            Cerrar periodo
          </Boton>
        )
      }
    >
      {cerrar.isSuccess && (
        <div className="mb-4">
          <Aviso tipo="exito">
            Periodo cerrado. Vencieron {puntos(cerrar.data.puntosExpirados)} en {cerrar.data.bolsasExpiradas}{' '}
            {cerrar.data.bolsasExpiradas === 1 ? 'bolsa' : 'bolsas'}. Descubierto del periodo:{' '}
            {cerrar.data.descubiertoDelPeriodo}; cobrado de las bolsas vigentes: {cerrar.data.cobradoDeBolsas};
            trasladado al siguiente periodo: {cerrar.data.trasladado}.
          </Aviso>
        </div>
      )}
      {cerrar.isError && (
        <div className="mb-4">
          <ErrorDelServidor error={cerrar.error} />
        </div>
      )}

      {periodos.isPending && <Cargando />}
      {periodos.data?.length === 0 && (
        <Vacio texto="Todavía no se ha cerrado ningún periodo. El primero va desde el alta de la empresa hasta hoy." />
      )}
      {periodos.data !== undefined && periodos.data.length > 0 && (
        <Tabla cabeceras={['Desde', 'Hasta', 'Estado', 'Descubierto consolidado', 'Cerrado el']}>
          {periodos.data.map((periodo) => (
            <tr key={periodo.id}>
              <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">{fechaCorta(periodo.inicioEn)}</td>
              <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">{fechaCorta(periodo.finEn)}</td>
              <td className="py-3 pr-4">
                <Etiqueta texto={periodo.estado === 'CERRADO' ? 'Cerrado' : 'Abierto'} color={periodo.estado === 'CERRADO' ? 'slate' : 'azul'} />
              </td>
              <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">{puntos(periodo.saldoPendiente)}</td>
              <td className="py-3 text-xs text-slate-500 dark:text-slate-400">
                {periodo.cerradoEn === null ? '—' : fechaLarga(periodo.cerradoEn)}
              </td>
            </tr>
          ))}
        </Tabla>
      )}

      {preguntando && (
        <Dialogo
          titulo="¿Cerrar el periodo de facturación?"
          descripcion="Se registrará como vencido el saldo que quede en las bolsas ya expiradas. Lo consumido en descubierto se cobrará de las bolsas vigentes y, si no alcanza, pasará al periodo siguiente. La operación no se puede deshacer."
          textoConfirmar="Cerrar periodo"
          ocupado={cerrar.isPending}
          onConfirmar={() => cerrar.mutate()}
          onCancelar={() => setPreguntando(false)}
        />
      )}
    </Tarjeta>
  );
}
