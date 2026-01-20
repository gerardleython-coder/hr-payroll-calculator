import { Module } from '@nestjs/common';
import { PayrollController } from './presentation/controllers/payroll.controller';
import { CalculatePayrollUseCase } from './application/use-cases/calculate-payroll.usecase';
import { CreatePayrollRunUseCase } from './application/use-cases/create-payroll-run.usecase';
import { FindPayrollRunsUseCase } from './application/use-cases/find-payroll-runs.usecase';
import { FindPayrollRulesUseCase } from './application/use-cases/find-payroll-rules.usecase';
import { FindPayrollRuleUseCase } from './application/use-cases/find-payroll-rule.usecase';
import { CreatePayrollRuleUseCase } from './application/use-cases/create-payroll-rule.usecase';
import { UpdatePayrollRuleUseCase } from './application/use-cases/update-payroll-rule.usecase';
import { DeletePayrollRuleUseCase } from './application/use-cases/delete-payroll-rule.usecase';
import { PayrollRuleRepository } from './domain/repositories/payroll-rule.repository';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollCalculatorTemplate } from './domain/services/payroll.calculator.template';
import {
  ContractorTaxStrategy,
  EmployeeTaxStrategy,
  TaxStrategy,
} from './domain/services/tax.strategy';
import { ContractExistsValidator } from './domain/validators/contract-exists.validator';
import { ContractOwnershipValidator } from './domain/validators/contract-ownership.validator';
import { ContractActiveValidator } from './domain/validators/contract-active.validator';
import type { IPayrollValidator } from './domain/validators/payroll.validator.interface';

class DefaultPayrollCalculator extends PayrollCalculatorTemplate {}

@Module({
  controllers: [PayrollController],
  providers: [
    // Validators (Chain of Responsibility - HU-09)
    ContractExistsValidator,
    ContractOwnershipValidator,
    ContractActiveValidator,
    {
      provide: 'PAYROLL_VALIDATORS',
      useFactory: (
        exists: ContractExistsValidator,
        ownership: ContractOwnershipValidator,
        active: ContractActiveValidator,
      ): IPayrollValidator[] => [exists, ownership, active],
      inject: [
        ContractExistsValidator,
        ContractOwnershipValidator,
        ContractActiveValidator,
      ],
    },
    // Tax Strategies
    EmployeeTaxStrategy,
    ContractorTaxStrategy,
    {
      // HUMAN REVIEW: Mantengo el dominio puro (sin Nest). Inyecto estrategias desde el módulo
      // para que el template/calculadora sea fácil de testear y no cree dependencias internamente.
      provide: 'TAX_STRATEGIES',
      useFactory: (
        e: EmployeeTaxStrategy,
        c: ContractorTaxStrategy,
      ): TaxStrategy[] => [e, c],
      inject: [EmployeeTaxStrategy, ContractorTaxStrategy],
    },
    {
      provide: PayrollCalculatorTemplate,
      useFactory: (strategies: TaxStrategy[]) =>
        new DefaultPayrollCalculator(strategies),
      inject: ['TAX_STRATEGIES'],
    },
    {
      provide: CalculatePayrollUseCase,
      useFactory: (calc: PayrollCalculatorTemplate) =>
        new CalculatePayrollUseCase(calc),
      inject: [PayrollCalculatorTemplate],
    },
    {
      provide: CreatePayrollRunUseCase,
      useFactory: (
        prisma: PrismaService,
        calc: PayrollCalculatorTemplate,
        validators: IPayrollValidator[],
      ) => new CreatePayrollRunUseCase(prisma, calc, validators),
      inject: [PrismaService, PayrollCalculatorTemplate, 'PAYROLL_VALIDATORS'],
    },
    {
      provide: FindPayrollRunsUseCase,
      useFactory: (prisma: PrismaService) => new FindPayrollRunsUseCase(prisma),
      inject: [PrismaService],
    },
    // PayrollRule CRUD providers
    PayrollRuleRepository,
    {
      provide: FindPayrollRulesUseCase,
      useFactory: (repo: PayrollRuleRepository) =>
        new FindPayrollRulesUseCase(repo),
      inject: [PayrollRuleRepository],
    },
    {
      provide: FindPayrollRuleUseCase,
      useFactory: (repo: PayrollRuleRepository) =>
        new FindPayrollRuleUseCase(repo),
      inject: [PayrollRuleRepository],
    },
    {
      provide: CreatePayrollRuleUseCase,
      useFactory: (repo: PayrollRuleRepository) =>
        new CreatePayrollRuleUseCase(repo),
      inject: [PayrollRuleRepository],
    },
    {
      provide: UpdatePayrollRuleUseCase,
      useFactory: (repo: PayrollRuleRepository) =>
        new UpdatePayrollRuleUseCase(repo),
      inject: [PayrollRuleRepository],
    },
    {
      provide: DeletePayrollRuleUseCase,
      useFactory: (repo: PayrollRuleRepository) =>
        new DeletePayrollRuleUseCase(repo),
      inject: [PayrollRuleRepository],
    },
  ],
  exports: [
    CalculatePayrollUseCase,
    CreatePayrollRunUseCase,
    FindPayrollRunsUseCase,
  ],
})
export class PayrollModule {}
