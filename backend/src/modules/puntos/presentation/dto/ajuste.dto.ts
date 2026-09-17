import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AjusteDto {
  @Type(() => Number)
  @IsInt({ message: 'Los puntos deben ser un número entero' })
  @Min(-1000)
  @Max(1000)
  puntos: number;

  @IsString()
  @IsNotEmpty({ message: 'Un ajuste manual siempre necesita un motivo' })
  @MaxLength(300)
  motivo: string;

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;
}
