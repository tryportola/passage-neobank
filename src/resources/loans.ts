import type { LoansApi } from '@portola/passage';
import type {
  LoanListResponse,
  LoanResponse,
  PaymentScheduleResponse,
  Loan,
} from '@portola/passage';
import type { ResolvedConfig } from '../config';
import type { LoanListParams, PaymentScheduleItem, Pagination } from '../types';
import { BaseResource, unwrapResponse } from './base';
import { PassageError } from '../errors';

/**
 * Resource for managing loans
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
   * // List all active loans
   * const { loans } = await passage.loans.list({ status: 'ACTIVE' });
   *
   * // Paginate through loans
   * const { loans, pagination } = await passage.loans.list({ limit: 20, offset: 40 });
   * ```
   */
  async list(params?: LoanListParams): Promise<{
    loans: Loan[];
    pagination: Pagination;
  }> {
    return this.execute(async () => {
      this.debug('loans.list', params);

      const response = await this.api.listLoans({
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
      });

      // Response is AxiosResponse<LoanListResponse>
      // LoanListResponse = { success: boolean, data: { loans: Loan[], pagination: {...} } }
      const data = unwrapResponse(response);

      return {
        loans: data.loans,
        pagination: {
          total: data.pagination.total,
          limit: data.pagination.limit,
          offset: data.pagination.offset,
          hasMore: data.pagination.total > data.pagination.offset + data.pagination.limit,
        },
      };
    }, 'loans.list');
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
