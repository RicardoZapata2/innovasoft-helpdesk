import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const ESTADOS = [
  'solicitada', 'confirmada', 'reprogramada', 'en_curso',
  'realizada', 'cancelada', 'no_asistida',
] as const;

export class ConsultaCitasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamano?: number;

  @IsOptional()
  @IsUUID('4')
  asesorId?: string;

  @IsOptional()
  @IsIn(ESTADOS, { message: `El estado debe ser uno de: ${ESTADOS.join(', ')}` })
  estado?: (typeof ESTADOS)[number];

  @IsOptional()
  @IsISO8601()
  desde?: string;

  @IsOptional()
  @IsISO8601()
  hasta?: string;

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;
}
