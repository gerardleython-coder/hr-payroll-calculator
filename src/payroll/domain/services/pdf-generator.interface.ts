import type { PayrollRun } from '@prisma/client';

/**
 * Interfaz para generadores de PDF de nómina.
 * Permite implementar diferentes estrategias de generación (pdfkit, puppeteer, etc.)
 * siguiendo el principio de Dependency Inversion (SOLID).
 */
export interface IPdfGenerator {
  /**
   * Genera un PDF de una nómina procesada.
   * @param payrollRun - Datos de la nómina
   * @param employeeName - Nombre del empleado
   * @param employeeEmail - Email del empleado
   * @returns Buffer con el contenido del PDF
   */
  generatePayrollPdf(
    payrollRun: PayrollRun,
    employeeName: string,
    employeeEmail: string,
  ): Promise<Buffer>;
}
