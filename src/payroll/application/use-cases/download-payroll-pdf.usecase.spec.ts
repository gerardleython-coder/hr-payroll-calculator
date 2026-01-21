import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { DownloadPayrollPdfUseCase } from './download-payroll-pdf.usecase';
import type { IPdfGenerator } from '../../domain/services/pdf-generator.interface';

describe('DownloadPayrollPdfUseCase', () => {
  let useCase: DownloadPayrollPdfUseCase;
  let prisma: PrismaService;
  let pdfGenerator: IPdfGenerator;

  const mockPrismaService = {
    payrollRun: {
      findUnique: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  };

  const mockPdfGenerator: IPdfGenerator = {
    generatePayrollPdf: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadPayrollPdfUseCase,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'IPdfGenerator', useValue: mockPdfGenerator },
      ],
    }).compile();

    useCase = module.get<DownloadPayrollPdfUseCase>(DownloadPayrollPdfUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    pdfGenerator = module.get<IPdfGenerator>('IPdfGenerator');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RN-13.1: Validación de Existencia', () => {
    it('debe lanzar NotFoundException si la nómina no existe', async () => {
      const payrollRunId = 'non-existent-id';

      mockPrismaService.payrollRun.findUnique.mockResolvedValue(null);

      await expect(useCase.execute(payrollRunId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(payrollRunId)).rejects.toThrow(
        'Nómina no encontrada',
      );
    });
  });

  describe('RN-13.2: Generación de PDF', () => {
    it('debe generar PDF con información completa del empleado', async () => {
      const payrollRunId = 'payroll-123';
      const payrollRun = {
        id: payrollRunId,
        employeeId: 'emp-123',
        contractId: 'contract-123',
        period: '2026-01',
        gross: 3000000,
        net: 2520000,
        breakdown: {
          health: 120000,
          pension: 120000,
          withholding: 240000,
          otherDeductions: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const employee = {
        id: 'emp-123',
        name: 'Juan Pérez',
        email: 'juan.perez@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pdfBuffer = Buffer.from('fake-pdf-content');

      mockPrismaService.payrollRun.findUnique.mockResolvedValue(payrollRun);
      mockPrismaService.employee.findUnique.mockResolvedValue(employee);
      (mockPdfGenerator.generatePayrollPdf as jest.Mock).mockResolvedValue(
        pdfBuffer,
      );

      const result = await useCase.execute(payrollRunId);

      expect(result.buffer).toBe(pdfBuffer);
      expect(result.filename).toContain('nomina');
      expect(result.filename).toContain('2026-01');
      expect(mockPdfGenerator.generatePayrollPdf).toHaveBeenCalledWith(
        payrollRun,
        'Juan Pérez',
        'juan.perez@example.com',
      );
    });

    it('debe generar nombre de archivo sin espacios', async () => {
      const payrollRunId = 'payroll-123';
      const payrollRun = {
        id: payrollRunId,
        employeeId: 'emp-123',
        contractId: 'contract-123',
        period: '2026-02',
        gross: 2000000,
        net: 1760000,
        breakdown: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const employee = {
        id: 'emp-123',
        name: 'María López García',
        email: 'maria.lopez@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pdfBuffer = Buffer.from('fake-pdf-content');

      mockPrismaService.payrollRun.findUnique.mockResolvedValue(payrollRun);
      mockPrismaService.employee.findUnique.mockResolvedValue(employee);
      (mockPdfGenerator.generatePayrollPdf as jest.Mock).mockResolvedValue(
        pdfBuffer,
      );

      const result = await useCase.execute(payrollRunId);

      expect(result.filename).not.toContain(' ');
      expect(result.filename).toMatch(/^nomina-\d{4}-\d{2}-.+\.pdf$/);
    });

    it('debe lanzar NotFoundException si el empleado no existe', async () => {
      const payrollRunId = 'payroll-123';
      const payrollRun = {
        id: payrollRunId,
        employeeId: 'emp-123',
        contractId: 'contract-123',
        period: '2026-01',
        gross: 3000000,
        net: 2520000,
        breakdown: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.payrollRun.findUnique.mockResolvedValue(payrollRun);
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(useCase.execute(payrollRunId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(payrollRunId)).rejects.toThrow(
        'Empleado no encontrado',
      );
    });
  });
});
