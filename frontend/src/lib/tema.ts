import { useEffect, useState } from 'react';

const CLAVE = 'innovasoft.tema';

type Tema = 'claro' | 'oscuro';

function temaInicial(): Tema {
  const guardado = localStorage.getItem(CLAVE);

  if (guardado === 'claro' || guardado === 'oscuro') {
    return guardado;
  }

  // Sin elección previa se respeta la preferencia del sistema operativo.
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('oscuro', tema === 'oscuro');
    localStorage.setItem(CLAVE, tema);
  }, [tema]);

  return {
    tema,
    alternar: () => setTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro')),
  };
}
