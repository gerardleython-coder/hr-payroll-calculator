/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateEmployeeUseCase } from './update-employee.usecase';
import { PrismaService } from '../../../prisma/prisma.service';
import { Employee } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('UpdateEmployeeUseCase (HU-11)', () => {
  let useCase: UpdateEmployeeUseCase;
  let prisma: jest.Mocked<PrismaService>;

  const mockEmployee: Employee = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Juan Pérez',
    email: 'juan.perez@empresa.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockPrisma = {
      employee: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateEmployeeUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<UpdateEmployeeUseCase>(UpdateEmployeeUseCase);
    prisma = module.get(PrismaService);
  });

  describe('RN-11.1: Validación de Existencia', () => {
    it('debe lanzar NotFoundException si el empleado no existe', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(
        useCase.execute('non-existent-id', { name: 'Nuevo Nombre' }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        useCase.execute('non-existent-id', { name: 'Nuevo Nombre' }),
      ).rejects.toThrow('Empleado no encontrado');
    });
  });

  describe('RN-11.2: Validación de Email Único', () => {
    it('debe lanzar ConflictException si el email ya está en uso por otro empleado', async () => {
      const otherEmployee: Employee = {
        ...mockEmployee,
        id: 'different-id',
        email: 'maria.lopez@empresa.com',
      };

      // Primera llamada: findUnique con where: { id }
      // Segunda llamada: findUnique con where: { email }
      prisma.employee.findUnique
        .mockResolvedValueOnce(mockEmployee) // findById
        .mockResolvedValueOnce(otherEmployee); // findByEmail

      await expect(
        useCase.execute(mockEmployee.id, { email: 'maria.lopez@empresa.com' }),
      ).rejects.toThrow('Email ya está en uso');
    });

    it('debe permitir mantener el mismo email (actualización idempotente)', async () => {
      prisma.employee.findUnique
        .mockResolvedValueOnce(mockEmployee) // findById
        .mockResolvedValueOnce(mockEmployee); // findByEmail (mismo empleado)

      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        updatedAt: new Date(),
      });

      const result = await useCase.execute(mockEmployee.id, {
        email: mockEmployee.email,
      });

      expect(result.email).toBe(mockEmployee.email);
      expect(prisma.employee.update).toHaveBeenCalled();
    });
  });

  describe('RN-11.4: Actualización Parcial', () => {
    it('debe actualizar solo el nombre si solo se proporciona name', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        name: 'Juan Carlos Pérez',
        updatedAt: new Date(),
      });

      const result = await useCase.execute(mockEmployee.id, {
        name: 'Juan Carlos Pérez',
      });

      expect(result.name).toBe('Juan Carlos Pérez');
      expect(result.email).toBe(mockEmployee.email);
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: mockEmployee.id },
        data: { name: 'Juan Carlos Pérez' },
      });
    });

    it('debe actualizar solo el email si solo se proporciona email', async () => {
      prisma.employee.findUnique
        .mockResolvedValueOnce(mockEmployee) // findById
        .mockResolvedValueOnce(null); // findByEmail (disponible)

      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        email: 'juan.carlos@empresa.com',
        updatedAt: new Date(),
      });

      const result = await useCase.execute(mockEmployee.id, {
        email: 'juan.carlos@empresa.com',
      });

      expect(result.email).toBe('juan.carlos@empresa.com');
      expect(result.name).toBe(mockEmployee.name);
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: mockEmployee.id },
        data: { email: 'juan.carlos@empresa.com' },
      });
    });

    it('debe actualizar nombre y email simultáneamente', async () => {
      prisma.employee.findUnique
        .mockResolvedValueOnce(mockEmployee) // findById
        .mockResolvedValueOnce(null); // findByEmail

      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        name: 'Juan C. Pérez',
        email: 'jc.perez@empresa.com',
        updatedAt: new Date(),
      });

      const result = await useCase.execute(mockEmployee.id, {
        name: 'Juan C. Pérez',
        email: 'jc.perez@empresa.com',
      });

      expect(result.name).toBe('Juan C. Pérez');
      expect(result.email).toBe('jc.perez@empresa.com');
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: mockEmployee.id },
        data: {
          name: 'Juan C. Pérez',
          email: 'jc.perez@empresa.com',
        },
      });
    });

    it('debe actualizar updatedAt incluso sin cambios (idempotente)', async () => {
      const now = new Date();
      prisma.employee.findUnique
        .mockResolvedValueOnce(mockEmployee) // findById
        .mockResolvedValueOnce(mockEmployee); // findByEmail (mismo)

      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        updatedAt: now,
      });

      const result = await useCase.execute(mockEmployee.id, {
        name: mockEmployee.name,
        email: mockEmployee.email,
      });

      expect(result.updatedAt.getTime()).toBeGreaterThan(
        mockEmployee.updatedAt.getTime(),
      );
      expect(prisma.employee.update).toHaveBeenCalled();
    });
  });

  describe('RN-11.5: Integridad Referencial', () => {
    it('debe actualizar solo el empleado sin afectar contratos o nóminas', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        name: 'Nuevo Nombre',
        updatedAt: new Date(),
      });

      await useCase.execute(mockEmployee.id, { name: 'Nuevo Nombre' });

      // Verificar que solo se llama a update del empleado
      expect(prisma.employee.update).toHaveBeenCalledTimes(1);
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: mockEmployee.id },
        data: { name: 'Nuevo Nombre' },
      });
    });
  });
});
