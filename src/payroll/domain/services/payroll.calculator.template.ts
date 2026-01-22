import { PayrollInput, PayrollResult } from '../models/payroll.models';
import { TaxStrategy } from './tax.strategy';

export abstract class PayrollCalculatorTemplate {
  constructor(private readonly taxStrategies: TaxStrategy[]) {}

  // TEMPLATE METHOD (no lo sobreescribas): define el algoritmo.
  calculate(input: PayrollInput): PayrollResult {
    // HUMAN REVIEW: validaciones de dominio (no confiar en IA para reglas de negocio)
    this.validate(input);

    const gross = this.computeGross(input);
    const { taxes, taxDetail, mandatoryDeductions } = this.computeDeductions(
      gross,
      input,
    );
    const otherDeductions = this.normalizeMoney(input.otherDeductions ?? 0);

    if (otherDeductions > gross)
      throw new Error('otherDeductions cannot exceed gross');

    const net = this.round2(
      gross - taxes - mandatoryDeductions - otherDeductions,
    );

    return {
      gross: this.round2(gross),
      taxes: this.round2(taxes),
      mandatoryDeductions: this.round2(mandatoryDeductions),
      otherDeductions: this.round2(otherDeductions),
      net,
      breakdown: {
        gross: this.round2(gross),
        ...taxDetail,
        mandatoryDeductions: this.round2(mandatoryDeductions),
        otherDeductions: this.round2(otherDeductions),
        net,
      },
    };
  }

  // HUMAN REVIEW: La IA proponía dejar toda la validación al DTO/controller.
  // Yo mantuve validación de dominio aquí (input requerido, no negativos, otherDeductions <= gross)
  // porque la lógica de negocio debe ser independiente de HTTP y seguir siendo testeable.
  protected validate(input: PayrollInput) {
    if (!input) throw new Error('input required');
    if (input.baseSalary < 0) throw new Error('baseSalary must be >= 0');
    if ((input.bonuses ?? 0) < 0) throw new Error('bonuses must be >= 0');
    if ((input.otherDeductions ?? 0) < 0)
      throw new Error('otherDeductions must be >= 0');
  }

  protected computeGross(input: PayrollInput) {
    return (
      this.normalizeMoney(input.baseSalary) +
      this.normalizeMoney(input.bonuses ?? 0)
    );
  }

  protected computeDeductions(gross: number, input: PayrollInput) {
    const strategy = this.taxStrategies.find((s) => s.supports(input));
    if (!strategy)
      throw new Error(`No tax strategy for contractType=${input.contractType}`);

    const { total: taxes, detail: taxDetail } = strategy.computeTaxes(
      gross,
      input,
    );

    return { taxes: this.round2(taxes), taxDetail, mandatoryDeductions: 0 };
  }

  protected normalizeMoney(n: number) {
    return this.round2(n);
  }
  protected round2(n: number) {
    return Math.round(n * 100) / 100;
  }
}
