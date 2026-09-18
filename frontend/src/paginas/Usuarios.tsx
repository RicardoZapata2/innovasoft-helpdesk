import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SelectorEmpresa } from '../componentes/SelectorEmpresa';
import {
  Aviso, Boton, Campo, Cargando, Dialogo, ErrorDelServidor, Etiqueta, Seleccion, Tabla, Tarjeta, Vacio,
} from '../componentes/base';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import type { Empresa, Perfil, UsuarioListado } from '../lib/tipos';

const VACIO = { nombres: '', apellidos: '', email: '', perfil: '', especialidad: '', empresaId: '' };

export function Usuarios() {
  const { usuario, puede } = useSesion();
  const clienteQuery = useQueryClient();

  const [formulario, setFormulario] = useState(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [porCambiar, setPorCambiar] = useState<UsuarioListado | null>(null);
  const [cambiandoPerfil, setCambiandoPerfil] = useState<UsuarioListado | null>(null);
  const [nuevoPerfil, setNuevoPerfil] = useState('');

  const esInnovasoft = usuario?.ambito === 'INNOVASOFT';

  const consulta = esInnovasoft && filtroEmpresa !== '' ? `?empresaId=${filtroEmpresa}` : '';

  const usuarios = useQuery({
    queryKey: ['usuarios', consulta],
    queryFn: () => api.get<UsuarioListado[]>(`/usuarios${consulta}`),
  });

  const perfiles = useQuery({ queryKey: ['perfiles'], queryFn: () => api.get<Perfil[]>('/perfiles') });

  const empresas = useQuery({
    queryKey: ['empresas'],
    queryFn: () => api.get<Empresa[]>('/empresas'),
    enabled: esInnovasoft,
  });

  const perfilElegido = perfiles.data?.find((perfil) => perfil.nombre === formulario.perfil);

  const crear = useMutation({
    mutationFn: () =>
      api.post<{ mensaje: string; email: string }>('/usuarios', {
        nombres: formulario.nombres,
        apellidos: formulario.apellidos,
        email: formulario.email,
        perfil: formulario.perfil,
        ...(formulario.especialidad === '' ? {} : { especialidad: formulario.especialidad }),
        ...(formulario.empresaId === '' ? {} : { empresaId: formulario.empresaId }),
      }),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['usuarios'] });
      void clienteQuery.invalidateQueries({ queryKey: ['asesores'] });
      setFormulario(VACIO);
      setAbierto(false);
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: (registro: UsuarioListado) =>
      api.post(`/usuarios/${registro.id}/${registro.activo ? 'desactivar' : 'activar'}`),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['usuarios'] });
      setPorCambiar(null);
    },
  });

  const cambiarPerfil = useMutation({
    mutationFn: (registro: UsuarioListado) =>
      api.patch(`/usuarios/${registro.id}/perfil`, { perfil: nuevoPerfil }),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: ['usuarios'] });
      setCambiandoPerfil(null);
    },
  });

  function campo(nombre: keyof typeof VACIO) {
    return {
      value: formulario[nombre],
      onChange: (evento: { target: { value: string } }) =>
        setFormulario((actual) => ({ ...actual, [nombre]: evento.target.value })),
    };
  }

  const perfilesCompatibles = (registro: UsuarioListado) =>
    perfiles.data?.filter((perfil) =>
      registro.empresa === null ? perfil.ambito === 'INNOVASOFT' : perfil.ambito === 'EMPRESA',
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cada usuario nace con una contraseña temporal que debe cambiar al entrar.
          </p>
        </div>
        {puede('usuarios.crear') && (
          <Boton onClick={() => setAbierto((estado) => !estado)}>
            {abierto ? 'Cerrar' : 'Crear usuario'}
          </Boton>
        )}
      </div>

      {crear.isSuccess && (
        <Aviso tipo="exito">Usuario creado. Las credenciales se enviaron a {crear.data.email}.</Aviso>
      )}

      {abierto && (
        <Tarjeta titulo="Nuevo usuario">
          <div className="space-y-4">
            {crear.isError && <ErrorDelServidor error={crear.error} />}

            <div className="grid gap-4 md:grid-cols-3">
              <Campo etiqueta="Nombres" {...campo('nombres')} />
              <Campo etiqueta="Apellidos" {...campo('apellidos')} />
              <Campo etiqueta="Correo" type="email" {...campo('email')} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Seleccion etiqueta="Perfil" {...campo('perfil')}>
                <option value="">Elige un perfil…</option>
                {perfiles.data
                  ?.filter((perfil) => esInnovasoft || perfil.ambito === 'EMPRESA')
                  .map((perfil) => (
                    <option key={perfil.id} value={perfil.nombre}>
                      {perfil.nombre} ({perfil._count.permisos} permisos)
                    </option>
                  ))}
              </Seleccion>

              {formulario.perfil === 'Asesor' && (
                <Campo etiqueta="Especialidad" placeholder="Redes, bases de datos…" {...campo('especialidad')} />
              )}

              {esInnovasoft && perfilElegido?.ambito === 'EMPRESA' && (
                <Seleccion etiqueta="Empresa" {...campo('empresaId')}>
                  <option value="">Elige la empresa…</option>
                  {empresas.data
                    ?.filter((empresa) => empresa.activa)
                    .map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.razonSocial}
                      </option>
                    ))}
                </Seleccion>
              )}
            </div>

            {perfilElegido !== undefined && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {perfilElegido.descripcion}. Ámbito{' '}
                {perfilElegido.ambito === 'INNOVASOFT'
                  ? 'interno: trabaja sobre todas las empresas.'
                  : 'de empresa cliente: solo ve los datos de su empresa.'}
              </p>
            )}

            <Boton onClick={() => crear.mutate()} disabled={crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear'}
            </Boton>
          </div>
        </Tarjeta>
      )}

      {esInnovasoft && (
        <Tarjeta>
          <div className="max-w-sm">
            <SelectorEmpresa
              valor={filtroEmpresa}
              onCambio={setFiltroEmpresa}
              etiqueta="Filtrar por empresa (vacío = todos)"
            />
          </div>
        </Tarjeta>
      )}

      {usuarios.isPending && <Cargando />}
      {usuarios.isError && <ErrorDelServidor error={usuarios.error} />}
      {usuarios.data?.length === 0 && <Vacio texto="No hay usuarios con ese filtro." />}
      {(cambiarEstado.isError || cambiarPerfil.isError) && (
        <ErrorDelServidor error={cambiarEstado.error ?? cambiarPerfil.error} />
      )}

      <Tarjeta>
        <Tabla cabeceras={['Nombre', 'Correo', 'Perfil', 'Empresa', 'Estado', '']}>
          {usuarios.data?.map((registro) => (
            <tr key={registro.id} className={registro.activo ? '' : 'opacity-60'}>
              <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                {registro.nombres} {registro.apellidos}
                {registro.asesor?.especialidad != null && (
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                    {registro.asesor.especialidad}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{registro.email}</td>
              <td className="py-3 pr-4">
                <Etiqueta
                  texto={registro.perfil.nombre}
                  color={registro.perfil.ambito === 'INNOVASOFT' ? 'azul' : 'slate'}
                />
              </td>
              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                {registro.empresa?.razonSocial ?? 'Innovasoft'}
              </td>
              <td className="py-3 pr-4">
                {!registro.activo ? (
                  <Etiqueta texto="Inactivo" color="slate" />
                ) : registro.debeCambiarPassword ? (
                  <Etiqueta texto="Sin estrenar" color="ambar" />
                ) : (
                  <Etiqueta texto="Activo" color="verde" />
                )}
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                {puede('usuarios.asignar_perfil') && registro.id !== usuario?.id && (
                  <Boton
                    variante="plano"
                    onClick={() => {
                      setCambiandoPerfil(registro);
                      setNuevoPerfil(registro.perfil.nombre);
                    }}
                  >
                    Cambiar perfil
                  </Boton>
                )}
                {puede('usuarios.desactivar') && registro.id !== usuario?.id && (
                  <Boton variante="plano" onClick={() => setPorCambiar(registro)}>
                    {registro.activo ? 'Desactivar' : 'Activar'}
                  </Boton>
                )}
              </td>
            </tr>
          ))}
        </Tabla>
      </Tarjeta>

      {porCambiar !== null && (
        <Dialogo
          titulo={`${porCambiar.activo ? 'Desactivar' : 'Activar'} a ${porCambiar.nombres} ${porCambiar.apellidos}`}
          descripcion={
            porCambiar.activo
              ? 'Dejará de poder entrar y se cerrarán sus sesiones abiertas de inmediato. Lo que haya registrado se conserva.'
              : 'Vuelve a quedar habilitado con las mismas credenciales.'
          }
          textoConfirmar={porCambiar.activo ? 'Desactivar' : 'Activar'}
          varianteConfirmar={porCambiar.activo ? 'peligro' : 'principal'}
          ocupado={cambiarEstado.isPending}
          onConfirmar={() => cambiarEstado.mutate(porCambiar)}
          onCancelar={() => setPorCambiar(null)}
        />
      )}

      {cambiandoPerfil !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setCambiandoPerfil(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl
              dark:border-slate-700 dark:bg-slate-900"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Perfil de {cambiandoPerfil.nombres}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Al cambiarlo se cierran sus sesiones para que los permisos nuevos apliquen de inmediato.
            </p>

            <div className="mt-4">
              <Seleccion
                etiqueta="Perfil"
                value={nuevoPerfil}
                onChange={(evento) => setNuevoPerfil(evento.target.value)}
              >
                {perfilesCompatibles(cambiandoPerfil).map((perfil) => (
                  <option key={perfil.id} value={perfil.nombre}>
                    {perfil.nombre} — {perfil.descripcion}
                  </option>
                ))}
              </Seleccion>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => setCambiandoPerfil(null)}>
                Cancelar
              </Boton>
              <Boton
                onClick={() => cambiarPerfil.mutate(cambiandoPerfil)}
                disabled={cambiarPerfil.isPending || nuevoPerfil === cambiandoPerfil.perfil.nombre}
              >
                {cambiarPerfil.isPending ? 'Guardando…' : 'Cambiar'}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
