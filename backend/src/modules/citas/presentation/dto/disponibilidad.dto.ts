import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, Matches, Max, Min, ValidateNested } from 'class-validator';

export class FranjaDto {
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El día va de 0 (domingo) a 6 (sábado)' })
  @Max(6, { message: 'El día va de 0 (domingo) a 6 (sábado)' })
  diaSemana: number;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'La hora debe venir como 08:00' })
  horaInicio: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'La hora debe venir como 17:00' })
  horaFin: string;
}

export class DisponibilidadDto {
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FranjaDto)
  franjas: FranjaDto[];
}
