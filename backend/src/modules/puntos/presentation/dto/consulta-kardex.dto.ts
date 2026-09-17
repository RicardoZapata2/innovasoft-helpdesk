import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';

const TIPOS = ['EMISION', 'CONSUMO', 'EXPIRACION', 'DESCUBIERTO', 'AJUSTE'] as const;

export class ConsultaKardexDto {
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
  @IsIn(TIPOS, { message: `El tipo de movimiento debe ser uno de: ${TIPOS.join(', ')}` })
  tipo?: (typeof TIPOS)[number];

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha inicial debe tener formato ISO (2026-09-01)' })
  desde?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha final debe tener formato ISO (2026-09-30)' })
  hasta?: string;

  @IsOptional()
  @IsUUID('4')
  ticketId?: string;

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;
}
