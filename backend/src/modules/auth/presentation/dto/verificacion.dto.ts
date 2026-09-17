import { IsHexadecimal, Length } from 'class-validator';

export class VerificacionDto {
  @IsHexadecimal({ message: 'El enlace no es válido' })
  @Length(64, 64, { message: 'El enlace no es válido' })
  token: string;
}
