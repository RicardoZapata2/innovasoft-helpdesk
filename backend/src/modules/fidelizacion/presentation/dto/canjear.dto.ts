import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CanjearDto {
  @IsString()
  @IsNotEmpty({ message: 'Indica qué recompensa quieres canjear' })
  recompensa: string;

  @IsOptional()
  @IsUUID('4')
  empresaId?: string;
}
