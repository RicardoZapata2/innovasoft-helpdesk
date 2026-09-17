export type UsuarioAutenticado = {
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
