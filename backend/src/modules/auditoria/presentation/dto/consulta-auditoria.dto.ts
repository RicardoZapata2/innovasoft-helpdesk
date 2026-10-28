import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ConsultaAuditoriaDto {
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
  @IsString()
  @MaxLength(60)
  entidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  accion?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha inicial debe tener formato ISO (2026-09-01)' })
  desde?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha final debe tener formato ISO (2026-09-30)' })
  hasta?: string;
}
