import { IsOptional, IsUUID } from 'class-validator';

export class ConsultaSaldoDto {
  @IsOptional()
  @IsUUID('4', { message: 'El identificador de la empresa no es válido' })
  empresaId?: string;
}
