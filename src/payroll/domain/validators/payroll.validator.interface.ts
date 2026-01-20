/**
 * Interface for payroll validation using Chain of Responsibility pattern.
 * Each validator implements this interface and can be chained together.
 */
export interface IPayrollValidator {
  /**
   * Validates a specific aspect of the payroll calculation preconditions.
   * @param context - The validation context containing necessary data
   * @throws Error if validation fails
   */
  validate(context: PayrollValidationContext): Promise<void>;
}

/**
 * Context object passed through the validation chain.
 * Contains all data needed for validators to perform their checks.
 */
export interface PayrollValidationContext {
  employeeId: string;
  contractId: string;
  contract?: {
    id: string;
    employeeId: string;
    active: boolean;
    contractType: string;
    baseSalary: number;
  } | null;
}
