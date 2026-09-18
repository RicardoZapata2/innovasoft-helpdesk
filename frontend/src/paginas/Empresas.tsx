import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Aviso, Boton, Campo, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Tabla, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { fechaCorta } from '../lib/formato';
import type { Empresa } from '../lib/tipos';

const VACIO = {
  nit: '',
  razonSocial: '',
  direccion: '',
  telefono: '',
  nombresAdministrador: '',
  apellidosAdministrador: '',
  emailAdministrador: '',
};

export function Empresas() {
  const clienteQuery = useQueryClient();
  const [formulario, setFormulario] = useState(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [porCambiar, setPorCambiar] = useState<Empresa | null>(null);

  const empresas = useQuery({ queryKey: ['empresas'], queryFn: () => api.get<Empresa[]>('/empresas') });

  const habilitar = useMutation({
    mutationFn: () =>
      api.post<{ mensaje: string; emailAdministrador: string }>('/empresas', {
        ...formulario,
        direccion: formulario.direccion === '' ? undefined : formulario.direccion,
        telefono: formulario.telefono === '' ? undefined : formulario.telefono,
      }),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['empresas'] });
      setFormulario(VACIO);
      setAbierto(false);
    },
  });

  const editar = useMutation({
    mutationFn: (empresa: Empresa) =>
      api.patch(`/empresas/${empresa.id}`, {
        razonSocial: empresa.razonSocial,
        direccion: empresa.direccion ?? undefined,
        telefono: empresa.telefono ?? undefined,
      }),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['empresas'] });
      setEditando(null);
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: (empresa: Empresa) =>
      api.post(`/empresas/${empresa.id}/${empresa.activa ? 'desactivar' : 'activar'}`),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['empresas'] });
      setPorCambiar(null);
    },
  });

  function campo(nombre: keyof typeof VACIO) {
    return {
      value: formulario[nombre],
      onChange: (evento: { target: { value: string } }) =>
        setFormulario((actual) => ({ ...actual, [nombre]: evento.target.value })),
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Empresas cliente</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Al habilitar una empresa se crea su administrador y se le envían las credenciales.
          </p>
        </div>
        <Boton onClick={() => setAbierto((estado) => !estado)}>
          {abierto ? 'Cerrar' : 'Habilitar empresa'}
        </Boton>
      </div>

      {habilitar.isSuccess && (
        <Aviso tipo="exito">
          Empresa habilitada. La contraseña temporal se envió a {habilitar.data.emailAdministrador}.
        </Aviso>
      )}

      {abierto && (
        <Tarjeta titulo="Nueva empresa cliente">
          <div className="space-y-4">
            {habilitar.isError && <ErrorDelServidor error={habilitar.error} />}

            <div className="grid gap-4 md:grid-cols-2">
              <Campo etiqueta="NIT" placeholder="900123456" ayuda="9 o 10 dígitos" {...campo('nit')} />
              <Campo etiqueta="Razón social" {...campo('razonSocial')} />
              <Campo etiqueta="Dirección" {...campo('direccion')} />
              <Campo etiqueta="Teléfono" {...campo('telefono')} />
            </div>

            <h3 className="border-t border-slate-100 pt-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
              Administrador de la empresa
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <Campo etiqueta="Nombres" {...campo('nombresAdministrador')} />
              <Campo etiqueta="Apellidos" {...campo('apellidosAdministrador')} />
              <Campo etiqueta="Correo" type="email" {...campo('emailAdministrador')} />
            </div>

            <Boton onClick={() => habilitar.mutate()} disabled={habilitar.isPending}>
              {habilitar.isPending ? 'Habilitando…' : 'Habilitar'}
            </Boton>
          </div>
        </Tarjeta>
      )}

      {empresas.isPending && <Cargando />}
      {empresas.isError && <ErrorDelServidor error={empresas.error} />}
      {empresas.data?.length === 0 && <Vacio texto="Todavía no hay empresas registradas." />}
      {(editar.isError || cambiarEstado.isError) && (
        <ErrorDelServidor error={editar.error ?? cambiarEstado.error} />
      )}

      <Tarjeta>
        <Tabla cabeceras={['Razón social', 'NIT', 'Contacto', 'Usuarios', 'Desde', 'Estado', '']}>
          {empresas.data?.map((empresa) => (
            <tr key={empresa.id} className={empresa.activa ? '' : 'opacity-60'}>
              <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                {empresa.razonSocial}
              </td>
              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{empresa.nit}</td>
              <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">
                {empresa.telefono ?? '—'}
                <span className="block">{empresa.direccion ?? ''}</span>
              </td>
              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{empresa._count?.usuarios ?? '—'}</td>
              <td className="py-3 pr-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                {fechaCorta(empresa.createdAt)}
              </td>
              <td className="py-3 pr-4">
                <Etiqueta
                  texto={empresa.activa ? 'Activa' : 'Desactivada'}
                  color={empresa.activa ? 'verde' : 'slate'}
                />
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                <Boton variante="plano" onClick={() => setEditando({ ...empresa })}>
                  Editar
                </Boton>
                <Boton variante="plano" onClick={() => setPorCambiar(empresa)}>
                  {empresa.activa ? 'Desactivar' : 'Activar'}
                </Boton>
              </td>
            </tr>
          ))}
        </Tabla>
      </Tarjeta>

      {editando !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setEditando(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl
              dark:border-slate-700 dark:bg-slate-900"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Editar {editando.nit}
            </h2>

            <div className="mt-4 space-y-4">
              <Campo
                etiqueta="Razón social"
                value={editando.razonSocial}
                onChange={(evento) => setEditando({ ...editando, razonSocial: evento.target.value })}
              />
              <Campo
                etiqueta="Dirección"
                value={editando.direccion ?? ''}
                onChange={(evento) => setEditando({ ...editando, direccion: evento.target.value })}
              />
              <Campo
                etiqueta="Teléfono"
                value={editando.telefono ?? ''}
                onChange={(evento) => setEditando({ ...editando, telefono: evento.target.value })}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                El NIT no se puede cambiar: identifica a la empresa ante la DIAN y ante nosotros.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => setEditando(null)}>
                Cancelar
              </Boton>
              <Boton onClick={() => editar.mutate(editando)} disabled={editar.isPending}>
                {editar.isPending ? 'Guardando…' : 'Guardar'}
              </Boton>
            </div>
          </div>
        </div>
      )}

      {porCambiar !== null && (
        <Dialogo
          titulo={`${porCambiar.activa ? 'Desactivar' : 'Activar'} a ${porCambiar.razonSocial}`}
          descripcion={
            porCambiar.activa
              ? 'Sus usuarios dejarán de poder entrar y se cerrarán las sesiones abiertas. El historial de tickets, citas y puntos se conserva, y la empresa se puede volver a activar cuando quieras.'
              : 'La empresa y sus usuarios vuelven a quedar habilitados con las mismas credenciales de antes.'
          }
          textoConfirmar={porCambiar.activa ? 'Desactivar' : 'Activar'}
          varianteConfirmar={porCambiar.activa ? 'peligro' : 'principal'}
          ocupado={cambiarEstado.isPending}
          onConfirmar={() => cambiarEstado.mutate(porCambiar)}
          onCancelar={() => setPorCambiar(null)}
        />
      )}
    </div>
  );
}
