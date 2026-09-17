import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

export class ConsultaFranjasDto {
  @IsUUID('4', { message: 'Debes indicar el asesor' })
  asesorId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe venir como 2026-09-21' })
  fecha: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  duracionMinutos?: number;
}
