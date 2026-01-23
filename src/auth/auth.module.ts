import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './presentation/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { JwtStrategy } from './domain/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: '24h' }, // RN-10.2 - Extended to 24 hours
    }),
  ],
  controllers: [AuthController],
  providers: [LoginUseCase, JwtStrategy],
  exports: [LoginUseCase],
})
export class AuthModule {}
