import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { PayrollModule } from './payroll/payroll.module';
import { EmployeesModule } from './employees/employees.module';
import { ContractsModule } from './contracts/contracts.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/infrastructure/guards/jwt-auth.guard';

const disableThrottler =
  process.env.DISABLE_THROTTLER === '1' || process.env.NODE_ENV === 'test';

const disableJwtAuth = process.env.NODE_ENV === 'test';

const imports: any[] = [
  PrismaModule,
  AuthModule,
  PayrollModule,
  EmployeesModule,
  ContractsModule,
];
const providers = [] as any[];

// Apply JWT authentication globally to all endpoints (RN-10.3)
// Disabled in test environment to allow E2E tests to run without authentication
if (!disableJwtAuth) {
  providers.push({ provide: APP_GUARD, useClass: JwtAuthGuard });
}

if (!disableThrottler) {
  // cast to any because ThrottlerModule.forRoot returns a DynamicModule
  // and our `imports` array is typed as `any[]` to allow mixed entries.
  imports.unshift(
    // explicit shape for the options to avoid passing raw `any` into forRoot
    ThrottlerModule.forRoot([{ ttl: 60, limit: 20 }] as unknown as Parameters<
      typeof ThrottlerModule.forRoot
    >[0]) as any,
  );
  providers.push({ provide: APP_GUARD, useClass: ThrottlerGuard });
}

@Module({
  imports,
  controllers: [],
  providers,
})
export class AppModule {}
