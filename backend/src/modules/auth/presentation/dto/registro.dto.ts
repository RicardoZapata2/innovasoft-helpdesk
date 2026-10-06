import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegistroDto {
  @Matches(/^\d{9,10}(-\d)?$/, { message: 'El NIT debe tener 9 o 10 dígitos, con dígito de verificación opcional' })
  nit: string;

  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @MaxLength(150)
  razonSocial: string;

  @IsString()
  @IsNotEmpty({ message: 'Tus nombres son obligatorios' })
  @MaxLength(80)
  nombres: string;

  @IsString()
  @IsNotEmpty({ message: 'Tus apellidos son obligatorios' })
  @MaxLength(80)
  apellidos: string;

  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;

  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir al menos una letra' })
  @Matches(/\d/, { message: 'La contraseña debe incluir al menos un número' })
  password: string;
}
