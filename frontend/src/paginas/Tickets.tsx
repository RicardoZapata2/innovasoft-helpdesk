import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SelectorEmpresa } from '../componentes/SelectorEmpresa';
import {
  Aviso, Boton, Campo, Cargando, ErrorDelServidor, Etiqueta, Seleccion, Tabla, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type { CatalogosTicket, ListaTickets, Prioridad } from '../lib/tipos';

export const COLOR_ESTADO_TICKET: Record<string, string> = {
  abierto: 'ambar',
  asignado: 'azul',
  en_atencion: 'azul',
  en_espera_cliente: 'ambar',
  resuelto: 'verde',
  cerrado: 'slate',
  reabierto: 'rojo',
};

export const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  BAJA: 'slate',
  MEDIA: 'azul',
  ALTA: 'ambar',
  CRITICA: 'rojo',
};

export function useCatalogosTicket() {
  return useQuery({
    queryKey: ['tickets', 'catalogos'],
    queryFn: () => api.get<CatalogosTicket>('/tickets/catalogos'),
    staleTime: 5 * 60 * 1000,
  });
}

export function Tickets() {
  const { usuario, puede } = useSesion();
  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';
  const catalogos = useCatalogosTicket();

  const [creando, setCreando] = useState(false);
  const [estado, setEstado] = useState('');
  const [categoria, setCategoria] = useState('');
  const [asesorId, setAsesorId] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);

  const consulta = new URLSearchParams({ pagina: String(pagina), tamano: '15' });
  if (estado !== '') consulta.set('estado', estado);
  if (categoria !== '') consulta.set('categoria', categoria);
  if (asesorId !== '') consulta.set('asesorId', asesorId);
  if (esInnovasoft && empresaId !== '') consulta.set('empresaId', empresaId);
  if (desde !== '') consulta.set('desde', `${desde}T00:00:00.000Z`);
  if (hasta !== '') consulta.set('hasta', `${hasta}T23:59:59.999Z`);
  if (buscar.trim() !== '') consulta.set('buscar', buscar.trim());

  const tickets = useQuery({
    queryKey: ['tickets', 'lista', consulta.toString()],
    queryFn: () => api.get<ListaTickets>(`/tickets?${consulta.toString()}`),
  });

  const filtrar = (accion: () => void) => {
    accion();
    setPagina(1);
  };

  const titulo = usuario?.perfil === 'Asesor' ? 'Mis casos asignados' : esInnovasoft ? 'Bandeja de tickets' : 'Mis solicitudes de soporte';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cada solicitud tiene un código único, un responsable y una línea de tiempo auditable.
          </p>
        </div>
        {puede('tickets.crear') && (
          <Boton onClick={() => setCreando((abierto) => !abierto)}>{creando ? 'Cerrar' : 'Nuevo ticket'}</Boton>
        )}
      </div>

      {creando && <FormularioTicket onCancelar={() => setCreando(false)} />}

      {/* Las pestañas por estado organizan la bandeja: el asesor ve de un
          vistazo cuántos casos tiene en cada etapa. */}
      <div className="flex flex-wrap gap-2">
        <PestanaEstado activa={estado === ''} texto="Todos" onClick={() => filtrar(() => setEstado(''))} />
        {tickets.data?.porEstado.map((grupo) => (
          <PestanaEstado
            key={grupo.clave}
            activa={estado === grupo.clave}
            texto={grupo.nombre}
            cantidad={grupo.cantidad}
            onClick={() => filtrar(() => setEstado(grupo.clave))}
          />
        ))}
      </div>

      <Tarjeta>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            etiqueta="Buscar"
            placeholder="Código o título"
            value={buscar}
            onChange={(evento) => filtrar(() => setBuscar(evento.target.value))}
          />
          <Seleccion etiqueta="Categoría" value={categoria} onChange={(e) => filtrar(() => setCategoria(e.target.value))}>
            <option value="">Todas</option>
            {catalogos.data?.categorias.map((opcion) => (
              <option key={opcion.clave} value={opcion.clave}>
                {opcion.nombre}
              </option>
            ))}
          </Seleccion>
          <Seleccion etiqueta="Asesor" value={asesorId} onChange={(e) => filtrar(() => setAsesorId(e.target.value))}>
            <option value="">Todos</option>
            {catalogos.data?.asesores.map((asesor) => (
              <option key={asesor.id} value={asesor.id}>
                {asesor.usuario.nombres} {asesor.usuario.apellidos}
              </option>
            ))}
          </Seleccion>
          {esInnovasoft && (
            <SelectorEmpresa
              valor={empresaId}
              onCambio={(valor) => filtrar(() => setEmpresaId(valor))}
              etiqueta="Empresa (vacío = todas)"
            />
          )}
          <Campo etiqueta="Desde" type="date" value={desde} onChange={(e) => filtrar(() => setDesde(e.target.value))} />
          <Campo etiqueta="Hasta" type="date" value={hasta} onChange={(e) => filtrar(() => setHasta(e.target.value))} />
        </div>
        <div className="mt-4">
          <Boton
            variante="secundario"
            onClick={() =>
              filtrar(() => {
                setEstado('');
                setCategoria('');
                setAsesorId('');
                setEmpresaId('');
                setDesde('');
                setHasta('');
                setBuscar('');
              })
            }
          >
            Limpiar filtros
          </Boton>
        </div>
      </Tarjeta>

      {tickets.isPending && <Cargando />}
      {tickets.isError && <ErrorDelServidor error={tickets.error} />}

      {tickets.data !== undefined && (
        <Tarjeta>
          {tickets.data.tickets.length === 0 ? (
            <Vacio texto="No hay tickets con esos filtros." />
          ) : (
            <Tabla cabeceras={['Código', 'Asunto', 'Estado', 'Prioridad', 'Asesor', 'Abierto']}>
              {tickets.data.tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-semibold text-marca-700 hover:underline dark:text-marca-300"
                    >
                      {ticket.codigo}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{ticket.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {ticket.categoria.nombre}
                      {esInnovasoft && ` · ${ticket.empresa.razonSocial}`}
                      {ticket._count.adjuntos > 0 && ` · ${ticket._count.adjuntos} adjunto(s)`}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <Etiqueta texto={ticket.estado.nombre} color={COLOR_ESTADO_TICKET[ticket.estado.clave]} />
                  </td>
                  <td className="py-3 pr-4">
                    <Etiqueta texto={ticket.prioridad} color={COLOR_PRIORIDAD[ticket.prioridad]} />
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                    {ticket.asesor === null ? (
                      <span className="text-xs text-slate-400">Sin asignar</span>
                    ) : (
                      `${ticket.asesor.usuario.nombres} ${ticket.asesor.usuario.apellidos}`
                    )}
                  </td>
                  <td className="py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {fechaCorta(ticket.abiertoEn)}
                  </td>
                </tr>
              ))}
            </Tabla>
          )}

          {tickets.data.paginas > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Página {tickets.data.pagina} de {tickets.data.paginas} · {tickets.data.total} tickets
              </span>
              <div className="flex gap-2">
                <Boton variante="secundario" disabled={pagina === 1} onClick={() => setPagina((a) => a - 1)}>
                  Anterior
                </Boton>
                <Boton
                  variante="secundario"
                  disabled={pagina >= tickets.data.paginas}
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

function PestanaEstado({
  activa,
  texto,
  cantidad,
  onClick,
}: {
  activa: boolean;
  texto: string;
  cantidad?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        activa
          ? 'border-marca-600 bg-marca-600 text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:border-marca-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {texto}
      {cantidad !== undefined && <span className={`ml-1.5 ${activa ? 'text-marca-100' : 'text-slate-400'}`}>{cantidad}</span>}
    </button>
  );
}

function FormularioTicket({ onCancelar }: { onCancelar: () => void }) {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const catalogos = useCatalogosTicket();
  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';

  const [empresaId, setEmpresaId] = useState('');
  const [categoria, setCategoria] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('MEDIA');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [avisoArchivo, setAvisoArchivo] = useState('');

  const maxMb = catalogos.data?.maxMbAdjunto ?? 10;

  // El ticket se crea primero y las evidencias se suben después, una por una:
  // así un archivo rechazado no impide que la solicitud quede registrada.
  const crear = useMutation({
    mutationFn: async () => {
      const ticket = await api.post<{ id: string }>('/tickets', {
        categoria,
        titulo,
        descripcion,
        prioridad,
        ...(esInnovasoft ? { empresaId } : {}),
      });

      for (const archivo of archivos) {
        await api.subir(`/tickets/${ticket.id}/adjuntos`, archivo);
      }

      return ticket;
    },
    onSuccess: (ticket) => {
      void clienteQuery.invalidateQueries({ queryKey: ['tickets'] });
      navegar(`/tickets/${ticket.id}`, { state: { creado: true } });
    },
  });

  function elegirArchivos(lista: FileList | null) {
    const elegidos = Array.from(lista ?? []);
    const validos = elegidos.filter((archivo) => archivo.size <= maxMb * 1024 * 1024);

    setAvisoArchivo(
      validos.length < elegidos.length ? `Se descartaron archivos de más de ${maxMb} MB.` : '',
    );
    setArchivos(validos);
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    crear.mutate();
  }

  return (
    <Tarjeta titulo="Registrar una solicitud de soporte">
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {esInnovasoft && <SelectorEmpresa valor={empresaId} onCambio={setEmpresaId} />}
          <Seleccion etiqueta="Categoría del servicio" required value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Elige una categoría…</option>
            {catalogos.data?.categorias.map((opcion) => (
              <option key={opcion.clave} value={opcion.clave}>
                {opcion.nombre} — {opcion.descripcion}
              </option>
            ))}
          </Seleccion>
          <Seleccion etiqueta="Prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
            <option value="BAJA">Baja — puede esperar</option>
            <option value="MEDIA">Media — afecta el trabajo, hay alternativa</option>
            <option value="ALTA">Alta — bloquea a un área</option>
            <option value="CRITICA">Crítica — la operación está detenida</option>
          </Seleccion>
        </div>

        <Campo
          etiqueta="Título"
          required
          minLength={5}
          maxLength={120}
          placeholder="Ej.: No se genera la factura electrónica"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</span>
          <textarea
            required
            minLength={10}
            rows={5}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Qué pasa, desde cuándo, a quién afecta y qué mensaje aparece."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800
              focus:border-marca-500 focus:outline-none focus:ring-1 focus:ring-marca-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {descripcion.trim().length} caracteres. Con 30 o más y una evidencia, tu empresa gana 5 puntos de fidelidad.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Evidencias (opcional)</span>
          <input
            type="file"
            multiple
            accept={catalogos.data?.tiposAdjunto.join(',')}
            onChange={(e) => elegirArchivos(e.target.files)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-marca-50
              file:px-4 file:py-2 file:text-sm file:font-medium file:text-marca-700 hover:file:bg-marca-100
              dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-marca-300"
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            Imágenes, PDF, texto, Word, Excel o ZIP. Máximo {maxMb} MB por archivo.
          </span>
        </label>

        {avisoArchivo !== '' && <Aviso tipo="aviso">{avisoArchivo}</Aviso>}
        {crear.isError && <ErrorDelServidor error={crear.error} />}

        <div className="flex gap-2">
          <Boton type="submit" disabled={crear.isPending || (esInnovasoft && empresaId === '')}>
            {crear.isPending ? 'Registrando…' : 'Registrar ticket'}
          </Boton>
          <Boton variante="secundario" onClick={onCancelar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
