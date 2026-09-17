import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CrearEmpresaDto {
  @Matches(/^\d{9,10}(-\d)?$/, { message: 'El NIT debe tener 9 o 10 dígitos, con dígito de verificación opcional' })
  nit: string;

  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @MaxLength(150)
  razonSocial: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @Matches(/^[0-9+\s-]{7,20}$/, { message: 'El teléfono solo admite dígitos, espacios, + y -' })
  telefono?: string;

  @IsString()
  @IsNotEmpty({ message: 'Los nombres del administrador son obligatorios' })
  @MaxLength(80)
  nombresAdministrador: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos del administrador son obligatorios' })
  @MaxLength(80)
  apellidosAdministrador: string;

  @IsEmail({}, { message: 'El correo del administrador no tiene un formato válido' })
  emailAdministrador: string;
}
