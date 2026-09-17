import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ActualizarEmpresaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La razón social no puede quedar vacía' })
  @MaxLength(150)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @Matches(/^[0-9+\s-]{7,20}$/, { message: 'El teléfono solo admite dígitos, espacios, + y -' })
  telefono?: string;
}
