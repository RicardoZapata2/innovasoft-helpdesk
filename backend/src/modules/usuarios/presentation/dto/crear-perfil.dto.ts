import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearPerfilDto {
  @IsString()
  @IsNotEmpty({ message: 'El perfil necesita un nombre' })
  @MaxLength(80)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'Describe para qué sirve el perfil' })
  @MaxLength(200)
  descripcion: string;

  @IsIn(['INNOVASOFT', 'EMPRESA'], { message: 'El ámbito debe ser INNOVASOFT o EMPRESA' })
  ambito: 'INNOVASOFT' | 'EMPRESA';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permisos?: string[];
}
