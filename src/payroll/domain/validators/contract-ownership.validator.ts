import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  IPayrollValidator,
  PayrollValidationContext,
} from './payroll.validator.interface';

/**
 * Validates that the contract belongs to the specified employee.
 * This is the second validator in the chain (RN-9.2).
 */
@Injectable()
export class ContractOwnershipValidator implements IPayrollValidator {
  validate(context: PayrollValidationContext): Promise<void> {
    // Skip validation if contract doesn't exist (handled by ContractExistsValidator)
    if (!context.contract) {
      return Promise.resolve();
    }

    if (context.contract.employeeId !== context.employeeId) {
      throw new BadRequestException(
        'El contrato no pertenece al empleado especificado',
      );
    }
    return Promise.resolve();
  }
}
