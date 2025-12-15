import type { LoansApi, LoanStatus, RepaymentStatus } from '@portola/passage';
import type {
  LoanResponse,
  PaymentScheduleResponse,
  Loan,
} from '@portola/passage';
import type { ResolvedConfig } from '../config';
import type { PaymentScheduleItem, LoanListParams, Pagination, Repayment } from '../types';
import { BaseResource, unwrapResponse } from './base';
import { PassageError } from '../errors';

/**
 * Resource for managing loans
 *
 * Supports listing loans (with filters), getting loan details, and viewing repayments.
 */
export class LoansResource extends BaseResource {
  private api: LoansApi;

  constructor(api: LoansApi, config: ResolvedConfig) {
    super(config);
    this.api = api;
  }

  /**
   * List loans with optional filtering
   *
   * @example
   * ```typescript
   * // List all loans
   * const { loans, pagination } = await passage.loans.list();
   *
   * // Filter by external user ID
   * const { loans } = await passage.loans.list({ externalId: 'user_123' });
   *
   * // Filter by borrower wallet
   * const { loans } = await passage.loans.list({ borrowerAddress: '0x...' });
   *
   * // Filter by status
   * const { loans } = await passage.loans.list({ status: 'active' });
   * ```
   */
  async list(params?: LoanListParams): Promise<{
    loans: Loan[];
    pagination: Pagination;
  }> {
    return this.execute(async () => {
      this.debug('loans.list', params);

      const response = await this.api.listLoans({
        status: params?.status as LoanStatus,
        externalId: params?.externalId,
        borrowerAddress: params?.borrowerAddress,
        limit: params?.limit,
        offset: params?.offset,
      });

      // Pagination is inside data per OpenAPI spec
      const data = unwrapResponse(response);

      return {
        loans: data.loans,
        pagination: data.pagination ?? {
          total: data.loans.length,
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0,
          hasMore: false,
        },
      };
    }, 'loans.list');
  }

  /**
   * List repayments for a loan
   *
   * @example
   * ```typescript
   * const { repayments, pagination } = await passage.loans.getRepayments('loan_123');
   *
   * for (const repayment of repayments) {
   *   console.log(`Received ${repayment.amount} on ${repayment.receivedAt}`);
   * }
   * ```
   */
  async getRepayments(
    loanId: string,
    params?: { limit?: number; offset?: number; status?: RepaymentStatus }
  ): Promise<{ repayments: Repayment[]; pagination: Pagination }> {
    return this.execute(async () => {
      this.debug('loans.getRepayments', { loanId, ...params });

      const response = await this.api.listLoanRepayments({
        loanId,
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
      });

      // Pagination is inside data per OpenAPI spec
      const data = unwrapResponse(response) as typeof response.data.data & { pagination?: Pagination };

      return {
        repayments: data.repayments as Repayment[],
        pagination: data.pagination ?? {
          total: data.repayments.length,
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0,
          hasMore: false,
        },
      };
    }, 'loans.getRepayments');
  }

  /**
   * Get a single loan by ID
   *
   * @example
   * ```typescript
   * const loan = await passage.loans.get('loan_123');
   * console.log(`Outstanding: ${loan.outstandingBalance}`);
   * ```
   */
  async get(loanId: string): Promise<Loan> {
    return this.execute(async () => {
      this.debug('loans.get', loanId);

      const response = await this.api.getLoan({ loanId });
      // Response is AxiosResponse<LoanResponse>
      // LoanResponse = { success: boolean, data: Loan }
      return unwrapResponse(response);
    }, 'loans.get');
  }

  /**
   * Get the payment schedule for a loan
   *
   * @example
   * ```typescript
   * const schedule = await passage.loans.getPaymentSchedule('loan_123');
   *
   * for (const payment of schedule) {
   *   console.log(`Payment ${payment.paymentNumber}: ${payment.payment} due ${payment.dueDate}`);
   * }
   * ```
   */
  async getPaymentSchedule(loanId: string): Promise<PaymentScheduleItem[]> {
    return this.execute(async () => {
      this.debug('loans.getPaymentSchedule', loanId);

      const response = await this.api.getPaymentSchedule({ loanId });
      // Response is AxiosResponse<PaymentScheduleResponse>
      // PaymentScheduleResponse = { success: boolean, data: PaymentScheduleResponseData }
      const data = unwrapResponse(response);

      return data.projectedSchedule;
    }, 'loans.getPaymentSchedule');
  }

  /**
   * Get loan by application ID
   *
   * Returns null if no loan exists for this application (instead of throwing NotFoundError).
   *
   * @example
   * ```typescript
   * const loan = await passage.loans.getByApplication('app_123');
   * if (loan) {
   *   console.log(`Loan found: ${loan.id}`);
   * } else {
   *   console.log('No loan exists for this application yet');
   * }
   * ```
   */
  async getByApplication(applicationId: string): Promise<Loan | null> {
    try {
      return await this.execute(async () => {
        this.debug('loans.getByApplication', applicationId);
        const response = await this.api.getLoanByApplication({ applicationId });
        // Response is AxiosResponse<LoanResponse>
        return unwrapResponse(response);
      }, 'loans.getByApplication');
    } catch (error) {
      // Return null if no loan exists for this application
      if (error instanceof PassageError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
