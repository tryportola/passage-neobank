import type { ApplicationsApi, ApplicationListItem, ApplicationStatus } from '@portola/passage';
import type {
  ApplicationResponse,
  ApplicationSubmitResponse,
  ApplicationSubmitResponseData,
  ListApplications200Response,
  DraftSubmitResponse,
  DraftSubmitResponseData,
  ApplicationStatusUpdateResponse,
  ApplicationStatusUpdateResponseData,
} from '@portola/passage';
import type { ResolvedConfig } from '../config';
import type {
  Application,
  ApplicationListParams,
  ApplicationCreateParams,
  Pagination,
} from '../types';
import { BaseResource, unwrapResponse } from './base';

/**
 * Resource for managing loan applications
 */
export class ApplicationsResource extends BaseResource {
  private api: ApplicationsApi;

  constructor(api: ApplicationsApi, config: ResolvedConfig) {
    super(config);
    this.api = api;
  }

  /**
   * List applications with optional filtering
   *
   * Note: Returns ApplicationListItem[], which is a lighter type than Application.
   * Use get(id) to fetch the full Application details if needed.
   *
   * @example
   * ```typescript
   * // List all applications
   * const { applications, pagination } = await passage.applications.list();
   *
   * // Filter by status
   * const { applications } = await passage.applications.list({
   *   status: 'OFFERS_READY',
   *   limit: 20,
   * });
   *
   * // Get full details for a specific application
   * const fullApp = await passage.applications.get(applications[0].id);
   * ```
   */
  async list(params?: ApplicationListParams): Promise<{
    applications: ApplicationListItem[];
    pagination: Pagination;
  }> {
    return this.execute(async () => {
      this.debug('applications.list', params);

      const response = await this.api.listApplications({
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        productType: params?.productType,
        externalId: params?.externalId,
        borrowerWalletAddress: params?.borrowerWalletAddress,
      });

      // Response is AxiosResponse<ListApplications200Response>
      // ListApplications200Response = { success: boolean, data: { applications: ApplicationListItem[] } }
      // Pagination is inside data per OpenAPI spec (if present)
      const data = unwrapResponse(response) as typeof response.data.data & { pagination?: Pagination };

      return {
        applications: data.applications,
        pagination: data.pagination ?? {
          total: data.applications.length,
          limit: params?.limit ?? 20,
          offset: params?.offset ?? 0,
          hasMore: false,
        },
      };
    }, 'applications.list');
  }

  /**
   * Get a single application by ID
   *
   * @example
   * ```typescript
   * const application = await passage.applications.get('app_123');
   * console.log(application.status); // 'OFFERS_READY'
   * ```
   */
  async get(applicationId: string): Promise<Application> {
    return this.execute(async () => {
      this.debug('applications.get', applicationId);

      const response = await this.api.getApplication({ applicationId });
      // Response is AxiosResponse<ApplicationResponse>
      // ApplicationResponse = { success: boolean, data: ApplicationResponseData }
      return unwrapResponse(response);
    }, 'applications.get');
  }

  /**
   * Create a new loan application
   *
   * @example
   * ```typescript
   * import { encryptPIIForLenders } from '@portola/passage-neobank/crypto';
   *
   * // Get available lenders
   * const lenders = await passage.lenders.list({ productType: 'personal', stateCode: 'CA' });
   *
   * // Encrypt PII for each lender
   * const encryptedPayloads = encryptPIIForLenders(
   *   lenders.map(l => ({ lenderId: l.lenderId, publicKey: l.publicKey })),
   *   borrowerPII
   * );
   *
   * // Create application
   * const application = await passage.applications.create({
   *   productType: 'personal',
   *   encryptedPayloads,
   *   metadata: { requestedAmount: 10000 },
   * });
   * ```
   */
  async create(params: ApplicationCreateParams): Promise<ApplicationSubmitResponseData> {
    return this.execute(async () => {
      this.debug('applications.create', { productType: params.productType, externalId: params.externalId });

      const response = await this.api.submitApplication({
        applicationRequest: {
          productType: params.productType,
          encryptedPayloads: params.encryptedPayloads,
          externalId: params.externalId,
          metadata: params.metadata,
          draft: params.draft,
          borrowerWalletAddress: params.borrowerWalletAddress,
          borrowerWalletChain: params.borrowerWalletChain,
        },
      });

      // Response is AxiosResponse<ApplicationSubmitResponse>
      // ApplicationSubmitResponse = { success: boolean, data: ApplicationSubmitResponseData }
      return unwrapResponse(response);
    }, 'applications.create');
  }

  /**
   * Submit a draft application
   *
   * @example
   * ```typescript
   * const submitted = await passage.applications.submitDraft(draftApp.id, {
   *   perLenderKycHandles: [
   *     { lenderId: 'lender_1', handle: 'sdx_handle_1' },
   *   ],
   * });
   * ```
   */
  async submitDraft(
    applicationId: string,
    params?: {
      perLenderKycHandles?: Array<{ lenderId: string; handle: string }>;
    }
  ): Promise<DraftSubmitResponseData> {
    return this.execute(async () => {
      this.debug('applications.submitDraft', applicationId);

      const response = await this.api.submitDraftApplication({
        applicationId,
        draftSubmitRequest: {
          perLenderKycHandles: params?.perLenderKycHandles,
        },
      });

      // Response is AxiosResponse<DraftSubmitResponse>
      return unwrapResponse(response);
    }, 'applications.submitDraft');
  }

  /**
   * Update an application's status
   *
   * Note: Not all status transitions are valid. The API will return an error
   * for invalid transitions (e.g., cannot move from FUNDED back to PENDING).
   *
   * @example
   * ```typescript
   * // Cancel an application
   * const updated = await passage.applications.updateStatus('app_123', 'CANCELLED');
   * console.log(updated.status); // 'CANCELLED'
   * ```
   */
  async updateStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<ApplicationStatusUpdateResponseData> {
    return this.execute(async () => {
      this.debug('applications.updateStatus', { applicationId, status });

      const response = await this.api.updateApplicationStatus({
        applicationId,
        updateApplicationStatusRequest: { status },
      });

      // Response is AxiosResponse<ApplicationStatusUpdateResponse>
      return unwrapResponse(response);
    }, 'applications.updateStatus');
  }

  /**
   * Cancel an application
   *
   * Convenience method that calls updateStatus with 'CANCELLED'.
   * This is typically used when a borrower abandons the application flow.
   *
   * @example
   * ```typescript
   * // User clicked "Cancel Application"
   * const cancelled = await passage.applications.cancel('app_123');
   * console.log(cancelled.status); // 'CANCELLED'
   * ```
   */
  async cancel(applicationId: string): Promise<ApplicationStatusUpdateResponseData> {
    return this.updateStatus(applicationId, 'CANCELLED');
  }
}
