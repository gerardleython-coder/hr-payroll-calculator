import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { LoginDto } from '../dtos/login.dto';
import type { LoginResponse } from '../../domain/models/user.model';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Use Case para autenticación de usuarios con JWT.
 * 
 * Mejoras de seguridad implementadas:
 * - Contraseñas hasheadas con bcrypt (10 rounds)
 * - Usuarios almacenados en base de datos
 * - Validación de usuario activo
 * - Mensajes de error genéricos para evitar enumeración
 * 
 * Reglas de negocio:
 * - RN-10.1: Validación de credenciales contra base de datos
 * - RN-10.2: Generación de JWT token con expiración de 8h
 * - RN-10.4: Retorno de token y información del usuario
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResponse> {
    // 1. Buscar usuario en base de datos
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    // 2. Validar que el usuario existe (RN-10.1)
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Validar que el usuario está activo
    if (!user.active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // 4. Validar contraseña con bcrypt (RN-10.1)
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 5. Generar JWT token (RN-10.2)
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // 6. Retornar token y usuario (RN-10.4)
    // IMPORTANTE: No retornar el password
    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
