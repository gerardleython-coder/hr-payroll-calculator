import { BadRequestException } from '@nestjs/common';
import { ContractOwnershipValidator } from './contract-ownership.validator';
import type { PayrollValidationContext } from './payroll.validator.interface';

describe('ContractOwnershipValidator', () => {
  let validator: ContractOwnershipValidator;

  beforeEach(() => {
    validator = new ContractOwnershipValidator();
  });

  describe('validate', () => {
    it('should pass validation when contract belongs to employee', async () => {
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

    it('should throw BadRequestException when contract belongs to different employee', async () => {
      // Arrange
      const context: PayrollValidationContext = {
        employeeId: 'emp-123',
        contractId: 'contract-555',
        contract: {
          id: 'contract-555',
          employeeId: 'emp-999', // Different employee
          active: true,
          contractType: 'EMPLOYEE',
          baseSalary: 3000000,
        },
      };

      // Act & Assert
      await expect(validator.validate(context)).rejects.toThrow(
        BadRequestException,
      );
      await expect(validator.validate(context)).rejects.toThrow(
        'El contrato no pertenece al empleado especificado',
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
