/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/prisma/prisma-exception.filter';

describe('Employees API (e2e)', () => {
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

    // Same behaviour as main.ts so validation & errors match production
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new PrismaExceptionFilter());

    prisma = moduleRef.get(PrismaService);

    await app.init();

    server = app.getHttpServer();
  });

  beforeEach(async () => {
    // Isolation: make sure each test runs against a clean DB
    await prisma.payrollRun.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.employee.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /employees -> 201', async () => {
    const res = await request(server)
      .post('/employees')
      .send({ name: 'Ada Lovelace', email: `ada.${Date.now()}@mail.com` })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
  });

  it('GET /employees -> 200', async () => {
    const res = await request(server).get('/employees').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /employees invalid email -> 400', async () => {
    await request(server)
      .post('/employees')
      .send({ name: 'X', email: 'no-email' })
      .expect(400);
  });

  it('POST /employees duplicate email -> 409', async () => {
    const email = `dup.${Date.now()}@mail.com`;

    await request(server)
      .post('/employees')
      .send({ name: 'First', email })
      .expect(201);

    await request(server)
      .post('/employees')
      .send({ name: 'Second', email })
      .expect(409);
  });

  // HU-11: Actualizar Empleado
  describe('PATCH /employees/:id (HU-11)', () => {
    it('debe actualizar nombre exitosamente', async () => {
      // Crear empleado
      const createRes = await request(server)
        .post('/employees')
        .send({ name: 'Juan Pérez', email: `juan.${Date.now()}@mail.com` })
        .expect(201);

      const employeeId = createRes.body.id;

      // Actualizar nombre
      const updateRes = await request(server)
        .patch(`/employees/${employeeId}`)
        .send({ name: 'Juan Carlos Pérez' })
        .expect(200);

      expect(updateRes.body.name).toBe('Juan Carlos Pérez');
      expect(updateRes.body.email).toBe(createRes.body.email);
      expect(updateRes.body.id).toBe(employeeId);
    });

    it('debe actualizar email exitosamente', async () => {
      const createRes = await request(server)
        .post('/employees')
        .send({ name: 'María López', email: `maria.${Date.now()}@mail.com` })
        .expect(201);

      const employeeId = createRes.body.id;
      const newEmail = `maria.nueva.${Date.now()}@mail.com`;

      const updateRes = await request(server)
        .patch(`/employees/${employeeId}`)
        .send({ email: newEmail })
        .expect(200);

      expect(updateRes.body.email).toBe(newEmail);
      expect(updateRes.body.name).toBe('María López');
    });

    it('debe actualizar nombre y email simultáneamente', async () => {
      const createRes = await request(server)
        .post('/employees')
        .send({ name: 'Pedro García', email: `pedro.${Date.now()}@mail.com` })
        .expect(201);

      const employeeId = createRes.body.id;
      const newEmail = `pedro.nuevo.${Date.now()}@mail.com`;

      const updateRes = await request(server)
        .patch(`/employees/${employeeId}`)
        .send({ name: 'Pedro José García', email: newEmail })
        .expect(200);

      expect(updateRes.body.name).toBe('Pedro José García');
      expect(updateRes.body.email).toBe(newEmail);
    });

    it('debe rechazar actualización con email duplicado -> 409', async () => {
      const email1 = `emp1.${Date.now()}@mail.com`;
      const email2 = `emp2.${Date.now()}@mail.com`;

      // Crear dos empleados
      await request(server)
        .post('/employees')
        .send({ name: 'Empleado 1', email: email1 })
        .expect(201);

      const emp2Res = await request(server)
        .post('/employees')
        .send({ name: 'Empleado 2', email: email2 })
        .expect(201);

      // Intentar actualizar emp2 con email de emp1
      await request(server)
        .patch(`/employees/${emp2Res.body.id}`)
        .send({ email: email1 })
        .expect(409);
    });

    it('debe rechazar actualización con email inválido -> 400', async () => {
      const createRes = await request(server)
        .post('/employees')
        .send({ name: 'Test User', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      await request(server)
        .patch(`/employees/${createRes.body.id}`)
        .send({ email: 'email-invalido' })
        .expect(400);
    });

    it('debe rechazar actualización con nombre vacío -> 400', async () => {
      const createRes = await request(server)
        .post('/employees')
        .send({ name: 'Test User', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      await request(server)
        .patch(`/employees/${createRes.body.id}`)
        .send({ name: '' })
        .expect(400);
    });

    it('debe rechazar actualización de empleado inexistente -> 404', async () => {
      await request(server)
        .patch('/employees/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Nuevo Nombre' })
        .expect(404);
    });

    it('debe permitir actualización idempotente (mismo email)', async () => {
      const createRes = await request(server)
        .post('/employees')
        .send({ name: 'Test User', email: `test.${Date.now()}@mail.com` })
        .expect(201);

      const updateRes = await request(server)
        .patch(`/employees/${createRes.body.id}`)
        .send({ email: createRes.body.email })
        .expect(200);

      expect(updateRes.body.email).toBe(createRes.body.email);
    });
  });
});
