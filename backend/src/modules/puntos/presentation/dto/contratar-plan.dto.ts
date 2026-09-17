import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class ContratarPlanDto {
  @Matches(/^[a-z0-9_]{3,40}$/, { message: 'La clave del plan no es válida' })
  plan: string;

  @IsOptional()
  @IsUUID('4', { message: 'El identificador de la empresa no es válido' })
  empresaId?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
