import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginDto } from '../dtos/login.dto';
import type { LoginResponse } from '../../domain/models/user.model';

@Injectable()
export class LoginUseCase {
  constructor(private readonly jwtService: JwtService) {}

  async execute(dto: LoginDto): Promise<LoginResponse> {
    // TODO: Implement login logic
    throw new Error('Not implemented');
  }
}
