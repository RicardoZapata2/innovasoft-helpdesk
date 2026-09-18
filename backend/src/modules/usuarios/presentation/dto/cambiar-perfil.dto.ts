import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CambiarPerfilDto {
  @IsString()
  @IsNotEmpty({ message: 'Indica el perfil' })
  @MaxLength(80)
  perfil: string;
}
