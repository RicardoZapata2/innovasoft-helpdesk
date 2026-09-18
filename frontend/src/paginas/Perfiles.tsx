import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Aviso, Boton, Campo, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Seleccion, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import type { ModuloDePermisos, Perfil, PerfilDetalle } from '../lib/tipos';

const VACIO = { nombre: '', descripcion: '', ambito: 'EMPRESA' as 'EMPRESA' | 'INNOVASOFT' };

export function Perfiles() {
  const { puede } = useSesion();
  const clienteQuery = useQueryClient();

  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  const [formulario, setFormulario] = useState(VACIO);
  const [porEliminar, setPorEliminar] = useState<Perfil | null>(null);

  const perfiles = useQuery({ queryKey: ['perfiles'], queryFn: () => api.get<Perfil[]>('/perfiles') });
  const catalogo = useQuery({
    queryKey: ['permisos'],
    queryFn: () => api.get<ModuloDePermisos[]>('/permisos'),
  });

  const detalle = useQuery({
    queryKey: ['perfil', seleccionado],
    queryFn: () => api.get<PerfilDetalle>(`/perfiles/${seleccionado}`),
    enabled: seleccionado !== null,
  });

  useEffect(() => {
    if (detalle.data !== undefined) {
      setMarcados(detalle.data.permisos);
    }
  }, [detalle.data]);

  const guardar = useMutation({
    mutationFn: () => api.put(`/perfiles/${seleccionado}/permisos`, { permisos: marcados }),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['perfiles'] });
      void clienteQuery.invalidateQueries({ queryKey: ['perfil', seleccionado] });
    },
  });

  const crear = useMutation({
    mutationFn: () => api.post<PerfilDetalle>('/perfiles', { ...formulario, permisos: [] }),
    onSuccess: (creado) => {
      void clienteQuery.invalidateQueries({ queryKey: ['perfiles'] });
      setFormulario(VACIO);
      setCreando(false);
      setSeleccionado(creado.id);
    },
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/perfiles/${id}`),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['perfiles'] });
      setPorEliminar(null);
      setSeleccionado(null);
    },
  });

  function alternar(clave: string) {
    setMarcados((actual) =>
      actual.includes(clave) ? actual.filter((existente) => existente !== clave) : [...actual, clave],
    );
  }

  function alternarModulo(modulo: ModuloDePermisos) {
    const claves = modulo.permisos.map((permiso) => permiso.clave);
    const todosMarcados = claves.every((clave) => marcados.includes(clave));

    setMarcados((actual) =>
      todosMarcados
        ? actual.filter((clave) => !claves.includes(clave))
        : [...new Set([...actual, ...claves])],
    );
  }

  const cambiado =
    detalle.data !== undefined &&
    (marcados.length !== detalle.data.permisos.length ||
      marcados.some((clave) => !detalle.data.permisos.includes(clave)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Perfiles y permisos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Los permisos viven en la base de datos. Lo que marques aquí cambia lo que cada usuario
            puede hacer y ver, sin tocar el código.
          </p>
        </div>
        {puede('perfiles.crear') && (
          <Boton onClick={() => setCreando((abierto) => !abierto)}>
            {creando ? 'Cerrar' : 'Crear perfil'}
          </Boton>
        )}
      </div>

      {creando && (
        <Tarjeta titulo="Nuevo perfil">
          {crear.isError && <ErrorDelServidor error={crear.error} />}
          <div className="grid gap-4 md:grid-cols-3">
            <Campo
              etiqueta="Nombre"
              value={formulario.nombre}
              onChange={(evento) => setFormulario((a) => ({ ...a, nombre: evento.target.value }))}
            />
            <Campo
              etiqueta="Descripción"
              value={formulario.descripcion}
              onChange={(evento) => setFormulario((a) => ({ ...a, descripcion: evento.target.value }))}
            />
            <Seleccion
              etiqueta="Ámbito"
              value={formulario.ambito}
              onChange={(evento) =>
                setFormulario((a) => ({ ...a, ambito: evento.target.value as 'EMPRESA' | 'INNOVASOFT' }))
              }
            >
              <option value="EMPRESA">Empresa cliente</option>
              <option value="INNOVASOFT">Personal de Innovasoft</option>
            </Seleccion>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            El ámbito decide sobre qué datos trabaja: los de su empresa, o los de todas.
          </p>
          <div className="mt-4">
            <Boton onClick={() => crear.mutate()} disabled={crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear y asignar permisos'}
            </Boton>
          </div>
        </Tarjeta>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Perfiles" className="lg:col-span-1">
          {perfiles.isPending && <Cargando />}
          <ul className="space-y-2">
            {perfiles.data?.map((perfil) => (
              <li key={perfil.id}>
                <button
                  type="button"
                  onClick={() => setSeleccionado(perfil.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    seleccionado === perfil.id
                      ? 'border-marca-500 bg-marca-50 dark:border-marca-500 dark:bg-marca-900/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {perfil.nombre}
                    </span>
                    <Etiqueta
                      texto={perfil.ambito === 'INNOVASOFT' ? 'Innovasoft' : 'Cliente'}
                      color={perfil.ambito === 'INNOVASOFT' ? 'azul' : 'slate'}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{perfil.descripcion}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {perfil._count.permisos} permisos · {perfil._count.usuarios} usuarios
                    {perfil.esSistema ? ' · del sistema' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta
          titulo={detalle.data === undefined ? 'Permisos' : `Permisos de ${detalle.data.nombre}`}
          className="lg:col-span-2"
          accion={
            detalle.data !== undefined &&
            !detalle.data.esSistema &&
            puede('perfiles.eliminar') && (
              <Boton
                variante="plano"
                onClick={() => setPorEliminar(perfiles.data?.find((p) => p.id === seleccionado) ?? null)}
              >
                Eliminar perfil
              </Boton>
            )
          }
        >
          {seleccionado === null ? (
            <Vacio texto="Elige un perfil para ver y cambiar sus permisos." />
          ) : detalle.isPending ? (
            <Cargando />
          ) : (
            <div className="space-y-5">
              {detalle.data?.esSistema === true && (
                <Aviso tipo="aviso">
                  Es uno de los cinco perfiles iniciales. Puedes cambiar sus permisos, pero no
                  eliminarlo: el sistema lo necesita para funcionar.
                </Aviso>
              )}

              {guardar.isError && <ErrorDelServidor error={guardar.error} />}
              {guardar.isSuccess && !cambiado && <Aviso tipo="exito">Permisos guardados.</Aviso>}

              {catalogo.data?.map((modulo) => {
                const claves = modulo.permisos.map((permiso) => permiso.clave);
                const cuantos = claves.filter((clave) => marcados.includes(clave)).length;

                return (
                  <div key={modulo.modulo} className="border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                        {modulo.modulo}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {cuantos} de {claves.length}
                        </span>
                      </h3>
                      <Boton variante="plano" onClick={() => alternarModulo(modulo)}>
                        {cuantos === claves.length ? 'Quitar todo' : 'Marcar todo'}
                      </Boton>
                    </div>

                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {modulo.permisos.map((permiso) => (
                        <label
                          key={permiso.clave}
                          className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5
                            hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={marcados.includes(permiso.clave)}
                            onChange={() => alternar(permiso.clave)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
                          />
                          <span>
                            <span className="block text-sm text-slate-700 dark:text-slate-300">
                              {permiso.descripcion}
                            </span>
                            <code className="text-xs text-slate-400">{permiso.clave}</code>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              {puede('perfiles.asignar_permisos') && (
                <div className="flex items-center gap-3">
                  <Boton onClick={() => guardar.mutate()} disabled={!cambiado || guardar.isPending}>
                    {guardar.isPending ? 'Guardando…' : 'Guardar permisos'}
                  </Boton>
                  {cambiado && (
                    <span className="text-xs text-amber-700 dark:text-amber-400">Hay cambios sin guardar</span>
                  )}
                </div>
              )}
            </div>
          )}
        </Tarjeta>
      </div>

      {porEliminar !== null && (
        <Dialogo
          titulo={`Eliminar el perfil "${porEliminar.nombre}"`}
          descripcion="Solo se puede eliminar si no tiene usuarios asignados. Esta acción no se puede deshacer."
          textoConfirmar="Eliminar"
          varianteConfirmar="peligro"
          ocupado={eliminar.isPending}
          onConfirmar={() => eliminar.mutate(porEliminar.id)}
          onCancelar={() => setPorEliminar(null)}
        />
      )}

      {eliminar.isError && <ErrorDelServidor error={eliminar.error} />}
    </div>
  );
}
