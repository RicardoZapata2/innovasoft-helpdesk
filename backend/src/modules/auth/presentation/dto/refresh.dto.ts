import { IsJWT } from 'class-validator';

export class RefreshDto {
  @IsJWT({ message: 'El token de sesión no es válido' })
  refreshToken: string;
}
