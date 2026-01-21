import { Module } from '@nestjs/common';
import { EmployeesController } from './presentation/controllers/employees.controller';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.usecase';
import { FindEmployeesUseCase } from './application/use-cases/find-employees.usecase';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.usecase';

@Module({
  controllers: [EmployeesController],
  providers: [CreateEmployeeUseCase, FindEmployeesUseCase, UpdateEmployeeUseCase],
  exports: [CreateEmployeeUseCase, FindEmployeesUseCase, UpdateEmployeeUseCase],
})
export class EmployeesModule {}
