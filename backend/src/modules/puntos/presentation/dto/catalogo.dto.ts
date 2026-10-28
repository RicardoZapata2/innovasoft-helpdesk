import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PlanDto {
  @Matches(/^[a-z0-9_]{3,40}$/, { message: 'La clave va en minúsculas, sin espacios (ej. plan_basico)' })
  clave: string;

  @IsString()
  @IsNotEmpty({ message: 'El plan necesita un nombre' })
  @MaxLength(80)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'Describe brevemente qué incluye el plan' })
  @MaxLength(300)
  descripcion: string;

  @IsIn(['SUSCRIPCION', 'RECARGA', 'BONO'], { message: 'El tipo debe ser suscripción, recarga o bono' })
  tipo: 'SUSCRIPCION' | 'RECARGA' | 'BONO';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los puntos incluidos deben ser un número entero' })
  @Min(1, { message: 'Un plan con límite incluye al menos 1 punto' })
  @Max(100000)
  puntosIncluidos?: number | null;

  @IsBoolean()
  esIlimitado: boolean;

  @Type(() => Number)
  @IsInt({ message: 'La vigencia es un número entero de días' })
  @Min(1, { message: 'La vigencia mínima es de 1 día' })
  @Max(730, { message: 'La vigencia máxima es de 730 días' })
  diasVigencia: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ActualizarPlanDto extends PartialType(PlanDto) {}

export class TarifaDto {
  @Matches(/^[a-z0-9_]{3,40}$/, { message: 'La clave va en minúsculas, sin espacios (ej. soporte_remoto)' })
  clave: string;

  @IsString()
  @IsNotEmpty({ message: 'La tarifa necesita un nombre' })
  @MaxLength(80)
  nombre: string;

  @Type(() => Number)
  @IsInt({ message: 'Los puntos deben ser un número entero' })
  @Min(1, { message: 'Un servicio cuesta al menos 1 punto' })
  @Max(1000)
  puntos: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ActualizarTarifaDto extends PartialType(TarifaDto) {}
