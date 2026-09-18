export type Usuario = {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  empresaId: string | null;
  perfil: string;
  ambito: 'INNOVASOFT' | 'EMPRESA';
  permisos: string[];
  debeCambiarPassword: boolean;
};

export type Sesion = {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
};

export type Plan = {
  clave: string;
  nombre: string;
  descripcion: string;
  tipo: 'SUSCRIPCION' | 'RECARGA' | 'BONO';
  puntosIncluidos: number | null;
  esIlimitado: boolean;
  diasVigencia: number;
  precio: string;
};

export type Tarifa = {
  clave: string;
  nombre: string;
  puntos: number;
};

export type Alerta = {
  tipo: 'SALDO_BAJO' | 'SALDO_EN_DESCUBIERTO' | 'BOLSA_POR_VENCER';
  mensaje: string;
};

export type Bolsa = {
  id: string;
  origen: string;
  puntosIniciales: number;
  saldo: number;
  esIlimitada: boolean;
  emitidaEn: string;
  venceEn: string;
  diasParaVencer: number;
};

export type EstadoDeCuenta = {
  empresaId: string;
  saldoDisponible: number;
  tienePlanIlimitado: boolean;
  topeDescubierto: number;
  bolsas: Bolsa[];
  alertas: Alerta[];
};

export type Movimiento = {
  id: string;
  tipo: string;
  puntos: number;
  descripcion: string;
  createdAt: string;
  ticketId: string | null;
  citaId: string | null;
  bolsa: { id: string; origen: string; venceEn: string } | null;
  registradoPor: { nombres: string; apellidos: string } | null;
};

// Los listados paginados comparten esta cabecera y cada uno añade su propia
// colección: el nombre del arreglo cambia según el recurso, así que no se puede
// resolver con un solo tipo genérico.
export type Pagina = {
  pagina: number;
  tamano: number;
  total: number;
  paginas: number;
};

export type Kardex = Pagina & { movimientos: Movimiento[] };

export type Asesor = {
  id: string;
  especialidad: string | null;
  usuario: { nombres: string; apellidos: string; email: string };
  disponibilidad: Array<{ diaSemana: number; horaInicio: string; horaFin: string }>;
};

export type Cita = {
  id: string;
  codigo: string;
  inicioEn: string;
  finEn: string;
  direccion: string | null;
  enlace: string | null;
  motivoCancelacion: string | null;
  estado: { clave: string; nombre: string; esFinal: boolean };
  modalidad: { clave: string; nombre: string };
  tarifaAplicada: { clave: string; nombre: string; puntos: number } | null;
  empresa: { id: string; razonSocial: string };
  asesor: { id: string; usuario: { nombres: string; apellidos: string; email: string } };
  solicitante: { nombres: string; apellidos: string; email: string };
};

export type ListaCitas = Pagina & { citas: Cita[] };

export type Franja = { inicio: string; fin: string };

export type FranjasDisponibles = {
  asesor: string;
  fecha: string;
  duracionMinutos: number;
  franjas: Franja[];
};

export type Empresa = {
  id: string;
  nit: string;
  razonSocial: string;
  direccion: string | null;
  telefono: string | null;
  activa: boolean;
  createdAt: string;
  _count?: { usuarios: number; tickets: number };
};

export type Perfil = {
  id: string;
  nombre: string;
  descripcion: string;
  ambito: 'INNOVASOFT' | 'EMPRESA';
  esSistema: boolean;
  _count: { permisos: number; usuarios: number };
};

export type PerfilDetalle = {
  id: string;
  nombre: string;
  descripcion: string;
  ambito: 'INNOVASOFT' | 'EMPRESA';
  esSistema: boolean;
  permisos: string[];
  _count: { usuarios: number };
};

export type Permiso = {
  id: string;
  clave: string;
  modulo: string;
  accion: string;
  descripcion: string;
};

export type ModuloDePermisos = {
  modulo: string;
  permisos: Permiso[];
};

export type UsuarioListado = {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  activo: boolean;
  emailVerificado: boolean;
  debeCambiarPassword: boolean;
  perfil: { nombre: string; ambito: string };
  empresa: { id: string; razonSocial: string } | null;
  asesor: { id: string; especialidad: string | null } | null;
};
