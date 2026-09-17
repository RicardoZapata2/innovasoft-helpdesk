import { IsHexadecimal, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RestablecerPasswordDto {
  @IsHexadecimal({ message: 'El enlace no es válido' })
  @Length(64, 64, { message: 'El enlace no es válido' })
  token: string;

  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir al menos una letra' })
  @Matches(/\d/, { message: 'La contraseña debe incluir al menos un número' })
  password: string;
}
