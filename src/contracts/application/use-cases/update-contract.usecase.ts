import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateContractDto } from '../dtos/update-contract.dto';

/**
 * Use Case para actualizar un contrato existente (HU-12).
 * Implementa actualización parcial (PATCH) con validaciones de negocio.
 *
 * Reglas de negocio implementadas:
 * - RN-12.1: Validación de existencia del contrato
 * - RN-12.2: Validación de salario (>0) - manejada por DTO
 * - RN-12.3: Validación de tipo de contrato - manejada por DTO
 * - RN-12.4: Actualización parcial (PATCH)
 * - RN-12.5: Campos no modificables (id, employeeId, createdAt)
 * - RN-12.6: Integridad referencial (no afecta nóminas existentes)
 * - RN-12.8: Idempotencia
 */
@Injectable()
export class UpdateContractUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, dto: UpdateContractDto) {
    // RN-12.1: Validar que el contrato existe
    const existingContract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!existingContract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    // RN-12.4: Actualización parcial - solo actualizar campos proporcionados
    // RN-12.5: id, employeeId, createdAt no se modifican (no están en el DTO)
    // RN-12.8: Permitir actualización idempotente (updatedAt se actualiza automáticamente)
    const updatedContract = await this.prisma.contract.update({
      where: { id },
      data: dto,
    });

    // RN-12.6: La actualización no afecta nóminas existentes (solo actualiza Contract)
    return updatedContract;
  }
}
