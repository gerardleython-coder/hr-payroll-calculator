import { ContractType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

/**
 * DTO para actualizar un contrato existente (PATCH).
 * Todos los campos son opcionales ya que es una actualización parcial.
 */
export class UpdateContractDto {
  @IsOptional()
  @IsInt({ message: 'El salario debe ser un número entero' })
  @Min(1, { message: 'Salario debe ser mayor a 0' })
  baseSalary?: number;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  active?: boolean;

  @IsOptional()
  @IsEnum(ContractType, { message: 'Tipo de contrato inválido' })
  contractType?: ContractType;
}
