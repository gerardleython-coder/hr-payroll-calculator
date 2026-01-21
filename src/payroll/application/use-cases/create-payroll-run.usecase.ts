import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PayrollCalculatorTemplate } from '../../domain/services/payroll.calculator.template';
import { CreatePayrollRunDto } from '../dtos/create-payroll-run.dto';
import type { IPayrollValidator } from '../../domain/validators/payroll.validator.interface';

export class CreatePayrollRunUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: PayrollCalculatorTemplate,
    private readonly validators: IPayrollValidator[] = [],
  ) {}

  async execute(dto: CreatePayrollRunDto) {
    // 1) Verificar que el empleado existe
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // 2) Seleccionar contrato
    const contract = dto.contractId
      ? await this.prisma.contract.findUnique({ where: { id: dto.contractId } })
      : await this.prisma.contract.findFirst({
          where: { employeeId: dto.employeeId, active: true },
          orderBy: { createdAt: 'desc' },
        });

    // 3) Ejecutar cadena de validadores (Chain of Responsibility - RN-9.4)
    const validationContext = {
      employeeId: dto.employeeId,
      contractId: dto.contractId || contract?.id || '',
      contract: contract
        ? {
            id: contract.id,
            employeeId: contract.employeeId,
            active: contract.active,
            contractType: contract.contractType,
            baseSalary: contract.baseSalary,
          }
        : null,
    };

    for (const validator of this.validators) {
      await validator.validate(validationContext);
    }

    // At this point, contract is guaranteed to exist, be active, and belong to employee
    // (validators would have thrown otherwise)
    // TypeScript null check: this should never happen due to validators
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // 4) Calcular
    const result = this.calculator.calculate({
      contractType: contract.contractType,
      baseSalary: contract.baseSalary,
      bonuses: dto.bonuses,
      otherDeductions: dto.otherDeductions,
    });

    // 5) Persistir corrida
    const payload = {
      employeeId: dto.employeeId,
      contractId: contract.id,
      period: dto.period,
      gross: Math.round(result.gross),
      net: Math.round(result.net),
      breakdown: {
        ...result.breakdown,
        taxes: result.taxes,
        mandatoryDeductions: result.mandatoryDeductions,
        otherDeductions: result.otherDeductions,
      },
    };

    return this.prisma.payrollRun.create({ data: payload });
  }
}
