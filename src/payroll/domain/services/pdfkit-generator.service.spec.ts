import { Test, TestingModule } from '@nestjs/testing';
import { PdfKitGeneratorService } from './pdfkit-generator.service';
import type { PayrollRun } from '@prisma/client';

describe('PdfKitGeneratorService', () => {
  let service: PdfKitGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfKitGeneratorService],
    }).compile();

    service = module.get<PdfKitGeneratorService>(PdfKitGeneratorService);
  });

  describe('generatePayrollPdf', () => {
    it('should generate a PDF buffer', async () => {
      const payrollRun: PayrollRun = {
        id: 'test-id',
        employeeId: 'emp-id',
        contractId: 'contract-id',
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

      const buffer = await service.generatePayrollPdf(
        payrollRun,
        'Juan Pérez',
        'juan.perez@example.com',
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate PDF with correct header', async () => {
      const payrollRun: PayrollRun = {
        id: 'test-id',
        employeeId: 'emp-id',
        contractId: 'contract-id',
        period: '2026-01',
        gross: 2000000,
        net: 1760000,
        breakdown: {
          withholding: 240000,
          otherDeductions: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const buffer = await service.generatePayrollPdf(
        payrollRun,
        'María López',
        'maria.lopez@example.com',
      );

      // Verificar que es un PDF válido (comienza con %PDF)
      const pdfHeader = buffer.toString('utf8', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should handle EMPLOYEE payroll with all deductions', async () => {
      const payrollRun: PayrollRun = {
        id: 'test-id',
        employeeId: 'emp-id',
        contractId: 'contract-id',
        period: '2026-02',
        gross: 3500000,
        net: 2940000,
        breakdown: {
          health: 140000,
          pension: 140000,
          withholding: 280000,
          otherDeductions: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const buffer = await service.generatePayrollPdf(
        payrollRun,
        'Carlos Gómez',
        'carlos.gomez@example.com',
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle CONTRACTOR payroll without health/pension', async () => {
      const payrollRun: PayrollRun = {
        id: 'test-id',
        employeeId: 'emp-id',
        contractId: 'contract-id',
        period: '2026-03',
        gross: 2000000,
        net: 1760000,
        breakdown: {
          withholding: 240000,
          otherDeductions: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const buffer = await service.generatePayrollPdf(
        payrollRun,
        'Ana Martínez',
        'ana.martinez@example.com',
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle payroll with other deductions', async () => {
      const payrollRun: PayrollRun = {
        id: 'test-id',
        employeeId: 'emp-id',
        contractId: 'contract-id',
        period: '2026-04',
        gross: 3000000,
        net: 2370000,
        breakdown: {
          health: 120000,
          pension: 120000,
          withholding: 240000,
          otherDeductions: 150000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const buffer = await service.generatePayrollPdf(
        payrollRun,
        'Pedro Sánchez',
        'pedro.sanchez@example.com',
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
