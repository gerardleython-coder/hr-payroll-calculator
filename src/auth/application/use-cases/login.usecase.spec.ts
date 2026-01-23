/* eslint-disable @typescript-eslint/unbound-method */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from './login.usecase';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jwtService = mockJwtService as unknown as JwtService;
    prismaService = mockPrismaService as unknown as PrismaService;
    useCase = new LoginUseCase(jwtService, prismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return access token and user when credentials are valid', async () => {
      const mockUser = {
        id: 'admin-001',
        username: 'admin',
        password: '$2b$10$hashedpassword',
        role: 'ADMIN',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await useCase.execute({
        username: 'admin',
        password: 'admin123',
      });

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: {
          id: 'admin-001',
          username: 'admin',
          role: 'ADMIN',
        },
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'admin123',
        '$2b$10$hashedpassword',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'admin-001',
        username: 'admin',
        role: 'ADMIN',
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        useCase.execute({ username: 'nonexistent', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        useCase.execute({ username: 'nonexistent', password: 'password' }),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const mockUser = {
        id: 'admin-001',
        username: 'admin',
        password: '$2b$10$hashedpassword',
        role: 'ADMIN',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        useCase.execute({ username: 'admin', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        useCase.execute({ username: 'admin', password: 'wrongpassword' }),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const mockUser = {
        id: 'admin-001',
        username: 'admin',
        password: '$2b$10$hashedpassword',
        role: 'ADMIN',
        active: false, // Inactive user
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        useCase.execute({ username: 'admin', password: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        useCase.execute({ username: 'admin', password: 'admin123' }),
      ).rejects.toThrow('Usuario inactivo');
    });
  });
});
