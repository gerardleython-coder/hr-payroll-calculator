import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO para actualizar un empleado existente (PATCH).
 * Todos los campos son opcionales ya que es una actualización parcial.
 */
export class UpdateEmployeeDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;
}
