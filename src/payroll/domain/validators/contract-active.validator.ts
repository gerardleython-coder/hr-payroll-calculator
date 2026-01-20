import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  IPayrollValidator,
  PayrollValidationContext,
} from './payroll.validator.interface';

/**
 * Validates that the contract is active.
 * This is the third validator in the chain (RN-9.3).
 */
@Injectable()
export class ContractActiveValidator implements IPayrollValidator {
  validate(context: PayrollValidationContext): Promise<void> {
    // Skip validation if contract doesn't exist (handled by ContractExistsValidator)
    if (!context.contract) {
      return Promise.resolve();
    }

    if (!context.contract.active) {
      return Promise.reject(
        new BadRequestException('El contrato no está activo'),
      );
    }
    return Promise.resolve();
  }
}
