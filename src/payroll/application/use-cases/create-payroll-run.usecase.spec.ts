/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePayrollRunUseCase } from './create-payroll-run.usecase';
import { ContractModel } from '../../../contracts/domain/models/contract.models';

type CalcResult = {
  gross: number;
  net: number;
  taxes: number;
  mandatoryDeductions: number;
  otherDeductions: number;
  breakdown: Record<string, number>;
};

describe('CreatePayrollRunUseCase', () => {
  const makePrisma = () => ({
    employee: { findUnique: jest.fn() },
    contract: { findUnique: jest.fn(), findFirst: jest.fn() },
    payrollRun: { create: jest.fn() },
  });

  const makeCalculator = () => ({
    calculate: jest.fn(),
  });

  it('throws 404 when employee does not exist', async () => {
    const prisma = makePrisma();
    prisma.employee.findUnique.mockResolvedValue(null);

    const usecase = new CreatePayrollRunUseCase(
      prisma as any,
      makeCalculator() as any,
    );

    await expect(
      usecase.execute({
        employeeId: 'e1',
        period: '2026-01',
        bonuses: 0,
        otherDeductions: 0,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws 404 when no active contract exists for employee', async () => {
    const prisma = makePrisma();
    prisma.employee.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.contract.findFirst.mockResolvedValue(null);

    // Mock validator that throws NotFoundException (simulates ContractExistsValidator)
    const mockValidator = {
      validate: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Contrato no encontrado')),
    };

    const usecase = new CreatePayrollRunUseCase(
      prisma as any,
      makeCalculator() as any,
      [mockValidator],
    );

    await expect(
      usecase.execute({
        employeeId: 'e1',
        period: '2026-01',
        bonuses: 0,
        otherDeductions: 0,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws 400 when contract does not belong to employee', async () => {
    const prisma = makePrisma();
    prisma.employee.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.contract.findUnique.mockResolvedValue({
      id: 'c1',
      employeeId: 'e2',
      contractType: 'EMPLOYEE',
      baseSalary: 1000,
      active: true,
    });

    // Mock validator that throws BadRequestException (simulates ContractOwnershipValidator)
    const mockValidator = {
      validate: jest
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'El contrato no pertenece al empleado especificado',
          ),
        ),
    };

    const usecase = new CreatePayrollRunUseCase(
      prisma as any,
      makeCalculator() as any,
      [mockValidator],
    );

    await expect(
      usecase.execute({
        employeeId: 'e1',
        contractId: 'c1',
        period: '2026-01',
        bonuses: 0,
        otherDeductions: 0,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates payroll run using selected contract and rounds amounts', async () => {
    const prisma = makePrisma();
    prisma.employee.findUnique.mockResolvedValue({ id: 'e1' });

    prisma.contract.findFirst.mockResolvedValue({
      id: 'c1',
      employeeId: 'e1',
      contractType: 'EMPLOYEE',
      baseSalary: 2500000,
      active: true,
    } as ContractModel);

    const calculator = makeCalculator();

    calculator.calculate.mockReturnValue({
      gross: 1000.4,
      net: 800.6,
      taxes: 100,
      mandatoryDeductions: 0, // Eliminada deducción ficticia
      otherDeductions: 49.8,
      breakdown: { health: 40, pension: 40, withholding: 20 },
    } as CalcResult);

    prisma.payrollRun.create.mockResolvedValue({ id: 'r1' } as { id: string });

    // Mock validators that pass (no rejection)
    const mockValidators = [
      { validate: jest.fn().mockResolvedValue(undefined) },
      { validate: jest.fn().mockResolvedValue(undefined) },
      { validate: jest.fn().mockResolvedValue(undefined) },
    ];

    const usecase = new CreatePayrollRunUseCase(
      prisma as any,
      calculator as any,
      mockValidators,
    );

    const res = await usecase.execute({
      employeeId: 'e1',
      period: '2026-01',
      bonuses: 200000,
      otherDeductions: 0,
    } as any);

    expect(res).toEqual({ id: 'r1' });

    expect(calculator.calculate).toHaveBeenCalledWith({
      contractType: 'EMPLOYEE',
      baseSalary: 2500000,
      bonuses: 200000,
      otherDeductions: 0,
    });

    expect(prisma.payrollRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        employeeId: 'e1',
        contractId: 'c1',
        period: '2026-01',
        gross: 1000,
        net: 801,
        breakdown: expect.objectContaining({
          health: 40,
          pension: 40,
          withholding: 20,
          taxes: 100,
          mandatoryDeductions: 0, // Eliminada deducción ficticia
          otherDeductions: 49.8,
        }),
      }),
    });
  });
});
