import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Aviso, Boton, Campo, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Seleccion, Tabla, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { pesos } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import type {
  PlanAdministrado, RecompensaAdministrada, ReglaAdministrada, TarifaAdministrada,
} from '../lib/tipos';

type Pestana = 'planes' | 'tarifas' | 'recompensas' | 'reglas';

const PESTANAS: Array<{ clave: Pestana; texto: string; permiso: string }> = [
  { clave: 'planes', texto: 'Planes', permiso: 'puntos.administrar_planes' },
  { clave: 'tarifas', texto: 'Tarifario', permiso: 'puntos.administrar_tarifas' },
  { clave: 'recompensas', texto: 'Recompensas', permiso: 'fidelizacion.administrar_recompensas' },
  { clave: 'reglas', texto: 'Reglas de acumulación', permiso: 'fidelizacion.administrar_reglas' },
];

const TIPO_PLAN: Record<string, string> = { SUSCRIPCION: 'Suscripción', RECARGA: 'Recarga', BONO: 'Bono' };

const TIPO_RECOMPENSA: Record<string, { nombre: string; valor: string }> = {
  DESCUENTO_RENOVACION: { nombre: 'Descuento en la renovación', valor: 'Porcentaje de descuento' },
  SERVICIO_SIN_CONSUMO: { nombre: 'Servicio sin consumo de puntos', valor: 'Servicios cubiertos' },
  RECARGA_PUNTOS: { nombre: 'Recarga de puntos de servicio', valor: 'Puntos que entrega' },
};

const EVENTO: Record<string, string> = {
  TICKET_CON_EVIDENCIA: 'El cliente registra un ticket con descripción y evidencia',
  ENCUESTA_RESPONDIDA: 'El cliente responde la encuesta de satisfacción',
  RENOVACION_ANTICIPADA: 'La empresa renueva su plan antes de que venza',
};

// Portafolio comercial administrable sin tocar código: lo que aquí se cambia es
// lo que ve el sitio público y lo que se cobra en las contrataciones nuevas.
export function Catalogo() {
  const { puede } = useSesion();
  const visibles = PESTANAS.filter((pestana) => puede(pestana.permiso));
  const [actual, setActual] = useState<Pestana>(visibles[0]?.clave ?? 'planes');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Catálogo comercial</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Planes, tarifas de servicio y programa de fidelización. Los cambios aplican a las contrataciones y canjes
          que se hagan desde ahora; lo ya vendido conserva sus condiciones.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {visibles.map((pestana) => (
          <button
            key={pestana.clave}
            type="button"
            onClick={() => setActual(pestana.clave)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              actual === pestana.clave
                ? 'border-marca-600 text-marca-700 dark:text-marca-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {pestana.texto}
          </button>
        ))}
      </div>

      {actual === 'planes' && <Planes />}
      {actual === 'tarifas' && <Tarifas />}
      {actual === 'recompensas' && <Recompensas />}
      {actual === 'reglas' && <Reglas />}
    </div>
  );
}

// Cada pestaña sigue el mismo patrón: lista, formulario para crear o editar, y
// un diálogo antes de activar o desactivar.
function useGuardar<T>(ruta: string, clave: string, onListo: () => void) {
  const clienteQuery = useQueryClient();

  return useMutation({
    mutationFn: ({ id, datos }: { id?: string; datos: T }) =>
      id === undefined ? api.post(ruta, datos) : api.patch(`${ruta}/${id}`, datos),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: [clave] });
      void clienteQuery.invalidateQueries({ queryKey: ['planes'] });
      onListo();
    },
  });
}

function Estado({ activo }: { activo: boolean }) {
  return <Etiqueta texto={activo ? 'Activo' : 'Inactivo'} color={activo ? 'verde' : 'slate'} />;
}

type FormPlan = {
  clave: string;
  nombre: string;
  descripcion: string;
  tipo: 'SUSCRIPCION' | 'RECARGA' | 'BONO';
  puntosIncluidos: string;
  esIlimitado: boolean;
  diasVigencia: string;
  precio: string;
};

const PLAN_VACIO: FormPlan = {
  clave: '', nombre: '', descripcion: '', tipo: 'SUSCRIPCION', puntosIncluidos: '', esIlimitado: false, diasVigencia: '30', precio: '',
};

