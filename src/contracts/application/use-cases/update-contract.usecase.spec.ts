import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateContractUseCase } from './update-contract.usecase';
import { UpdateContractDto } from '../dtos/update-contract.dto';
import { ContractType } from '@prisma/client';

describe('UpdateContractUseCase', () => {
  let useCase: UpdateContractUseCase;

  const mockPrismaService = {
    contract: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateContractUseCase,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    useCase = module.get<UpdateContractUseCase>(UpdateContractUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RN-12.1: Validación de Existencia', () => {
    it('debe lanzar NotFoundException si el contrato no existe', async () => {
      const contractId = 'non-existent-id';
      const dto: UpdateContractDto = { baseSalary: 3500000 };

      mockPrismaService.contract.findUnique.mockResolvedValue(null);

      await expect(useCase.execute(contractId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(contractId, dto)).rejects.toThrow(
        'Contrato no encontrado',
      );
    });
  });

  describe('RN-12.4: Actualización Parcial (PATCH)', () => {
    it('debe actualizar solo el salario base', async () => {
      const contractId = 'contract-123';
      const dto: UpdateContractDto = { baseSalary: 3500000 };
      const existingContract = {
        id: contractId,
        employeeId: 'emp-123',
        contractType: ContractType.EMPLOYEE,
        baseSalary: 3000000,
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedContract = { ...existingContract, baseSalary: 3500000 };

      mockPrismaService.contract.findUnique.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue(updatedContract);

      const result = await useCase.execute(contractId, dto);

      expect(result.baseSalary).toBe(3500000);
      expect(mockPrismaService.contract.update).toHaveBeenCalledWith({
        where: { id: contractId },
        data: { baseSalary: 3500000 },
      });
    });

    it('debe actualizar solo el estado activo', async () => {
      const contractId = 'contract-123';
      const dto: UpdateContractDto = { active: false };
      const existingContract = {
        id: contractId,
        employeeId: 'emp-123',
        contractType: ContractType.EMPLOYEE,
        baseSalary: 3000000,
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedContract = { ...existingContract, active: false };

      mockPrismaService.contract.findUnique.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue(updatedContract);

      const result = await useCase.execute(contractId, dto);

      expect(result.active).toBe(false);
      expect(mockPrismaService.contract.update).toHaveBeenCalledWith({
        where: { id: contractId },
        data: { active: false },
      });
    });

    it('debe actualizar solo el tipo de contrato', async () => {
      const contractId = 'contract-123';
      const dto: UpdateContractDto = { contractType: ContractType.CONTRACTOR };
      const existingContract = {
        id: contractId,
        employeeId: 'emp-123',
        contractType: ContractType.EMPLOYEE,
        baseSalary: 3000000,
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedContract = {
        ...existingContract,
        contractType: ContractType.CONTRACTOR,
      };

      mockPrismaService.contract.findUnique.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue(updatedContract);

      const result = await useCase.execute(contractId, dto);

      expect(result.contractType).toBe(ContractType.CONTRACTOR);
      expect(mockPrismaService.contract.update).toHaveBeenCalledWith({
        where: { id: contractId },
        data: { contractType: ContractType.CONTRACTOR },
      });
    });

    it('debe actualizar múltiples campos simultáneamente', async () => {
      const contractId = 'contract-123';
      const dto: UpdateContractDto = {
        baseSalary: 4000000,
        active: true,
        contractType: ContractType.EMPLOYEE,
      };
      const existingContract = {
        id: contractId,
        employeeId: 'emp-123',
        contractType: ContractType.CONTRACTOR,
        baseSalary: 3000000,
        active: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedContract = {
        ...existingContract,
        baseSalary: 4000000,
        active: true,
        contractType: ContractType.EMPLOYEE,
      };

      mockPrismaService.contract.findUnique.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue(updatedContract);

      const result = await useCase.execute(contractId, dto);

      expect(result.baseSalary).toBe(4000000);
      expect(result.active).toBe(true);
      expect(result.contractType).toBe(ContractType.EMPLOYEE);
      expect(mockPrismaService.contract.update).toHaveBeenCalledWith({
        where: { id: contractId },
        data: {
          baseSalary: 4000000,
          active: true,
          contractType: ContractType.EMPLOYEE,
        },
      });
    });
  });

  describe('RN-12.8: Idempotencia', () => {
    it('debe permitir actualización con los mismos valores (idempotente)', async () => {
      const contractId = 'contract-123';
      const dto: UpdateContractDto = {
        baseSalary: 3000000,
        active: true,
        contractType: ContractType.EMPLOYEE,
      };
      const existingContract = {
        id: contractId,
        employeeId: 'emp-123',
        contractType: ContractType.EMPLOYEE,
        baseSalary: 3000000,
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedContract = {
        ...existingContract,
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.contract.findUnique.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue(updatedContract);

      const result = await useCase.execute(contractId, dto);

      expect(result.baseSalary).toBe(3000000);
      expect(result.active).toBe(true);
      expect(result.contractType).toBe(ContractType.EMPLOYEE);
      expect(mockPrismaService.contract.update).toHaveBeenCalled();
    });
  });

  describe('RN-12.4: Cambios de estado', () => {
    it('debe permitir cambiar de activo a inactivo', async () => {
      const contractId = 'contract-123';
      const dto: UpdateContractDto = { active: false };
      const existingContract = {
        id: contractId,
        employeeId: 'emp-123',
        contractType: ContractType.EMPLOYEE,
        baseSalary: 3000000,
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedContract = { ...existingContract, active: false };

      mockPrismaService.contract.findUnique.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue(updatedContract);

      const result = await useCase.execute(contractId, dto);

      expect(result.active).toBe(false);
    });

    it('debe permitir cambiar de inactivo a activo', async () => {
      const contractId = 'contract-123';
      const dto: UpdateContractDto = { active: true };
      const existingContract = {
        id: contractId,
        employeeId: 'emp-123',
        contractType: ContractType.EMPLOYEE,
        baseSalary: 3000000,
        active: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedContract = { ...existingContract, active: true };

      mockPrismaService.contract.findUnique.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue(updatedContract);

      const result = await useCase.execute(contractId, dto);

      expect(result.active).toBe(true);
    });
  });
});
