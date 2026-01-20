import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/prisma/prisma-exception.filter';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new PrismaExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return access token and user when credentials are valid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        })
        .expect(201); // POST endpoints return 201 by default in NestJS

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: 'admin-001',
        username: 'admin',
        role: 'ADMIN',
      });
    });

    it('should return 401 when username is incorrect', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'wronguser',
          password: 'admin123',
        })
        .expect(401);

      expect(response.body.message).toBe('Credenciales inválidas');
    });

    it('should return 401 when password is incorrect', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Credenciales inválidas');
    });

    it('should return 400 when username is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'admin123',
        })
        .expect(400);
    });

    it('should return 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
        })
        .expect(400);
    });
  });

  describe('Protected endpoints', () => {
    let validToken: string;

    beforeAll(async () => {
      // Get a valid token for protected endpoint tests
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        });

      validToken = response.body.accessToken as string;
    });

    it('should allow access to protected endpoint with valid token', async () => {
      await request(app.getHttpServer())
        .get('/payroll/runs')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('should allow access to health endpoint without token (public)', async () => {
      await request(app.getHttpServer()).get('/payroll/health').expect(200);
    });
  });
});
