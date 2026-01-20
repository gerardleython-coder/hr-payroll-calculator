import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  IPayrollValidator,
  PayrollValidationContext,
} from './payroll.validator.interface';

/**
 * Validates that the contract exists in the database.
 * This is the first validator in the chain (RN-9.1).
 */
@Injectable()
export class ContractExistsValidator implements IPayrollValidator {
  validate(context: PayrollValidationContext): Promise<void> {
    if (!context.contract) {
      throw new NotFoundException('Contrato no encontrado');
    }
    return Promise.resolve();
  }
}
