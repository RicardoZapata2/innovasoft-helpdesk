import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CrearCitaDto {
  @IsUUID('4', { message: 'Debes indicar el asesor' })
  asesorId: string;

  @IsIn(['presencial', 'remoto'], { message: 'La modalidad debe ser presencial o remoto' })
  modalidad: 'presencial' | 'remoto';

  @IsISO8601({ strict: true }, { message: 'La fecha y hora deben venir en formato ISO' })
  inicioEn: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15, { message: 'Una cita no puede durar menos de 15 minutos' })
  @Max(480, { message: 'Una cita no puede durar más de 8 horas' })
  duracionMinutos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsUrl({}, { message: 'El enlace de la reunión no es una dirección válida' })
  enlace?: string;

  @IsOptional()
  @IsUUID('4')
  ticketId?: string;

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;
}
