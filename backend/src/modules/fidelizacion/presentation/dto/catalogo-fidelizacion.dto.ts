import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class RecompensaDto {
  @Matches(/^[a-z0-9_]{3,40}$/, { message: 'La clave va en minúsculas, sin espacios (ej. descuento_20)' })
  clave: string;

  @IsString()
  @IsNotEmpty({ message: 'La recompensa necesita un nombre' })
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'Describe qué recibe la empresa' })
  @MaxLength(300)
  descripcion: string;

  @Type(() => Number)
  @IsInt({ message: 'El costo es un número entero de puntos' })
  @Min(1, { message: 'El costo mínimo es 1 punto de fidelidad' })
  @Max(100000)
  costoPuntos: number;

  @IsIn(['DESCUENTO_RENOVACION', 'SERVICIO_SIN_CONSUMO', 'RECARGA_PUNTOS'], {
    message: 'El tipo debe ser descuento, servicio sin consumo o recarga de puntos',
  })
  tipo: 'DESCUENTO_RENOVACION' | 'SERVICIO_SIN_CONSUMO' | 'RECARGA_PUNTOS';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @Min(1, { message: 'El valor mínimo es 1' })
  valor: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La vigencia es un número entero de días' })
  @Min(1)
  @Max(365)
  diasVigenciaBeneficio?: number | null;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

export class ActualizarRecompensaDto extends PartialType(RecompensaDto) {}

export class ActualizarReglaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La regla necesita un nombre' })
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los puntos son un número entero' })
  @Min(1, { message: 'Una regla otorga al menos 1 punto' })
  @Max(1000)
  puntos?: number;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
