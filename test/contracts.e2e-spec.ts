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

  // HU-12: Update Contract Tests
  describe('PATCH /contracts/:id (HU-12)', () => {
    it('should update baseSalary successfully', async () => {
      // Create employee and contract
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      // Update baseSalary
      const res = await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({ baseSalary: 3_500_000 })
        .expect(200);

      expect(res.body.baseSalary).toBe(3_500_000);
      expect(res.body.contractType).toBe('EMPLOYEE');
      expect(res.body.active).toBe(true);
    });

    it('should update active status from true to false', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      const res = await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({ active: false })
        .expect(200);

      expect(res.body.active).toBe(false);
    });

    it('should update contractType from EMPLOYEE to CONTRACTOR', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      const res = await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({ contractType: 'CONTRACTOR' })
        .expect(200);

      expect(res.body.contractType).toBe('CONTRACTOR');
    });

    it('should update multiple fields simultaneously', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      const res = await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({
          baseSalary: 4_000_000,
          active: true,
          contractType: 'CONTRACTOR',
        })
        .expect(200);

      expect(res.body.baseSalary).toBe(4_000_000);
      expect(res.body.active).toBe(true);
      expect(res.body.contractType).toBe('CONTRACTOR');
    });

    it('should return 404 when contract does not exist', async () => {
      await request(server)
        .patch('/contracts/00000000-0000-0000-0000-000000000000')
        .send({ baseSalary: 3_500_000 })
        .expect(404);
    });

    it('should return 400 when baseSalary is negative', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({ baseSalary: -1000 })
        .expect(400);
    });

    it('should return 400 when baseSalary is zero', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({ baseSalary: 0 })
        .expect(400);
    });

    it('should return 400 when contractType is invalid', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({ contractType: 'FREELANCE' })
        .expect(400);
    });

    it('should allow idempotent update with same values', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      const res = await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({
          baseSalary: 3_000_000,
          active: true,
          contractType: 'EMPLOYEE',
        })
        .expect(200);

      expect(res.body.baseSalary).toBe(3_000_000);
      expect(res.body.active).toBe(true);
      expect(res.body.contractType).toBe('EMPLOYEE');
    });

    it('should not affect existing payroll runs when updating contract', async () => {
      // Create employee and contract
      const emp = await request(server)
        .post('/employees')
        .send({ name: 'Test Emp', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      // Create payroll run
      const payrollRun = await request(server)
        .post('/payroll/runs')
        .send({
          employeeId: emp.body.id,
          contractId: contract.body.id,
          period: '2026-01',
          bonuses: 0,
          otherDeductions: 0,
        })
        .expect(201);

      const originalGross = payrollRun.body.gross;

      // Update contract baseSalary
      await request(server)
        .patch(`/contracts/${contract.body.id}`)
        .send({ baseSalary: 4_000_000 })
        .expect(200);

      // Verify payroll run was not affected
      const payrollRuns = await prisma.payrollRun.findMany({
        where: { id: payrollRun.body.id },
      });

      expect(payrollRuns[0].gross).toBe(originalGross);
    });
  });
});
