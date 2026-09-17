import { IsISO8601, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReprogramarCitaDto {
  @IsISO8601({ strict: true }, { message: 'La nueva fecha debe venir en formato ISO' })
  inicioEn: string;

  @IsString()
  @IsNotEmpty({ message: 'Reprogramar exige indicar el motivo' })
  @MaxLength(300)
  motivo: string;
}
