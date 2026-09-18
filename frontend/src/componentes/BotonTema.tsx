import { useTema } from '../lib/tema';

export function BotonTema({ className = '' }: { className?: string }) {
  const { tema, alternar } = useTema();

  return (
    <button
      type="button"
      onClick={alternar}
      title={tema === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      aria-label="Cambiar el tema"
      className={`rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm transition
        hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 ${className}`}
    >
      {tema === 'claro' ? '🌙' : '☀️'}
    </button>
  );
}
