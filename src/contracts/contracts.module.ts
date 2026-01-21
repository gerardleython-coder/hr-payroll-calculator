import { Module } from '@nestjs/common';
import { ContractsController } from './presentation/controllers/contracts.controller';
import { CreateContractUseCase } from './application/use-cases/create-contract.usecase';
import { FindContractsUseCase } from './application/use-cases/find-contracts.usecase';
import { UpdateContractUseCase } from './application/use-cases/update-contract.usecase';

@Module({
  controllers: [ContractsController],
  providers: [
    CreateContractUseCase,
    FindContractsUseCase,
    UpdateContractUseCase,
  ],
  exports: [CreateContractUseCase, FindContractsUseCase, UpdateContractUseCase],
})
export class ContractsModule {}
