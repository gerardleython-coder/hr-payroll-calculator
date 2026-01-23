import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto } from '../../application/dtos/login.dto';
import { LoginUseCase } from '../../application/use-cases/login.usecase';
import { Public } from '../../infrastructure/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }
}
