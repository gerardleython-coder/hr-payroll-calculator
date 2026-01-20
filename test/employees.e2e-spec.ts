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
});
