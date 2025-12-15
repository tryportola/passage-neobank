import type { SigningApi } from '@portola/passage';
import type {
  SigningSessionCreateResponse,
  SigningSessionStatusResponse,
  SigningSessionsListResponse,
} from '@portola/passage';
import type { ResolvedConfig } from '../config';
import { BaseResource, unwrapResponse } from './base';

/**
 * Signing session data returned from the API
 */
export interface SigningSession {
  sessionId: string;
  applicationId: string;
  status: SigningSessionStatus;
  signingUrl?: string;
  expiresAt?: string;
  borrowerEmail?: string;
  borrowerName?: string;
  completedAt?: string | null;
  documentHandle?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
}

/**
 * Signing session status enum
 * Matches Prisma SigningStatus and OpenAPI status enum
 */
export type SigningSessionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

/**
 * Parameters for creating a signing session
 */
export interface SigningSessionCreateParams {
  borrowerEmail: string;
  borrowerName: string;
}

/**
 * Resource for managing document signing sessions
 */
export class SigningResource extends BaseResource {
  private api: SigningApi;

  constructor(api: SigningApi, config: ResolvedConfig) {
    super(config);
    this.api = api;
  }

  /**
   * Create a new signing session for an application
   *
   * After accepting a final offer, create a signing session to allow
   * the borrower to sign loan documents electronically.
   *
   * @example
   * ```typescript
   * const session = await passage.signing.create('app_123', {
   *   borrowerEmail: 'borrower@example.com',
   *   borrowerName: 'John Doe',
   * });
   *
   * // Redirect borrower to sign documents
   * console.log('Sign here:', session.signingUrl);
   * ```
   */
  async create(
    applicationId: string,
    params: SigningSessionCreateParams
  ): Promise<SigningSession> {
    return this.execute(async () => {
      this.debug('signing.create', applicationId);

      const response = await this.api.createSigningSession({
        applicationId,
        createSigningSessionRequest: {
          borrowerEmail: params.borrowerEmail,
          borrowerName: params.borrowerName,
        },
      });

      // Response is AxiosResponse<SigningSessionCreateResponse>
      const data = unwrapResponse(response);

      return {
        sessionId: data.sessionId,
        applicationId: data.applicationId,
        status: data.status as SigningSessionStatus,
        signingUrl: data.signingUrl,
        expiresAt: data.expiresAt,
      };
    }, 'signing.create');
  }

  /**
   * Get the status of a signing session
   *
   * @example
   * ```typescript
   * const session = await passage.signing.getStatus('session_abc123');
   *
   * if (session.status === 'COMPLETED') {
   *   console.log('Documents signed at:', session.completedAt);
   *   // Document handle available for download
   *   console.log('Document handle:', session.documentHandle);
   * }
   * ```
   */
  async getStatus(sessionId: string): Promise<SigningSession> {
    return this.execute(async () => {
      this.debug('signing.getStatus', sessionId);

      const response = await this.api.getSigningSessionStatus({ sessionId });
      // Response is AxiosResponse<SigningSessionStatusResponse>
      const data = unwrapResponse(response);

      return {
        sessionId: data.sessionId,
        applicationId: data.applicationId,
        status: data.status as SigningSessionStatus,
        borrowerEmail: data.borrowerEmail,
        borrowerName: data.borrowerName,
        completedAt: data.completedAt,
        documentHandle: data.signedDocHandle,
        failedAt: data.failedAt,
        failureReason: data.failureReason,
      };
    }, 'signing.getStatus');
  }

  /**
   * List all signing sessions for an application
   *
   * @example
   * ```typescript
   * const sessions = await passage.signing.list('app_123');
   *
   * for (const session of sessions) {
   *   console.log(`Session ${session.sessionId}: ${session.status}`);
   * }
   * ```
   */
  async list(applicationId: string): Promise<SigningSession[]> {
    return this.execute(async () => {
      this.debug('signing.list', applicationId);

      const response = await this.api.getSigningSessionsByApplication({ applicationId });
      // Response is AxiosResponse<SigningSessionsListResponse>
      const data = unwrapResponse(response);

      return data.sessions.map((session) => ({
        sessionId: session.sessionId,
        applicationId: session.applicationId,
        status: session.status as SigningSessionStatus,
        borrowerEmail: session.borrowerEmail,
        borrowerName: session.borrowerName,
        completedAt: session.completedAt,
        expiresAt: session.expiresAt,
        documentHandle: session.signedDocHandle,
        failedAt: session.failedAt,
        failureReason: session.failureReason,
      }));
    }, 'signing.list');
  }
}
