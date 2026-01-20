import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreatePayrollRunUseCase } from '../../application/use-cases/create-payroll-run.usecase';
import { FindPayrollRunsUseCase } from '../../application/use-cases/find-payroll-runs.usecase';
import { CreatePayrollRunDto } from '../../application/dtos/create-payroll-run.dto';
import { FindPayrollRunsQueryDto } from '../../application/dtos/find-payroll-runs.query.dto';

import { CreatePayrollRuleDto } from '../../application/dtos/create-payroll-rule.dto';
import { UpdatePayrollRuleDto } from '../../application/dtos/update-payroll-rule.dto';
import { FindPayrollRulesQueryDto } from '../../application/dtos/find-payroll-rules.query.dto';
import { CreatePayrollRuleUseCase } from '../../application/use-cases/create-payroll-rule.usecase';
import { FindPayrollRulesUseCase } from '../../application/use-cases/find-payroll-rules.usecase';
import { FindPayrollRuleUseCase } from '../../application/use-cases/find-payroll-rule.usecase';
import { UpdatePayrollRuleUseCase } from '../../application/use-cases/update-payroll-rule.usecase';
import { DeletePayrollRuleUseCase } from '../../application/use-cases/delete-payroll-rule.usecase';
import { Public } from '../../../auth/infrastructure/decorators/public.decorator';

@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly createRunUseCase: CreatePayrollRunUseCase,
    private readonly findRunsUseCase: FindPayrollRunsUseCase,
    private readonly createRuleUseCase: CreatePayrollRuleUseCase,
    private readonly findRulesUseCase: FindPayrollRulesUseCase,
    private readonly findRuleUseCase: FindPayrollRuleUseCase,
    private readonly updateRuleUseCase: UpdatePayrollRuleUseCase,
    private readonly deleteRuleUseCase: DeletePayrollRuleUseCase,
  ) {}

  @Post('runs')
  createRun(@Body() dto: CreatePayrollRunDto) {
    return this.createRunUseCase.execute(dto);
  }

  @Get('runs')
  findRuns(@Query() query: FindPayrollRunsQueryDto) {
    return this.findRunsUseCase.execute(query);
  }

  // Rules CRUD
  @Get('rules')
  findRules(@Query() query: FindPayrollRulesQueryDto) {
    return this.findRulesUseCase.execute(query);
  }

  @Get('rules/:id')
  findRule(@Param('id') id: string) {
    return this.findRuleUseCase.execute(id);
  }

  @Post('rules')
  createRule(@Body() dto: CreatePayrollRuleDto) {
    return this.createRuleUseCase.execute(dto);
  }

  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdatePayrollRuleDto) {
    return this.updateRuleUseCase.execute(id, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.deleteRuleUseCase.execute(id);
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
