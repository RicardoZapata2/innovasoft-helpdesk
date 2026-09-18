import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Empresa } from '../lib/tipos';
import { Seleccion } from './base';

// El personal de Innovasoft trabaja sobre cualquier empresa, así que la API le
// exige decir cuál. Este selector es la forma de decirlo: sin él, esas
// pantallas devolvían un 400 pidiendo un dato que no había cómo dar.
export function SelectorEmpresa({
  valor,
  onCambio,
  etiqueta = 'Empresa',
}: {
  valor: string;
  onCambio: (empresaId: string) => void;
  etiqueta?: string;
}) {
  const empresas = useQuery({ queryKey: ['empresas'], queryFn: () => api.get<Empresa[]>('/empresas') });

  return (
    <Seleccion etiqueta={etiqueta} value={valor} onChange={(evento) => onCambio(evento.target.value)}>
      <option value="">Elige una empresa…</option>
      {empresas.data?.map((empresa) => (
        <option key={empresa.id} value={empresa.id}>
          {empresa.razonSocial}
          {!empresa.activa ? ' (desactivada)' : ''}
        </option>
      ))}
    </Seleccion>
  );
}
