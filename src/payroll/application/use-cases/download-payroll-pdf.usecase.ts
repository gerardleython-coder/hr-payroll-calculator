import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { IPdfGenerator } from '../../domain/services/pdf-generator.interface';

/**
 * Use Case para descargar PDF de una nómina procesada (HU-13).
 * Genera un PDF profesional con toda la información de la nómina.
 *
 * Reglas de negocio implementadas:
 * - RN-13.1: Validación de existencia de nómina y empleado
 * - RN-13.2: Contenido obligatorio del PDF
 * - RN-13.5: Nombre de archivo descriptivo sin espacios
 */
@Injectable()
export class DownloadPayrollPdfUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IPdfGenerator') private readonly pdfGenerator: IPdfGenerator,
  ) {}

  async execute(payrollRunId: string): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    // RN-13.1: Validar que la nómina existe
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
    });

    if (!payrollRun) {
      throw new NotFoundException('Nómina no encontrada');
    }

    // RN-13.1: Validar que el empleado existe
    const employee = await this.prisma.employee.findUnique({
      where: { id: payrollRun.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // RN-13.2: Generar PDF con información completa
    const buffer = await this.pdfGenerator.generatePayrollPdf(
      payrollRun,
      employee.name,
      employee.email,
    );

    // RN-13.5: Generar nombre de archivo descriptivo sin espacios ni caracteres especiales
    const sanitizedName = employee.name
      .normalize('NFD') // Normalizar caracteres Unicode
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos (acentos)
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .toLowerCase();
    const filename = `nomina-${payrollRun.period}-${sanitizedName}.pdf`;

    return { buffer, filename };
  }
}
