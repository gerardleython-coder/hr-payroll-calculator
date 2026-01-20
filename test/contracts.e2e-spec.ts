/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/prisma/prisma-exception.filter';

describe('Contracts API (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new PrismaExceptionFilter());

    prisma = moduleRef.get(PrismaService);

    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await prisma.payrollRun.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.employee.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/contracts (GET) returns array', async () => {
    const res = await request(server).get('/contracts').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('/contracts (POST) -> 404 when employee does not exist (business rule)', async () => {
    await request(server)
      .post('/contracts')
      .send({
        employeeId: 'non-existing-id',
        contractType: 'EMPLOYEE',
        baseSalary: 1_000_000,
      })
      .expect(404);
  });

  it('/contracts (POST) creates contract and deactivates previous active contracts', async () => {
    // Create employee
    const emp = await request(server)
      .post('/employees')
      .send({ name: 'Contract Emp', email: `emp.${Date.now()}@mail.com` })
      .expect(201);

    const employeeId = emp.body.id as string;

    // Create first active contract
    const c1 = await request(server)
      .post('/contracts')
      .send({ employeeId, contractType: 'EMPLOYEE', baseSalary: 1_000_000 })
      .expect(201);

    // Create second active contract -> should deactivate previous ones
    const c2 = await request(server)
      .post('/contracts')
      .send({ employeeId, contractType: 'EMPLOYEE', baseSalary: 2_000_000 })
      .expect(201);

    // Verify via prisma (stronger than relying on ordering in GET)
    const contracts = await prisma.contract.findMany({ where: { employeeId } });
    expect(contracts.length).toBe(2);

    const first = contracts.find((c) => c.id === (c1.body.id as string));
    const second = contracts.find((c) => c.id === (c2.body.id as string));

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.active).toBe(false);
    expect(second?.active).toBe(true);
  });
});
