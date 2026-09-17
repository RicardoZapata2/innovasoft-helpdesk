import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CambioPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu contraseña actual' })
  passwordActual: string;

  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir al menos una letra' })
  @Matches(/\d/, { message: 'La contraseña debe incluir al menos un número' })
  passwordNueva: string;
}
