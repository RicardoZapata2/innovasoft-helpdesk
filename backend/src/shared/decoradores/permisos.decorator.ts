import { SetMetadata } from '@nestjs/common';

export const CLAVE_PERMISOS = 'permisos_requeridos';

export const RequierePermisos = (...claves: string[]) => SetMetadata(CLAVE_PERMISOS, claves);
