import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

type VarianteBoton = 'principal' | 'secundario' | 'peligro' | 'plano';

const BOTONES: Record<VarianteBoton, string> = {
  principal: 'bg-marca-600 text-white hover:bg-marca-700 focus:ring-marca-500',
  secundario:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400 ' +
    'dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700',
  peligro: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  plano: 'text-marca-600 hover:bg-marca-50 focus:ring-marca-400 dark:text-marca-300 dark:hover:bg-slate-800',
};

export function Boton({
  variante = 'principal',
  className = '',
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
        transition focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900
        disabled:cursor-not-allowed disabled:opacity-50 ${BOTONES[variante]} ${className}`}
      {...resto}
    />
  );
}

const CONTROL =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 ' +
  'focus:border-marca-500 focus:outline-none focus:ring-1 focus:ring-marca-500 disabled:bg-slate-100 ' +
  'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900';

const ETIQUETA_CAMPO = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300';

export function Campo({
  etiqueta,
  ayuda,
  className = '',
  ...resto
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  return (
    <label className="block">
      <span className={ETIQUETA_CAMPO}>{etiqueta}</span>
      <input className={`${CONTROL} ${className}`} {...resto} />
      {ayuda !== undefined && (
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{ayuda}</span>
      )}
    </label>
  );
}

export function Seleccion({
  etiqueta,
  children,
  ...resto
}: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return (
    <label className="block">
      <span className={ETIQUETA_CAMPO}>{etiqueta}</span>
      <select className={CONTROL} {...resto}>
        {children}
      </select>
    </label>
  );
}

export function Tarjeta({
  titulo,
  accion,
  children,
  className = '',
}: {
  titulo?: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm
        dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {titulo !== undefined && (
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {titulo}
          </h2>
          {accion}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const AVISOS = {
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  aviso: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  info: 'border-marca-200 bg-marca-50 text-marca-900 dark:border-marca-800 dark:bg-marca-900/40 dark:text-marca-100',
  exito:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
};

export function Aviso({ tipo = 'info', children }: { tipo?: keyof typeof AVISOS; children: ReactNode }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${AVISOS[tipo]}`} role="alert">
      {children}
    </div>
  );
}

const COLORES_ETIQUETA: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  verde: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ambar: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  rojo: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  azul: 'bg-marca-100 text-marca-700 dark:bg-marca-900/60 dark:text-marca-200',
};

export function Etiqueta({ texto, color = 'slate' }: { texto: string; color?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES_ETIQUETA[color]}`}>
      {texto}
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{texto}</p>;
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <p
      className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500
        dark:border-slate-700 dark:text-slate-400"
    >
      {texto}
    </p>
  );
}

export function ErrorDelServidor({ error }: { error: unknown }) {
  const mensaje = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
  const detalles = (error as { errores?: string[] })?.errores ?? [];

  return (
    <Aviso tipo="error">
      <p className="font-medium">{mensaje}</p>
      {detalles.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {detalles.map((detalle) => (
            <li key={detalle}>{detalle}</li>
          ))}
        </ul>
      )}
    </Aviso>
  );
}

export function Tabla({ cabeceras, children }: { cabeceras: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {cabeceras.map((cabecera) => (
              <th key={cabecera} className="pb-2 pr-4 font-medium">
                {cabecera}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

// Reemplaza a window.confirm y window.prompt. Los diálogos del navegador
// bloquean la página entera, no se pueden dar estilo y en cada navegador se ven
// distintos: en una aplicación con identidad propia desentonan.
export function Dialogo({
  titulo,
  descripcion,
  textoConfirmar = 'Confirmar',
  varianteConfirmar = 'principal',
  pideMotivo = false,
  etiquetaMotivo = 'Motivo',
  motivo = '',
  onMotivo,
  onConfirmar,
  onCancelar,
  ocupado = false,
}: {
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  varianteConfirmar?: VarianteBoton;
  pideMotivo?: boolean;
  etiquetaMotivo?: string;
  motivo?: string;
  onMotivo?: (valor: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  ocupado?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl
          dark:border-slate-700 dark:bg-slate-900"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{titulo}</h2>

        {descripcion !== undefined && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{descripcion}</p>
        )}

        {pideMotivo && (
          <div className="mt-4">
            <span className={ETIQUETA_CAMPO}>{etiquetaMotivo}</span>
            <textarea
              rows={3}
              autoFocus
              value={motivo}
              onChange={(evento) => onMotivo?.(evento.target.value)}
              className={CONTROL}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Boton variante="secundario" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Boton>
          <Boton
            variante={varianteConfirmar}
            onClick={onConfirmar}
            disabled={ocupado || (pideMotivo && motivo.trim() === '')}
          >
            {ocupado ? 'Procesando…' : textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