function Planes() {
  const [editando, setEditando] = useState<{ id?: string; datos: FormPlan } | null>(null);
  const [cambiando, setCambiando] = useState<PlanAdministrado | null>(null);
  const [mensaje, setMensaje] = useState('');

  const planes = useQuery({ queryKey: ['admin-planes'], queryFn: () => api.get<PlanAdministrado[]>('/catalogo/planes') });
  const guardar = useGuardar<object>('/catalogo/planes', 'admin-planes', () => {
    setMensaje(editando?.id === undefined && cambiando === null ? 'Plan creado.' : 'Cambios guardados.');
    setEditando(null);
    setCambiando(null);
  });

  const enviar = () => {
    if (editando === null) return;
    const d = editando.datos;
    guardar.mutate({
      id: editando.id,
      datos: {
        clave: d.clave.trim(),
        nombre: d.nombre,
        descripcion: d.descripcion,
        tipo: d.tipo,
        esIlimitado: d.esIlimitado,
        puntosIncluidos: d.esIlimitado ? null : Number(d.puntosIncluidos),
        diasVigencia: Number(d.diasVigencia),
        precio: Number(d.precio),
      },
    });
  };

  const campo = (nombre: keyof FormPlan) => ({
    value: String(editando?.datos[nombre] ?? ''),
    onChange: (evento: { target: { value: string } }) =>
      setEditando((actual) => (actual === null ? actual : { ...actual, datos: { ...actual.datos, [nombre]: evento.target.value } })),
  });

  return (
    <>
      {mensaje !== '' && <Aviso tipo="exito">{mensaje}</Aviso>}
      {guardar.isError && editando === null && <ErrorDelServidor error={guardar.error} />}

      {editando !== null ? (
        <Tarjeta titulo={editando.id === undefined ? 'Nuevo plan' : 'Editar plan'}>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo etiqueta="Nombre" {...campo('nombre')} />
            <Campo etiqueta="Clave" ayuda="En minúsculas y sin espacios, ej. plan_pyme" {...campo('clave')} />
            <div className="md:col-span-2">
              <Campo etiqueta="Descripción" {...campo('descripcion')} />
            </div>
            <Seleccion etiqueta="Tipo" {...campo('tipo')}>
              <option value="SUSCRIPCION">Suscripción</option>
              <option value="RECARGA">Recarga</option>
              <option value="BONO">Bono</option>
            </Seleccion>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editando.datos.esIlimitado}
                onChange={(evento) =>
                  setEditando({ ...editando, datos: { ...editando.datos, esIlimitado: evento.target.checked } })
                }
              />
              Servicios ilimitados (no cuenta puntos)
            </label>
            {!editando.datos.esIlimitado && <Campo etiqueta="Puntos incluidos" type="number" min={1} {...campo('puntosIncluidos')} />}
            <Campo etiqueta="Vigencia (días)" type="number" min={1} {...campo('diasVigencia')} />
            <Campo etiqueta="Precio (COP)" type="number" min={0} step={1000} {...campo('precio')} />
          </div>
          {guardar.isError && (
            <div className="mt-4">
              <ErrorDelServidor error={guardar.error} />
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Boton onClick={enviar} disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Boton>
            <Boton variante="secundario" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
          </div>
        </Tarjeta>
      ) : (
        <Tarjeta
          titulo="Planes"
          accion={
            <Boton
              onClick={() => {
                setMensaje('');
                guardar.reset();
                setEditando({ datos: PLAN_VACIO });
              }}
            >
              Nuevo plan
            </Boton>
          }
        >
          {planes.isPending && <Cargando />}
          {planes.isError && <ErrorDelServidor error={planes.error} />}
          {planes.data !== undefined && (
            <Tabla cabeceras={['Plan', 'Tipo', 'Puntos', 'Vigencia', 'Precio', 'Ventas', 'Estado', '']}>
              {planes.data.map((plan) => (
                <tr key={plan.id} className={plan.activo ? '' : 'opacity-60'}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{plan.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plan.descripcion}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{TIPO_PLAN[plan.tipo]}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{plan.esIlimitado ? 'Ilimitado' : plan.puntosIncluidos}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{plan.diasVigencia} días</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{pesos(plan.precio)}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{plan._count.suscripciones}</td>
                  <td className="py-3 pr-4">
                    <Estado activo={plan.activo} />
                  </td>
                  <td className="py-3 whitespace-nowrap text-right">
                    <Boton
                      variante="plano"
                      onClick={() => {
                        setMensaje('');
                        guardar.reset();
                        setEditando({
                          id: plan.id,
                          datos: {
                            clave: plan.clave,
                            nombre: plan.nombre,
                            descripcion: plan.descripcion,
                            tipo: plan.tipo,
                            puntosIncluidos: String(plan.puntosIncluidos ?? ''),
                            esIlimitado: plan.esIlimitado,
                            diasVigencia: String(plan.diasVigencia),
                            precio: String(Number(plan.precio)),
                          },
                        });
                      }}
                    >
                      Editar
                    </Boton>
                    <Boton variante="plano" onClick={() => setCambiando(plan)}>
                      {plan.activo ? 'Desactivar' : 'Activar'}
                    </Boton>
                  </td>
                </tr>
              ))}
            </Tabla>
          )}
        </Tarjeta>
      )}

      {cambiando !== null && (
        <Dialogo
          titulo={`¿${cambiando.activo ? 'Desactivar' : 'Activar'} el plan ${cambiando.nombre}?`}
          descripcion={
            cambiando.activo
              ? 'Deja de aparecer en el sitio público y no se podrá contratar. Las empresas que ya lo tienen conservan su bolsa hasta que venza.'
              : 'Vuelve a aparecer en el sitio público y se puede contratar.'
          }
          textoConfirmar={cambiando.activo ? 'Desactivar' : 'Activar'}
          varianteConfirmar={cambiando.activo ? 'peligro' : 'principal'}
          ocupado={guardar.isPending}
          onConfirmar={() => guardar.mutate({ id: cambiando.id, datos: { activo: !cambiando.activo } })}
          onCancelar={() => setCambiando(null)}
        />
      )}
    </>
  );
}

function Tarifas() {
  const [editando, setEditando] = useState<{ id?: string; clave: string; nombre: string; puntos: string } | null>(null);
  const [cambiando, setCambiando] = useState<TarifaAdministrada | null>(null);
  const [mensaje, setMensaje] = useState('');

  const tarifas = useQuery({ queryKey: ['admin-tarifas'], queryFn: () => api.get<TarifaAdministrada[]>('/catalogo/tarifas') });
  const guardar = useGuardar<object>('/catalogo/tarifas', 'admin-tarifas', () => {
    setMensaje('Tarifario actualizado.');
    setEditando(null);
    setCambiando(null);
  });

  return (
    <>
      {mensaje !== '' && <Aviso tipo="exito">{mensaje}</Aviso>}
      {guardar.isError && editando === null && <ErrorDelServidor error={guardar.error} />}

      {editando !== null && (
        <Tarjeta titulo={editando.id === undefined ? 'Nuevo servicio' : 'Editar servicio'}>
          <div className="grid gap-4 md:grid-cols-3">
            <Campo etiqueta="Servicio" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
            <Campo etiqueta="Clave" value={editando.clave} onChange={(e) => setEditando({ ...editando, clave: e.target.value })} />
            <Campo
              etiqueta="Puntos que cuesta"
              type="number"
              min={1}
              value={editando.puntos}
              onChange={(e) => setEditando({ ...editando, puntos: e.target.value })}
            />
          </div>
          {guardar.isError && (
            <div className="mt-4">
              <ErrorDelServidor error={guardar.error} />
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Boton
              disabled={guardar.isPending}
              onClick={() =>
                guardar.mutate({
                  id: editando.id,
                  datos: { clave: editando.clave.trim(), nombre: editando.nombre, puntos: Number(editando.puntos) },
                })
              }
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Boton>
            <Boton variante="secundario" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
          </div>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Tarifario de servicios"
        accion={
          <Boton
            onClick={() => {
              setMensaje('');
              guardar.reset();
              setEditando({ clave: '', nombre: '', puntos: '' });
            }}
          >
            Nuevo servicio
          </Boton>
        }
      >
        {tarifas.isPending && <Cargando />}
        {tarifas.data !== undefined && (
          <Tabla cabeceras={['Servicio', 'Puntos', 'Usada por', 'Estado', '']}>
            {tarifas.data.map((tarifa) => (
              <tr key={tarifa.id} className={tarifa.activo ? '' : 'opacity-60'}>
                <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">{tarifa.nombre}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{tarifa.puntos}</td>
                <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">
                  {tarifa.modalidades.length > 0 ? `Citas ${tarifa.modalidades.map((m) => m.nombre.toLowerCase()).join(', ')}` : 'Tickets'}
                </td>
                <td className="py-3 pr-4">
                  <Estado activo={tarifa.activo} />
                </td>
                <td className="py-3 whitespace-nowrap text-right">
                  <Boton
                    variante="plano"
                    onClick={() => {
                      setMensaje('');
                      guardar.reset();
                      setEditando({ id: tarifa.id, clave: tarifa.clave, nombre: tarifa.nombre, puntos: String(tarifa.puntos) });
                    }}
                  >
                    Editar
                  </Boton>
                  <Boton variante="plano" onClick={() => setCambiando(tarifa)}>
                    {tarifa.activo ? 'Desactivar' : 'Activar'}
                  </Boton>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Tarjeta>

      {cambiando !== null && (
        <Dialogo
          titulo={`¿${cambiando.activo ? 'Desactivar' : 'Activar'} "${cambiando.nombre}"?`}
          descripcion={
            cambiando.activo
              ? 'Deja de ofrecerse al cerrar tickets. Los consumos ya registrados no cambian.'
              : 'Vuelve a estar disponible al cerrar tickets.'
          }
          textoConfirmar={cambiando.activo ? 'Desactivar' : 'Activar'}
          varianteConfirmar={cambiando.activo ? 'peligro' : 'principal'}
          ocupado={guardar.isPending}
          onConfirmar={() => guardar.mutate({ id: cambiando.id, datos: { activo: !cambiando.activo } })}
          onCancelar={() => setCambiando(null)}
        />
      )}
    </>
  );
}

type FormRecompensa = {
  clave: string;
  nombre: string;
  descripcion: string;
  costoPuntos: string;
  tipo: 'DESCUENTO_RENOVACION' | 'SERVICIO_SIN_CONSUMO' | 'RECARGA_PUNTOS';
  valor: string;
  diasVigenciaBeneficio: string;
};

function Recompensas() {
  const [editando, setEditando] = useState<{ id?: string; datos: FormRecompensa } | null>(null);
  const [cambiando, setCambiando] = useState<RecompensaAdministrada | null>(null);
  const [mensaje, setMensaje] = useState('');

  const recompensas = useQuery({
    queryKey: ['admin-recompensas'],
    queryFn: () => api.get<RecompensaAdministrada[]>('/fidelizacion/catalogo/recompensas'),
  });
  const guardar = useGuardar<object>('/fidelizacion/catalogo/recompensas', 'admin-recompensas', () => {
    setMensaje('Catálogo de recompensas actualizado.');
    setEditando(null);
    setCambiando(null);
  });

  const campo = (nombre: keyof FormRecompensa) => ({
    value: editando?.datos[nombre] ?? '',
    onChange: (evento: { target: { value: string } }) =>
      setEditando((actual) => (actual === null ? actual : { ...actual, datos: { ...actual.datos, [nombre]: evento.target.value } })),
  });

  return (
    <>
      {mensaje !== '' && <Aviso tipo="exito">{mensaje}</Aviso>}
      {guardar.isError && editando === null && <ErrorDelServidor error={guardar.error} />}

      {editando !== null && (
        <Tarjeta titulo={editando.id === undefined ? 'Nueva recompensa' : 'Editar recompensa'}>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo etiqueta="Nombre" {...campo('nombre')} />
            <Campo etiqueta="Clave" ayuda="En minúsculas y sin espacios" {...campo('clave')} />
            <div className="md:col-span-2">
              <Campo etiqueta="Descripción" {...campo('descripcion')} />
            </div>
            <Seleccion etiqueta="Tipo de beneficio" {...campo('tipo')}>
              {Object.entries(TIPO_RECOMPENSA).map(([clave, tipo]) => (
                <option key={clave} value={clave}>
                  {tipo.nombre}
                </option>
              ))}
            </Seleccion>
            <Campo etiqueta={TIPO_RECOMPENSA[editando.datos.tipo].valor} type="number" min={1} {...campo('valor')} />
            <Campo etiqueta="Costo en puntos de fidelidad" type="number" min={1} {...campo('costoPuntos')} />
            <Campo etiqueta="Días para usar el beneficio" type="number" min={1} ayuda="Vacío = no vence" {...campo('diasVigenciaBeneficio')} />
          </div>
          {guardar.isError && (
            <div className="mt-4">
              <ErrorDelServidor error={guardar.error} />
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Boton
              disabled={guardar.isPending}
              onClick={() => {
                const d = editando.datos;
                guardar.mutate({
                  id: editando.id,
                  datos: {
                    clave: d.clave.trim(),
                    nombre: d.nombre,
                    descripcion: d.descripcion,
                    tipo: d.tipo,
                    valor: Number(d.valor),
                    costoPuntos: Number(d.costoPuntos),
                    diasVigenciaBeneficio: d.diasVigenciaBeneficio === '' ? null : Number(d.diasVigenciaBeneficio),
                  },
                });
              }}
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Boton>
            <Boton variante="secundario" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
          </div>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Recompensas"
        accion={
          <Boton
            onClick={() => {
              setMensaje('');
              guardar.reset();
              setEditando({
                datos: { clave: '', nombre: '', descripcion: '', costoPuntos: '', tipo: 'DESCUENTO_RENOVACION', valor: '', diasVigenciaBeneficio: '90' },
              });
            }}
          >
            Nueva recompensa
          </Boton>
        }
      >
        {recompensas.isPending && <Cargando />}
        {recompensas.data !== undefined && (
          <Tabla cabeceras={['Recompensa', 'Beneficio', 'Costo', 'Vigencia', 'Canjes', 'Estado', '']}>
            {recompensas.data.map((recompensa) => (
              <tr key={recompensa.id} className={recompensa.activa ? '' : 'opacity-60'}>
                <td className="py-3 pr-4">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{recompensa.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{recompensa.descripcion}</p>
                </td>
                <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">
                  {TIPO_RECOMPENSA[recompensa.tipo].nombre}
                  {recompensa.tipo === 'DESCUENTO_RENOVACION' && ` (${Number(recompensa.valor)} %)`}
                  {recompensa.tipo === 'RECARGA_PUNTOS' && ` (${Number(recompensa.valor)} puntos)`}
                </td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{recompensa.costoPuntos}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                  {recompensa.diasVigenciaBeneficio === null ? 'No vence' : `${recompensa.diasVigenciaBeneficio} días`}
                </td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{recompensa._count.canjes}</td>
                <td className="py-3 pr-4">
                  <Estado activo={recompensa.activa} />
                </td>
                <td className="py-3 whitespace-nowrap text-right">
                  <Boton
                    variante="plano"
                    onClick={() => {
                      setMensaje('');
                      guardar.reset();
                      setEditando({
                        id: recompensa.id,
                        datos: {
                          clave: recompensa.clave,
                          nombre: recompensa.nombre,
                          descripcion: recompensa.descripcion,
                          costoPuntos: String(recompensa.costoPuntos),
                          tipo: recompensa.tipo,
                          valor: String(Number(recompensa.valor)),
                          diasVigenciaBeneficio: recompensa.diasVigenciaBeneficio === null ? '' : String(recompensa.diasVigenciaBeneficio),
                        },
                      });
                    }}
                  >
                    Editar
                  </Boton>
                  <Boton variante="plano" onClick={() => setCambiando(recompensa)}>
                    {recompensa.activa ? 'Desactivar' : 'Activar'}
                  </Boton>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Tarjeta>

      {cambiando !== null && (
        <Dialogo
          titulo={`¿${cambiando.activa ? 'Desactivar' : 'Activar'} "${cambiando.nombre}"?`}
          descripcion={
            cambiando.activa
              ? 'Sale del catálogo y ya no se podrá canjear. Los canjes hechos se respetan.'
              : 'Vuelve al catálogo de recompensas.'
          }
          textoConfirmar={cambiando.activa ? 'Desactivar' : 'Activar'}
          varianteConfirmar={cambiando.activa ? 'peligro' : 'principal'}
          ocupado={guardar.isPending}
          onConfirmar={() => guardar.mutate({ id: cambiando.id, datos: { activa: !cambiando.activa } })}
          onCancelar={() => setCambiando(null)}
        />
      )}
    </>
  );
}

function Reglas() {
  const [editando, setEditando] = useState<{ id: string; nombre: string; puntos: string } | null>(null);
  const [cambiando, setCambiando] = useState<ReglaAdministrada | null>(null);
  const [mensaje, setMensaje] = useState('');

  const reglas = useQuery({ queryKey: ['admin-reglas'], queryFn: () => api.get<ReglaAdministrada[]>('/fidelizacion/catalogo/reglas') });
  const guardar = useGuardar<object>('/fidelizacion/catalogo/reglas', 'admin-reglas', () => {
    setMensaje('Regla actualizada.');
    setEditando(null);
    setCambiando(null);
  });

  return (
    <>
      {mensaje !== '' && <Aviso tipo="exito">{mensaje}</Aviso>}
      {guardar.isError && <ErrorDelServidor error={guardar.error} />}

      <Tarjeta titulo="Cómo se ganan los puntos de fidelidad">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Cada regla responde a un evento que la aplicación detecta sola. Aquí se decide cuánto vale y si está activa.
        </p>
        {reglas.isPending && <Cargando />}
        {reglas.data?.length === 0 && <Vacio texto="No hay reglas cargadas." />}
        {reglas.data !== undefined && (
          <Tabla cabeceras={['Regla', 'Cuándo aplica', 'Puntos', 'Otorgadas', 'Estado', '']}>
            {reglas.data.map((regla) =>
              editando?.id === regla.id ? (
                <tr key={regla.id}>
                  <td className="py-3 pr-4">
                    <Campo etiqueta="Nombre" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">{EVENTO[regla.evento]}</td>
                  <td className="py-3 pr-4">
                    <Campo etiqueta="Puntos" type="number" min={1} value={editando.puntos} onChange={(e) => setEditando({ ...editando, puntos: e.target.value })} />
                  </td>
                  <td colSpan={3} className="py-3 text-right whitespace-nowrap">
                    <Boton
                      disabled={guardar.isPending}
                      onClick={() => guardar.mutate({ id: regla.id, datos: { nombre: editando.nombre, puntos: Number(editando.puntos) } })}
                    >
                      Guardar
                    </Boton>
                    <Boton variante="plano" onClick={() => setEditando(null)}>
                      Cancelar
                    </Boton>
                  </td>
                </tr>
              ) : (
                <tr key={regla.id} className={regla.activa ? '' : 'opacity-60'}>
                  <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">{regla.nombre}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">{EVENTO[regla.evento]}</td>
                  <td className="py-3 pr-4 font-semibold text-marca-700 dark:text-marca-300">+{regla.puntos}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{regla._count.movimientos}</td>
                  <td className="py-3 pr-4">
                    <Estado activo={regla.activa} />
                  </td>
                  <td className="py-3 whitespace-nowrap text-right">
                    <Boton
                      variante="plano"
                      onClick={() => {
                        setMensaje('');
                        guardar.reset();
                        setEditando({ id: regla.id, nombre: regla.nombre, puntos: String(regla.puntos) });
                      }}
                    >
                      Editar
                    </Boton>
                    <Boton variante="plano" onClick={() => setCambiando(regla)}>
                      {regla.activa ? 'Desactivar' : 'Activar'}
                    </Boton>
                  </td>
                </tr>
              ),
            )}
          </Tabla>
        )}
      </Tarjeta>

      {cambiando !== null && (
        <Dialogo
          titulo={`¿${cambiando.activa ? 'Desactivar' : 'Activar'} "${cambiando.nombre}"?`}
          descripcion={
            cambiando.activa
              ? 'Mientras esté inactiva, ese evento no otorgará puntos de fidelidad. Lo ya otorgado se conserva.'
              : 'Ese evento vuelve a otorgar puntos de fidelidad.'
          }
          textoConfirmar={cambiando.activa ? 'Desactivar' : 'Activar'}
          varianteConfirmar={cambiando.activa ? 'peligro' : 'principal'}
          ocupado={guardar.isPending}
          onConfirmar={() => guardar.mutate({ id: cambiando.id, datos: { activa: !cambiando.activa } })}
          onCancelar={() => setCambiando(null)}
        />
      )}
    </>
  );
}
