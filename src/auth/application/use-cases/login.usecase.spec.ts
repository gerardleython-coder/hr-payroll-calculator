/* eslint-disable @typescript-eslint/unbound-method */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from './login.usecase';
import { ADMIN_USER } from '../../domain/constants/admin.constants';

describe('LoginUseCase', () => {
  let usecase: LoginUseCase;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = {
      sign: jest.fn(),
    } as unknown as JwtService;

    usecase = new LoginUseCase(jwtService);
  });

  describe('execute', () => {
    it('should return access token and user when credentials are valid', () => {
      const mockToken = 'mock.jwt.token';
      (jwtService.sign as jest.Mock).mockReturnValue(mockToken);

      const result = usecase.execute({
        username: 'admin',
        password: 'admin123',
      });

      expect(result).toEqual({
        accessToken: mockToken,
        user: {
          id: ADMIN_USER.id,
          username: ADMIN_USER.username,
          role: ADMIN_USER.role,
        },
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: ADMIN_USER.id,
        username: ADMIN_USER.username,
        role: ADMIN_USER.role,
      });
    });

    it('should throw UnauthorizedException when username is incorrect', () => {
      expect(() =>
        usecase.execute({
          username: 'wronguser',
          password: 'admin123',
        }),
      ).toThrow(UnauthorizedException);

      expect(() =>
        usecase.execute({
          username: 'wronguser',
          password: 'admin123',
        }),
      ).toThrow('Credenciales inválidas');

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', () => {
      expect(() =>
        usecase.execute({
          username: 'admin',
          password: 'wrongpassword',
        }),
      ).toThrow(UnauthorizedException);

      expect(() =>
        usecase.execute({
          username: 'admin',
          password: 'wrongpassword',
        }),
      ).toThrow('Credenciales inválidas');

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when both username and password are incorrect', () => {
      expect(() =>
        usecase.execute({
          username: 'wronguser',
          password: 'wrongpassword',
        }),
      ).toThrow(UnauthorizedException);

      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
