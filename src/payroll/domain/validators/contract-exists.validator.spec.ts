import { NotFoundException } from '@nestjs/common';
import { ContractExistsValidator } from './contract-exists.validator';
import type { PayrollValidationContext } from './payroll.validator.interface';

describe('ContractExistsValidator', () => {
  let validator: ContractExistsValidator;

  beforeEach(() => {
    validator = new ContractExistsValidator();
  });

  describe('validate', () => {
    it('should pass validation when contract exists', async () => {
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

    it('should throw NotFoundException when contract is null', async () => {
      // Arrange
      const context: PayrollValidationContext = {
        employeeId: 'emp-123',
        contractId: 'contract-999',
        contract: null,
      };

      // Act & Assert
      await expect(validator.validate(context)).rejects.toThrow(
        NotFoundException,
      );
      await expect(validator.validate(context)).rejects.toThrow(
        'Contrato no encontrado',
      );
    });

    it('should throw NotFoundException when contract is undefined', async () => {
      // Arrange
      const context: PayrollValidationContext = {
        employeeId: 'emp-123',
        contractId: 'contract-999',
        contract: undefined,
      };

      // Act & Assert
      await expect(validator.validate(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
