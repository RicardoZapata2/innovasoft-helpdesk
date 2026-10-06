import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BotonTema } from './BotonTema';

// Marco común de las pantallas de cuenta: registro, verificación y
// recuperación de contraseña se ven igual que la pantalla de entrada.
export function MarcoAcceso({ titulo, ancho = 'max-w-sm', children }: { titulo: string; ancho?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-medium text-slate-600 transition
            hover:text-marca-600 dark:text-slate-300 dark:hover:text-marca-300"
        >
          <span aria-hidden="true">←</span> Volver al inicio
        </Link>
        <BotonTema />
      </header>

      <div className="flex items-center justify-center px-4 py-10">
        <div className={`w-full ${ancho}`}>
          <Link to="/" className="mb-8 block text-center text-2xl font-semibold text-marca-700 dark:text-marca-300">
            Innovasoft
          </Link>
          <div
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm
              dark:border-slate-700 dark:bg-slate-900"
          >
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{titulo}</h1>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
