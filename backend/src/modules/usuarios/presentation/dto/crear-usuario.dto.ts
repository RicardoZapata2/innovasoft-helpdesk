import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CrearUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @MaxLength(80)
  nombres: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @MaxLength(80)
  apellidos: string;

  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Debes indicar el perfil' })
  @MaxLength(80)
  perfil: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  especialidad?: string;

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;
}
