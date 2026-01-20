import { BadRequestException } from '@nestjs/common';
import { ContractActiveValidator } from './contract-active.validator';
import type { PayrollValidationContext } from './payroll.validator.interface';

describe('ContractActiveValidator', () => {
  let validator: ContractActiveValidator;

  beforeEach(() => {
    validator = new ContractActiveValidator();
  });

  describe('validate', () => {
    it('should pass validation when contract is active', async () => {
      // Arrange
      const context: PayrollValidationContext = {
        employeeId: 'emp-123',
        contractId: 'contract-456',
        contract: {
          id: 'contract-456',
          employeeId: 'emp-123',
          active: true,
          contractType: 'EMPLOYEE',
          baseSalary: 3000000,
        },
      };

      // Act & Assert
      await expect(validator.validate(context)).resolves.not.toThrow();
    });

    it('should throw BadRequestException when contract is inactive', async () => {
      // Arrange
      const context: PayrollValidationContext = {
        employeeId: 'emp-123',
        contractId: 'contract-789',
        contract: {
          id: 'contract-789',
          employeeId: 'emp-123',
          active: false, // Inactive
          contractType: 'EMPLOYEE',
          baseSalary: 3000000,
        },
      };

      // Act & Assert
      await expect(validator.validate(context)).rejects.toThrow(
        BadRequestException,
      );
      await expect(validator.validate(context)).rejects.toThrow(
        'El contrato no está activo',
      );
    });

    it('should handle null contract gracefully', async () => {
      // Arrange
      const context: PayrollValidationContext = {
        employeeId: 'emp-123',
        contractId: 'contract-999',
        contract: null,
      };

      // Act & Assert
      // Should not throw because ContractExistsValidator handles this case
      await expect(validator.validate(context)).resolves.not.toThrow();
    });
  });
});
