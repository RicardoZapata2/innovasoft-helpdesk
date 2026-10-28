import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Boton, Campo, Cargando, ErrorDelServidor, Seleccion, Tabla, Tarjeta, Vacio } from '../componentes/base';
import { api } from '../lib/api';
import { fechaLarga } from '../lib/formato';
import type { ListaAuditoria, RegistroAuditoria } from '../lib/tipos';

const ENTIDADES: Record<string, string> = {
  ticket: 'Tickets',
  cita: 'Citas',
  canje: 'Canjes',
  empresa_cliente: 'Empresas',
  usuario: 'Usuarios',
  perfil: 'Perfiles',
  plan: 'Planes',
  tarifa_servicio: 'Tarifas',
  recompensa: 'Recompensas',
  regla_fidelizacion: 'Reglas de fidelización',
  periodo_facturacion: 'Cierres de periodo',
  suscripcion: 'Suscripciones',
};

// Bitácora de solo lectura: quién hizo qué, cuándo y sobre qué dato. Ningún
// usuario puede editarla ni borrarla desde la aplicación.
export function Auditoria() {
  const [entidad, setEntidad] = useState('');
  const [accion, setAccion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<string | null>(null);

  const consulta = new URLSearchParams({ pagina: String(pagina), tamano: '20' });
  if (entidad !== '') consulta.set('entidad', entidad);
  if (accion.trim() !== '') consulta.set('accion', accion.trim());
  if (desde !== '') consulta.set('desde', desde);
  if (hasta !== '') consulta.set('hasta', hasta);

  const registros = useQuery({
    queryKey: ['auditoria', consulta.toString()],
    queryFn: () => api.get<ListaAuditoria>(`/auditoria?${consulta.toString()}`),
  });

  const filtrar = (cambio: () => void) => {
    cambio();
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bitácora de auditoría</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada operación sensible queda registrada con su autor, la fecha y el dato antes y después del cambio.
        </p>
      </div>

      <Tarjeta>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Seleccion etiqueta="Sobre" value={entidad} onChange={(e) => filtrar(() => setEntidad(e.target.value))}>
            <option value="">Todo</option>
            {registros.data?.entidades.map((clave) => (
              <option key={clave} value={clave}>
                {ENTIDADES[clave] ?? clave}
              </option>
            ))}
          </Seleccion>
          <Campo
            etiqueta="Acción contiene"
            placeholder="Ej. CERRAR, CANJEAR"
            value={accion}
            onChange={(e) => filtrar(() => setAccion(e.target.value))}
          />
          <Campo etiqueta="Desde" type="date" value={desde} onChange={(e) => filtrar(() => setDesde(e.target.value))} />
          <Campo etiqueta="Hasta" type="date" value={hasta} onChange={(e) => filtrar(() => setHasta(e.target.value))} />
        </div>
      </Tarjeta>

      {registros.isPending && <Cargando />}
      {registros.isError && <ErrorDelServidor error={registros.error} />}

      {registros.data !== undefined && (
        <Tarjeta>
          {registros.data.registros.length === 0 ? (
            <Vacio texto="No hay registros con esos filtros." />
          ) : (
            <Tabla cabeceras={['Fecha', 'Usuario', 'Sobre', 'Acción', '']}>
              {registros.data.registros.map((registro) => (
                <Fila
                  key={registro.id}
                  registro={registro}
                  abierto={abierto === registro.id}
                  onAlternar={() => setAbierto((actual) => (actual === registro.id ? null : registro.id))}
                />
              ))}
            </Tabla>
          )}

          {registros.data.paginas > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Página {registros.data.pagina} de {registros.data.paginas} · {registros.data.total} registros
              </span>
              <div className="flex gap-2">
                <Boton variante="secundario" disabled={pagina === 1} onClick={() => setPagina((a) => a - 1)}>
                  Anterior
                </Boton>
                <Boton
                  variante="secundario"
                  disabled={pagina >= registros.data.paginas}
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

function Fila({ registro, abierto, onAlternar }: { registro: RegistroAuditoria; abierto: boolean; onAlternar: () => void }) {
  return (
    <>
      <tr>
        <td className="py-3 pr-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{fechaLarga(registro.createdAt)}</td>
        <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
          {registro.usuario === null ? 'Sistema' : `${registro.usuario.nombres} ${registro.usuario.apellidos}`}
        </td>
        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{ENTIDADES[registro.entidad] ?? registro.entidad}</td>
        <td className="py-3 pr-4 font-mono text-xs text-slate-700 dark:text-slate-300">{registro.accion}</td>
        <td className="py-3 text-right">
          <Boton variante="plano" onClick={onAlternar}>
            {abierto ? 'Ocultar' : 'Ver datos'}
          </Boton>
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={5} className="pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Bloque titulo="Antes" datos={registro.datosAnteriores} />
              <Bloque titulo="Después" datos={registro.datosNuevos} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Bloque({ titulo, datos }: { titulo: string; datos: unknown }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{titulo}</p>
      <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {datos === null || datos === undefined ? '—' : JSON.stringify(datos, null, 2)}
      </pre>
    </div>
  );
}
