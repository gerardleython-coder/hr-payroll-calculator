import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateContractDto } from '../../application/dtos/create-contract.dto';
import { UpdateContractDto } from '../../application/dtos/update-contract.dto';
import { CreateContractUseCase } from '../../application/use-cases/create-contract.usecase';
import { FindContractsUseCase } from '../../application/use-cases/find-contracts.usecase';
import { UpdateContractUseCase } from '../../application/use-cases/update-contract.usecase';

@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly createUc: CreateContractUseCase,
    private readonly findUc: FindContractsUseCase,
    private readonly updateUc: UpdateContractUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateContractDto) {
    return await this.createUc.execute(dto);
  }

  @Get()
  async findAll() {
    return await this.findUc.execute();
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return await this.updateUc.execute(id, dto);
  }
}
