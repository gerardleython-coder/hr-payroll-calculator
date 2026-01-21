import { Body, Controller, Get, Post, Patch, Param } from '@nestjs/common';
import { CreateEmployeeDto } from '../../application/dtos/create-employee.dto';
import { UpdateEmployeeDto } from '../../application/dtos/update-employee.dto';
import { CreateEmployeeUseCase } from '../../application/use-cases/create-employee.usecase';
import { FindEmployeesUseCase } from '../../application/use-cases/find-employees.usecase';
import { UpdateEmployeeUseCase } from '../../application/use-cases/update-employee.usecase';
import type { Employee } from '@prisma/client';

@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly createUseCase: CreateEmployeeUseCase,
    private readonly findUseCase: FindEmployeesUseCase,
    private readonly updateUseCase: UpdateEmployeeUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateEmployeeDto): Promise<Employee> {
    return (await this.createUseCase.execute(dto)) as unknown as Employee;
  }

  @Get()
  async findAll(): Promise<Employee[]> {
    return (await this.findUseCase.execute()) as unknown as Employee[];
  }

  /**
   * Actualiza un empleado existente (HU-11).
   * @param id - ID del empleado
   * @param dto - Datos a actualizar (parcial)
   * @returns Empleado actualizado
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<Employee> {
    return this.updateUseCase.execute(id, dto);
  }
}
