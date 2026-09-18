import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class PermisosDelPerfilDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permisos: string[];
}
