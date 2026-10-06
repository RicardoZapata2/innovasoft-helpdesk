import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { RutaProtegida } from './componentes/RutaProtegida';
import { Asesores } from './paginas/Asesores';
import { CambiarPassword } from './paginas/CambiarPassword';
import { Citas } from './paginas/Citas';
import { Empresas } from './paginas/Empresas';
import { Entrar } from './paginas/Entrar';
import { Fidelizacion } from './paginas/Fidelizacion';
import { Kardex } from './paginas/Kardex';
import { Panel } from './paginas/Panel';
import { Perfiles } from './paginas/Perfiles';
import { Publico } from './paginas/Publico';
import { RecuperarPassword, RestablecerPassword } from './paginas/RecuperarPassword';
import { Registro } from './paginas/Registro';
import { TicketDetalle } from './paginas/TicketDetalle';
import { Tickets } from './paginas/Tickets';
import { Usuarios } from './paginas/Usuarios';
import { VerificarEmail } from './paginas/VerificarEmail';

const VER_TICKETS = ['tickets.ver_todos', 'tickets.ver_empresa', 'tickets.ver_propios'];

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Publico />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/verificar-email" element={<VerificarEmail />} />
      <Route path="/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/restablecer-password" element={<RestablecerPassword />} />

      <Route element={<RutaProtegida />}>
        <Route path="/cambiar-password" element={<CambiarPassword />} />
      </Route>

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/panel" element={<Panel />} />
          <Route path="/citas" element={<Citas />} />
          <Route path="/kardex" element={<Kardex />} />
        </Route>
      </Route>

      <Route element={<RutaProtegida permisos={VER_TICKETS} />}>
        <Route element={<Layout />}>
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetalle />} />
        </Route>
      </Route>

      <Route element={<RutaProtegida permisos={['fidelizacion.ver_saldo', 'fidelizacion.ver_historial']} />}>
        <Route element={<Layout />}>
          <Route path="/fidelizacion" element={<Fidelizacion />} />
        </Route>
      </Route>

      <Route element={<RutaProtegida permisos={['empresas.ver_todas']} />}>
        <Route element={<Layout />}>
          <Route path="/empresas" element={<Empresas />} />
        </Route>
      </Route>

      <Route element={<RutaProtegida permisos={['usuarios.ver']} />}>
        <Route element={<Layout />}>
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Route>

      <Route element={<RutaProtegida permisos={['perfiles.ver']} />}>
        <Route element={<Layout />}>
          <Route path="/perfiles" element={<Perfiles />} />
        </Route>
      </Route>

      <Route element={<RutaProtegida permisos={['citas.administrar_disponibilidad']} />}>
        <Route element={<Layout />}>
          <Route path="/asesores" element={<Asesores />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
