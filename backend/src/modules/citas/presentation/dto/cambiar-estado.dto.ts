import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CambiarEstadoDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
