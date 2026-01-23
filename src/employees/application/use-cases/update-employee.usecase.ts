import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Employee } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateEmployeeDto } from '../dtos/update-employee.dto';

/**
 * Use Case para actualizar un empleado existente (HU-11).
 * Implementa actualización parcial (PATCH) con validaciones de negocio.
 *
 * @see RN-11.1 Validación de Existencia
 * @see RN-11.2 Validación de Email Único
 * @see RN-11.4 Actualización Parcial (PATCH)
 * @see RN-11.5 Integridad Referencial
 * @see RN-11.6 Idempotencia
 */
@Injectable()
export class UpdateEmployeeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta la actualización de un empleado.
   *
   * @param id - ID del empleado a actualizar
   * @param dto - Datos a actualizar (parcial)
   * @returns Empleado actualizado
   * @throws NotFoundException si el empleado no existe (RN-11.1)
   * @throws ConflictException si el email ya está en uso (RN-11.2)
   */
  async execute(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    // RN-11.1: Validar que el empleado existe
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // RN-11.2: Validar que el email no esté en uso por otro empleado
    if (dto.email) {
      const existingEmployee = await this.prisma.employee.findUnique({
        where: { email: dto.email },
      });

      // Si existe otro empleado con ese email (y no es el mismo)
      if (existingEmployee && existingEmployee.id !== id) {
        throw new ConflictException('Email ya está en uso');
      }
    }

    // RN-11.4: Actualización parcial - solo actualizar campos proporcionados
    // RN-11.5: Solo actualiza el empleado, no afecta contratos ni nóminas
    // RN-11.6: Idempotente - updatedAt se actualiza automáticamente por Prisma
    return this.prisma.employee.update({
      where: { id },
      data: dto,
    });
  }
}
