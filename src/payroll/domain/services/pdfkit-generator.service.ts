import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { PayrollRun } from '@prisma/client';
import type { IPdfGenerator } from './pdf-generator.interface';

/**
 * Implementación de IPdfGenerator usando PDFKit.
 * Genera PDFs profesionales de nómina con formato estructurado.
 *
 * Responsabilidades (Single Responsibility):
 * - Generar PDF de nómina con formato profesional
 * - Formatear valores monetarios
 * - Estructurar información en tablas
 */
@Injectable()
export class PdfKitGeneratorService implements IPdfGenerator {
  async generatePayrollPdf(
    payrollRun: PayrollRun,
    employeeName: string,
    employeeEmail: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        // Capturar chunks del PDF
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generar contenido del PDF
        this.addHeader(doc);
        this.addEmployeeInfo(doc, employeeName, employeeEmail);
        this.addPayrollInfo(doc, payrollRun);
        this.addBreakdownTable(doc, payrollRun);
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Comprobante de Nómina', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Fecha de generación: ${this.formatDate(new Date())}`, {
        align: 'center',
      })
      .moveDown(1.5);
  }

  private addEmployeeInfo(
    doc: PDFKit.PDFDocument,
    employeeName: string,
    employeeEmail: string,
  ): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Información del Empleado');

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Nombre: ${employeeName}`)
      .text(`Email: ${employeeEmail}`)
      .moveDown(1);
  }

  private addPayrollInfo(
    doc: PDFKit.PDFDocument,
    payrollRun: PayrollRun,
  ): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Información de la Nómina');

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Período: ${payrollRun.period}`)
      .text(`ID Nómina: ${payrollRun.id}`)
      .moveDown(1);
  }

  private addBreakdownTable(
    doc: PDFKit.PDFDocument,
    payrollRun: PayrollRun,
  ): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Desglose de Nómina');
    doc.moveDown(0.5);

    const breakdown = payrollRun.breakdown as Record<string, any>;
    const startY = doc.y;
    const tableTop = startY;
    const col1X = 50;
    const col2X = 350;
    const rowHeight = 25;

    // Header de la tabla
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Concepto', col1X, tableTop)
      .text('Valor', col2X, tableTop);

    let currentY = tableTop + rowHeight;

    // Línea después del header
    doc
      .moveTo(col1X, currentY - 5)
      .lineTo(550, currentY - 5)
      .stroke();

    // Salario Bruto
    doc
      .font('Helvetica')
      .text('Salario Bruto', col1X, currentY)
      .text(this.formatCurrency(payrollRun.gross), col2X, currentY);
    currentY += rowHeight;

    // Deducciones
    if (breakdown.health) {
      doc
        .text('Salud (4%)', col1X, currentY)
        .text(this.formatCurrency(breakdown.health), col2X, currentY);
      currentY += rowHeight;
    }

    if (breakdown.pension) {
      doc
        .text('Pensión (4%)', col1X, currentY)
        .text(this.formatCurrency(breakdown.pension), col2X, currentY);
      currentY += rowHeight;
    }

    if (breakdown.withholding) {
      doc
        .text('Retención', col1X, currentY)
        .text(this.formatCurrency(breakdown.withholding), col2X, currentY);
      currentY += rowHeight;
    }

    if (breakdown.otherDeductions && breakdown.otherDeductions > 0) {
      doc
        .text('Otras Deducciones', col1X, currentY)
        .text(this.formatCurrency(breakdown.otherDeductions), col2X, currentY);
      currentY += rowHeight;
    }

    // Línea antes del total
    doc
      .moveTo(col1X, currentY - 5)
      .lineTo(550, currentY - 5)
      .stroke();

    // Salario Neto (destacado)
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Salario Neto', col1X, currentY)
      .text(this.formatCurrency(payrollRun.net), col2X, currentY);

    doc.moveDown(2);
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    doc
      .fontSize(8)
      .font('Helvetica')
      .text(
        'Este documento es un comprobante de nómina generado automáticamente.',
        50,
        doc.page.height - 50,
        { align: 'center' },
      );
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('es-CO')}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
