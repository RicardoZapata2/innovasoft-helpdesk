import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TIPOS_SOLUCION } from '../../domain/reglas-ticket.js';

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;

export class CrearTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Elige la categoría del servicio' })
  categoria: string;

  @IsString()
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  @MaxLength(120)
  titulo: string;

  @IsString()
  @MinLength(10, { message: 'Describe el problema con al menos 10 caracteres' })
  @MaxLength(4000)
  descripcion: string;

  @IsIn(PRIORIDADES, { message: 'La prioridad debe ser BAJA, MEDIA, ALTA o CRITICA' })
  prioridad: (typeof PRIORIDADES)[number];

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;
}

export class ConsultaTicketsDto {
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
  estado?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsIn(PRIORIDADES)
  prioridad?: (typeof PRIORIDADES)[number];

  @IsOptional()
  @IsUUID('4')
  asesorId?: string;

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha inicial debe tener formato ISO (2026-09-01)' })
  desde?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha final debe tener formato ISO (2026-09-30)' })
  hasta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  buscar?: string;
}

export class AsignarTicketDto {
  // Sin asesor, la asignación es automática por menor carga.
  @IsOptional()
  @IsUUID('4', { message: 'El asesor no es válido' })
  asesorId?: string;
}

export class CambiarEstadoTicketDto {
  @IsIn(['en_atencion', 'en_espera_cliente', 'reabierto', 'abierto'], {
    message: 'Ese cambio de estado tiene su propia acción',
  })
  estado: 'en_atencion' | 'en_espera_cliente' | 'reabierto' | 'abierto';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;
}

export class ResolverTicketDto {
  @IsIn(TIPOS_SOLUCION, { message: 'Elige un tipo de solución de la lista' })
  tipoSolucion: (typeof TIPOS_SOLUCION)[number];

  @IsString()
  @MinLength(10, { message: 'Describe la solución con al menos 10 caracteres' })
  @MaxLength(2000)
  descripcionSolucion: string;
}

export class CerrarTicketDto {
  // Si no se indica, se usa la tarifa sugerida según las horas registradas.
  @IsOptional()
  @IsString()
  tarifa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;
}

export class ActividadDto {
  @IsString()
  @MinLength(5, { message: 'Describe la actividad con al menos 5 caracteres' })
  @MaxLength(1000)
  descripcion: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Las horas deben ser un número' })
  @Min(0.25, { message: 'El mínimo registrable es un cuarto de hora (0.25)' })
  @Max(24, { message: 'Una actividad no puede superar 24 horas' })
  horas: number;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha debe tener formato ISO' })
  fecha?: string;
}

export class EncuestaDto {
  @Type(() => Number)
  @IsInt({ message: 'La calificación debe ser un número entero' })
  @Min(1, { message: 'La calificación va de 1 a 5' })
  @Max(5, { message: 'La calificación va de 1 a 5' })
  calificacion: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
