import { ContractorTaxStrategy, EmployeeTaxStrategy } from './tax.strategy';
import { PayrollCalculatorTemplate } from './payroll.calculator.template';

class Calc extends PayrollCalculatorTemplate {}

describe('PayrollCalculatorTemplate', () => {
  const makeCalc = () =>
    new Calc([new EmployeeTaxStrategy(), new ContractorTaxStrategy()]);

  it('calculates employee payroll with bonuses and deductions', () => {
    const calc = makeCalc();

    const res = calc.calculate({
      contractType: 'EMPLOYEE',
      baseSalary: 3_000_000,
      bonuses: 500_000,
      otherDeductions: 100_000,
    });

    expect(res.gross).toBe(3_500_000);
    expect(res.mandatoryDeductions).toBe(0); // Eliminada deducción ficticia
    expect(res.breakdown.health).toBeDefined();
    expect(res.breakdown.pension).toBeDefined();
    expect(res.breakdown.withholding).toBeGreaterThanOrEqual(0);
    expect(res.net).toBeLessThan(res.gross);
  });

  it('employee withholding is 0 when gross <= 2,000,000 (branch)', () => {
    const calc = makeCalc();

    const res = calc.calculate({
      contractType: 'EMPLOYEE',
      baseSalary: 1_900_000,
      bonuses: 0,
      otherDeductions: 0,
    });

    expect(res.breakdown.withholding).toBe(0);
  });

  it('calculates contractor payroll (different strategy branch)', () => {
    const calc = makeCalc();

    const res = calc.calculate({
      contractType: 'CONTRACTOR',
      baseSalary: 2_000_000,
      bonuses: 0,
      otherDeductions: 0,
    });

    expect(res.gross).toBe(2_000_000);
    expect(res.mandatoryDeductions).toBe(0);
    expect(res.breakdown.withholding).toBe(240_000); // 12% ficticio
    expect(res.net).toBe(1_760_000);
  });

  it('throws when otherDeductions > gross (edge case branch)', () => {
    const calc = makeCalc();

    expect(() =>
      calc.calculate({
        contractType: 'EMPLOYEE',
        baseSalary: 100_000,
        bonuses: 0,
        otherDeductions: 200_000,
      }),
    ).toThrow('otherDeductions cannot exceed gross');
  });

  it('throws when no tax strategy supports contractType (branch)', () => {
    const calc = new Calc([new EmployeeTaxStrategy()]); // sin ContractorTaxStrategy

    expect(() =>
      calc.calculate({
        contractType: 'CONTRACTOR',
        baseSalary: 100_000,
        bonuses: 0,
        otherDeductions: 0,
      }),
    ).toThrow(/No tax strategy/);
  });

  it('rejects negative salary / bonuses / otherDeductions (validation branches)', () => {
    const calc = makeCalc();

    expect(() =>
      calc.calculate({ contractType: 'EMPLOYEE', baseSalary: -1 }),
    ).toThrow();
    expect(() =>
      calc.calculate({ contractType: 'EMPLOYEE', baseSalary: 1, bonuses: -1 }),
    ).toThrow();
    expect(() =>
      calc.calculate({
        contractType: 'EMPLOYEE',
        baseSalary: 1,
        otherDeductions: -1,
      }),
    ).toThrow();
  });

  it('rejects null/undefined input (validation branch)', () => {
    const calc = makeCalc();
    // @ts-expect-error test purpose
    expect(() => calc.calculate(undefined)).toThrow('input required');
  });
});
