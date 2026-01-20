import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginDto } from '../dtos/login.dto';
import type { LoginResponse } from '../../domain/models/user.model';
import { ADMIN_USER } from '../../domain/constants/admin.constants';

@Injectable()
export class LoginUseCase {
  constructor(private readonly jwtService: JwtService) {}

  execute(dto: LoginDto): LoginResponse {
    // Validate credentials against hardcoded admin user (RN-10.1)
    if (
      dto.username !== ADMIN_USER.username ||
      dto.password !== ADMIN_USER.password
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generate JWT token (RN-10.2)
    const payload = {
      sub: ADMIN_USER.id,
      username: ADMIN_USER.username,
      role: ADMIN_USER.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Return token and user info (RN-10.4)
    return {
      accessToken,
      user: {
        id: ADMIN_USER.id,
        username: ADMIN_USER.username,
        role: ADMIN_USER.role,
      },
    };
  }
}
