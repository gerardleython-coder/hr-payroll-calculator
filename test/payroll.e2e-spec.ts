/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/prisma/prisma-exception.filter';

type PayrollRunResponse = {
  id: string;
  employeeId: string;
  contractId: string;
  period: string;
  gross: number;
  net: number;
  breakdown: Record<string, unknown>;
};

describe('Payroll API (e2e)', () => {
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

    // Igual que en main.ts (buena práctica para que e2e sea real)
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    // Keep error mapping consistent with main.ts
    app.useGlobalFilters(new PrismaExceptionFilter());

    prisma = moduleRef.get(PrismaService);

    await app.init();

    server = app.getHttpServer() as unknown as any;
  });

  beforeEach(async () => {
    // Ensure isolation between tests (real DB)
    await prisma.payrollRun.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.employee.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/payroll/health (GET)', async () => {
    await request(server)
      .get('/payroll/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/payroll/rules (GET)', async () => {
    await request(server).get('/payroll/rules').expect(200);
  });

  it('/payroll/rules CRUD (POST/PUT/DELETE)', async () => {
    const createRes = await request(server)
      .post('/payroll/rules')
      .send({
        key: `EMPLOYEE_TEST_${Date.now()}`,
        label: 'Test rule',
        contractType: 'EMPLOYEE',
        unit: 'PERCENT',
        value: 5,
      })
      .expect(201);

    const ruleId = createRes.body.id as string;
    expect(ruleId).toBeDefined();

    await request(server)
      .put(`/payroll/rules/${ruleId}`)
      .send({ value: 6, enabled: false })
      .expect(200);

    await request(server).delete(`/payroll/rules/${ruleId}`).expect(200);
  });

  it('/payroll/runs (POST) creates a PayrollRun', async () => {
    // 1) employee
    const emp = await request(server)
      .post('/employees')
      .send({ name: 'Payroll Emp', email: `payroll.${Date.now()}@mail.com` })
      .expect(201);

    const employeeId = emp.body.id as string;

    // 2) contract
    const c = await request(server)
      .post('/contracts')
      .send({ employeeId, contractType: 'EMPLOYEE', baseSalary: 2_500_000 })
      .expect(201);

    const contractId = c.body.id as string;

    // 3) payroll run
    const res = await request(server)
      .post('/payroll/runs')
      .send({ employeeId, contractId, period: '2026-01', bonuses: 200_000 })
      .expect(201);

    const body = res.body as PayrollRunResponse;
    expect(body).toHaveProperty('id');
    expect(body.employeeId).toBe(employeeId);
    expect(body.contractId).toBe(contractId);
    expect(body.period).toBe('2026-01');
    expect(typeof body.gross).toBe('number');
    expect(typeof body.net).toBe('number');
  });

  it('/payroll/runs (GET) returns array', async () => {
    const res = await request(server).get('/payroll/runs').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  describe('HU-09: Contract Validation', () => {
    it('should reject payroll calculation with inactive contract', async () => {
      // Arrange: Create employee and inactive contract
      const emp = await request(server)
        .post('/employees')
        .send({
          name: 'Test Employee',
          email: `test.inactive.${Date.now()}@mail.com`,
        })
        .expect(201);

      const employeeId = emp.body.id as string;

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
          active: false, // Inactive contract
        })
        .expect(201);

      const contractId = contract.body.id as string;

      // Act & Assert: Try to calculate payroll with inactive contract
      const res = await request(server)
        .post('/payroll/runs')
        .send({
          employeeId,
          contractId,
          period: '2026-01',
          bonuses: 0,
        })
        .expect(400);

      expect(res.body.message).toContain('El contrato no está activo');
    });

    it('should reject payroll calculation with non-existent contract', async () => {
      // Arrange: Create employee only
      const emp = await request(server)
        .post('/employees')
        .send({
          name: 'Test Employee',
          email: `test.nocontract.${Date.now()}@mail.com`,
        })
        .expect(201);

      const employeeId = emp.body.id as string;
      // Use a properly formatted UUID v4 that doesn't exist
      const fakeContractId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      // Act & Assert: Try to calculate payroll with non-existent contract
      const res = await request(server)
        .post('/payroll/runs')
        .send({
          employeeId,
          contractId: fakeContractId,
          period: '2026-01',
          bonuses: 0,
        })
        .expect(404);

      expect(res.body.message).toContain('Contrato no encontrado');
    });

    it('should reject payroll calculation with contract from different employee', async () => {
      // Arrange: Create two employees with their contracts
      const emp1 = await request(server)
        .post('/employees')
        .send({
          name: 'Employee 1',
          email: `emp1.${Date.now()}@mail.com`,
        })
        .expect(201);

      const emp2 = await request(server)
        .post('/employees')
        .send({
          name: 'Employee 2',
          email: `emp2.${Date.now()}@mail.com`,
        })
        .expect(201);

      const employeeId1 = emp1.body.id as string;
      const employeeId2 = emp2.body.id as string;

      const contract2 = await request(server)
        .post('/contracts')
        .send({
          employeeId: employeeId2,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
          active: true,
        })
        .expect(201);

      const contractId2 = contract2.body.id as string;

      // Act & Assert: Try to calculate payroll for emp1 with emp2's contract
      const res = await request(server)
        .post('/payroll/runs')
        .send({
          employeeId: employeeId1,
          contractId: contractId2,
          period: '2026-01',
          bonuses: 0,
        })
        .expect(400);

      expect(res.body.message).toContain(
        'El contrato no pertenece al empleado especificado',
      );
    });

    it('should successfully calculate payroll with active contract', async () => {
      // Arrange: Create employee and active contract
      const emp = await request(server)
        .post('/employees')
        .send({
          name: 'Test Employee',
          email: `test.active.${Date.now()}@mail.com`,
        })
        .expect(201);

      const employeeId = emp.body.id as string;

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
          active: true, // Active contract
        })
        .expect(201);

      const contractId = contract.body.id as string;

      // Act & Assert: Calculate payroll successfully
      const res = await request(server)
        .post('/payroll/runs')
        .send({
          employeeId,
          contractId,
          period: '2026-01',
          bonuses: 200_000,
        })
        .expect(201);

      const body = res.body as PayrollRunResponse;
      expect(body).toHaveProperty('id');
      expect(body.employeeId).toBe(employeeId);
      expect(body.contractId).toBe(contractId);
      expect(typeof body.gross).toBe('number');
      expect(typeof body.net).toBe('number');
    });
  });

  // HU-13: Download Payroll PDF Tests
  describe('GET /payroll/runs/:id/pdf (HU-13)', () => {
    it('should download PDF for existing payroll run', async () => {
      // Create employee, contract, and payroll run
      const emp = await request(server)
        .post('/employees')
        .send({
          name: 'Juan Pérez',
          email: `juan.${Date.now()}@mail.com`,
        })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'EMPLOYEE',
          baseSalary: 3_000_000,
        })
        .expect(201);

      const payrollRun = await request(server)
        .post('/payroll/runs')
        .send({
          employeeId: emp.body.id,
          contractId: contract.body.id,
          period: '2026-01',
          bonuses: 0,
        })
        .expect(201);

      // Download PDF
      const res = await request(server)
        .get(`/payroll/runs/${payrollRun.body.id}/pdf`)
        .expect(200);

      // Verify headers
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('filename=');
      expect(res.headers['content-disposition']).toContain('.pdf');

      // Verify PDF content
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(0);

      // Verify it's a valid PDF (starts with %PDF)
      const pdfHeader = (res.body as Buffer).toString('utf8', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should return 404 for non-existent payroll run', async () => {
      await request(server)
        .get('/payroll/runs/00000000-0000-0000-0000-000000000000/pdf')
        .expect(404);
    });

    it('should generate PDF with correct filename format', async () => {
      const emp = await request(server)
        .post('/employees')
        .send({
          name: 'María López García',
          email: `maria.${Date.now()}@mail.com`,
        })
        .expect(201);

      const contract = await request(server)
        .post('/contracts')
        .send({
          employeeId: emp.body.id,
          contractType: 'CONTRACTOR',
          baseSalary: 2_000_000,
        })
        .expect(201);

      const payrollRun = await request(server)
        .post('/payroll/runs')
        .send({
          employeeId: emp.body.id,
          contractId: contract.body.id,
          period: '2026-02',
          bonuses: 0,
        })
        .expect(201);

      const res = await request(server)
        .get(`/payroll/runs/${payrollRun.body.id}/pdf`)
        .expect(200);

      const contentDisposition = res.headers['content-disposition'];
      expect(contentDisposition).toMatch(/nomina-\d{4}-\d{2}-.+\.pdf/);

      // Extract filename from header (format: attachment; filename="nomina-2026-02-maria-lopez-garcia.pdf")
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      expect(filenameMatch).toBeTruthy();
      const filename = filenameMatch![1];
      expect(filename).not.toContain(' '); // No spaces in filename
    });
  });
});
