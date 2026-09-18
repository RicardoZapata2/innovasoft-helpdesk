import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los nombres no pueden quedar vacíos' })
  @MaxLength(80)
  nombres?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos no pueden quedar vacíos' })
  @MaxLength(80)
  apellidos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  especialidad?: string;
}
