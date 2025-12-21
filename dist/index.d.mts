import * as _portola_passage from '@portola/passage';
import { ApplicationsApi, ApplicationListItem, ApplicationSubmitResponseData, DraftSubmitResponseData, ApplicationStatus, ApplicationStatusUpdateResponseData, OffersApi, OfferAcceptanceResponseData, LoansApi, Loan, RepaymentStatus, EntityDiscoveryApi, NeobankSelfServiceApi, WebhookTestResponseData, WebhookSecretRotateResponseData, SigningApi, SDXApi, WalletsApi, Chain, WalletType as WalletType$1, WalletVerificationMethod, WalletVerificationStatus } from '@portola/passage';
export { ApplicationStatus, ApplicationStatusUpdateResponseData, Chain, ApplicationRequestEncryptedPayloadsInner as EncryptedPayloadInput, KYCHandleRequest, KYCHandleResponse, KYCHandleResponseData, KYCInitiateResponse, KYCInitiateResponseData, KYCProvidersResponse, KYCProvidersResponseData, KYCProvidersResponseDataProvidersInner, KYCStatusResponse, KYCStatusResponseData, KYCStatusResponseDataAttestationsInner, KYCStatusResponseDataStatusEnum, LenderDetail, LenderDetailPublicKey, LenderPublicKeyResponse, LenderPublicKeyResponseData, Loan, LoanStatus, OfferAcceptanceResponseData, ApplicationRequestProductTypeEnum as ProductType, WalletType as WalletOwnershipType, WalletVerificationMethod, WalletVerificationStatus, WebhookSecretRotateResponseData, WebhookTestResponseData } from '@portola/passage';
export { A as AuthenticationError, a as AuthorizationError, C as ConflictError, b as NetworkError, N as NotFoundError, P as PassageError, R as RateLimitError, T as TimeoutError, V as ValidationError } from './errors-DgbLNkc1.mjs';
export { D as DecryptedOfferDetails, a as DecryptionResult, H as HybridEncryptedPayload } from './types-BYrBoKhR.mjs';

/**
 * Configuration for the Passage SDK client
 */
interface PassageClientConfig {
    /**
     * Your neobank API key (starts with nb_test_ or nb_live_)
     */
    apiKey: string;
    /**
     * Environment to connect to
     * @default 'production'
     */
    environment?: 'sandbox' | 'production';
    /**
     * Custom base URL (overrides environment setting)
     * Only use this for testing or special configurations
     */
    baseUrl?: string;
    /**
     * Request timeout in milliseconds
     * @default 30000
     */
    timeout?: number;
    /**
     * Maximum number of retries for failed requests
     * @default 3
     */
    maxRetries?: number;
    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;
}
/**
 * Internal resolved configuration with all defaults applied
 */
interface ResolvedConfig extends Required<Omit<PassageClientConfig, 'baseUrl'>> {
    baseUrl: string;
}

interface Pagination {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
interface PaginationParams {
    limit?: number;
    offset?: number;
}
/**
 * Alias for ApplicationRequestEncryptedPayloadsInner
 * Use this when creating encrypted payloads for application submission
 */
type EncryptedPIIPayload = _portola_passage.ApplicationRequestEncryptedPayloadsInner;
/**
 * Alias for ApplicationResponseDataWalletTypeEnum
 * Indicates the custody model for the borrower's wallet
 */
type WalletType = _portola_passage.ApplicationResponseDataWalletTypeEnum;
/**
 * Alias for EncryptedOfferOfferTypeEnum
 * Indicates the type of offer (prequalified or final)
 */
type OfferType = _portola_passage.EncryptedOfferOfferTypeEnum;
/**
 * Alias for OfferAcceptanceRequestBorrowerWallet
 */
type BorrowerWallet = _portola_passage.OfferAcceptanceRequestBorrowerWallet;
/**
 * Alias for OfferAcceptanceRequestHardPullConsent
 */
type HardPullConsent = _portola_passage.OfferAcceptanceRequestHardPullConsent;
/**
 * Alias for OfferAcceptanceRequestCommunicationPreferences
 */
type CommunicationPreferences = _portola_passage.OfferAcceptanceRequestCommunicationPreferences;
/**
 * Alias for ScheduledPayment
 */
type PaymentScheduleItem = _portola_passage.ScheduledPayment;
/**
 * Parameters for listing applications
 */
interface ApplicationListParams extends PaginationParams {
    status?: _portola_passage.ApplicationStatus;
    productType?: _portola_passage.ApplicationRequestProductTypeEnum;
    /** Filter by your external reference ID (exact match) */
    externalId?: string;
    /** Filter by borrower's wallet address (case-insensitive) */
    borrowerWalletAddress?: string;
}
/**
 * Parameters for creating a new application
 */
interface ApplicationCreateParams {
    productType: _portola_passage.ApplicationRequestProductTypeEnum;
    encryptedPayloads: EncryptedPIIPayload[];
    /** Your external reference ID (e.g., user ID in your system) */
    externalId?: string;
    metadata?: Record<string, unknown>;
    draft?: boolean;
    /**
     * Reference to a verified Wallet resource (preferred method)
     *
     * When set, wallet ownership must be verified before submission.
     * Use passage.wallets.create() and passage.wallets.initiateVerification()
     * to register and verify the wallet first.
     *
     * @example
     * ```typescript
     * // 1. Register and verify wallet
     * const wallet = await passage.wallets.create({ address: '0x...' });
     * const challenge = await passage.wallets.initiateVerification(wallet.id, { method: 'MESSAGE_SIGN' });
     * const signature = await userWallet.signMessage(challenge.challenge.message);
     * await passage.wallets.submitProof(challenge.verificationId, { signature });
     *
     * // 2. Create application with verified wallet
     * const app = await passage.applications.create({
     *   walletId: wallet.id,
     *   productType: 'personal',
     *   encryptedPayloads: [...],
     * });
     * ```
     */
    walletId?: string;
    /**
     * Borrower's wallet address for disbursement (legacy - use walletId instead)
     * @deprecated Use walletId with verified wallet ownership instead
     */
    borrowerWalletAddress?: string;
    /**
     * Blockchain chain for borrower's wallet (default: 'base')
     * @deprecated Use walletId with verified wallet ownership instead
     */
    borrowerWalletChain?: 'base' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'solana';
}
/**
 * Parameters for accepting a prequalified offer
 */
interface PrequalAcceptParams {
    hardPullConsent: HardPullConsent;
    communicationPreferences?: CommunicationPreferences;
}
/**
 * Parameters for accepting a final offer
 */
interface FinalOfferAcceptParams {
    hardPullConsent: HardPullConsent;
    borrowerWallet?: BorrowerWallet;
    communicationPreferences?: CommunicationPreferences;
}
/**
 * Parameters for listing lenders
 */
interface LenderListParams {
    productType?: string;
    stateCode?: string;
}
/**
 * Parameters for listing loans
 */
interface LoanListParams extends PaginationParams {
    /** Filter by loan status */
    status?: 'active' | 'paid_off' | 'delinquent' | 'defaulted' | 'closed' | 'all';
    /** Filter by application's external reference ID (joins through application) */
    externalId?: string;
    /** Filter by borrower's wallet address (case-insensitive) */
    borrowerAddress?: string;
}
/**
 * Application data returned from the API (unwrapped from envelope)
 */
type Application = _portola_passage.ApplicationResponseData;
/**
 * Offers response data (unwrapped from envelope)
 */
type OffersResponse = _portola_passage.EncryptedOffersResponseData;
/**
 * Single offer from a lender
 */
type Offer = _portola_passage.EncryptedOffer;
/**
 * Lender with offers grouped
 */
type LenderOffers = _portola_passage.EncryptedOffersResponseDataLendersInner;
/**
 * Account info (unwrapped)
 */
type AccountInfo = _portola_passage.NeobankAccountResponseData;
/**
 * Webhook config (unwrapped)
 */
type WebhookConfig = _portola_passage.WebhookConfigResponseData;
/**
 * Lender info from discovery list
 */
type Lender = _portola_passage.LenderListItem;
/**
 * Account statistics response
 */
interface NeobankStats {
    applications: {
        total: number;
        byStatus: Record<string, number>;
    };
    loans: {
        total: number;
        active: number;
        paidOff: number;
        totalDisbursed: string;
        outstandingPrincipal: string;
    };
    borrowers: {
        total: number;
    };
    asOf: string;
}
/**
 * Repayment data from a loan
 */
interface Repayment {
    id: string;
    loanId: string;
    bridgeDrainId?: string | null;
    amount: string;
    currency: string;
    sourceAddress?: string | null;
    sourceChain?: string | null;
    depositTxHash?: string | null;
    destinationTxHash?: string | null;
    principalPortion?: string | null;
    interestPortion?: string | null;
    balanceBefore?: string | null;
    balanceAfter?: string | null;
    receivedAt: string;
    completedAt?: string | null;
    status: string;
    createdAt: string;
}

/**
 * Base class for all resource clients
 */
declare abstract class BaseResource {
    protected config: ResolvedConfig;
    constructor(config: ResolvedConfig);
    /**
     * Execute an API call with retry logic and error handling
     */
    protected execute<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
    /**
     * Convert various error types to PassageError
     */
    private convertError;
    /**
     * Type guard for axios errors
     */
    private isAxiosError;
    /**
     * Sleep for a specified duration
     */
    private sleep;
    /**
     * Log debug message if debug mode is enabled
     */
    protected debug(message: string, ...args: unknown[]): void;
}

/**
 * Resource for managing loan applications
 */
declare class ApplicationsResource extends BaseResource {
    private api;
    constructor(api: ApplicationsApi, config: ResolvedConfig);
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
    list(params?: ApplicationListParams): Promise<{
        applications: ApplicationListItem[];
        pagination: Pagination;
    }>;
    /**
     * Get a single application by ID
     *
     * @example
     * ```typescript
     * const application = await passage.applications.get('app_123');
     * console.log(application.status); // 'OFFERS_READY'
     * ```
     */
    get(applicationId: string): Promise<Application>;
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
    create(params: ApplicationCreateParams): Promise<ApplicationSubmitResponseData>;
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
    submitDraft(applicationId: string, params?: {
        perLenderKycHandles?: Array<{
            lenderId: string;
            handle: string;
        }>;
    }): Promise<DraftSubmitResponseData>;
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
    updateStatus(applicationId: string, status: ApplicationStatus): Promise<ApplicationStatusUpdateResponseData>;
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
    cancel(applicationId: string): Promise<ApplicationStatusUpdateResponseData>;
}

/**
 * Resource for managing loan offers
 */
declare class OffersResource extends BaseResource {
    private api;
    constructor(api: OffersApi, config: ResolvedConfig);
    /**
     * Get prequalified offers for an application
     *
     * @example
     * ```typescript
     * import { decryptOfferDetails } from '@portola/passage-neobank/crypto';
     *
     * const offers = await passage.offers.getPrequalified(applicationId);
     *
     * for (const lenderGroup of offers.lenders) {
     *   for (const offer of lenderGroup.offers) {
     *     const { data, verified } = decryptOfferDetails(
     *       offer.encryptedOfferDetailsNeobank,
     *       offer.checksumSha256,
     *       process.env.NEOBANK_PRIVATE_KEY!
     *     );
     *
     *     if (verified) {
     *       console.log(`${lenderGroup.lenderName}: ${data.apr} APR`);
     *     }
     *   }
     * }
     * ```
     */
    getPrequalified(applicationId: string): Promise<OffersResponse>;
    /**
     * Accept a prequalified offer to proceed to final underwriting
     *
     * Requires hard pull consent from the borrower.
     *
     * @example
     * ```typescript
     * const result = await passage.offers.acceptPrequal(offerId, {
     *   hardPullConsent: {
     *     consented: true,
     *     consentedAt: new Date().toISOString(),
     *     ipAddress: req.ip,
     *     userAgent: req.headers['user-agent'],
     *   },
     * });
     * // Application moves to final underwriting
     * ```
     */
    acceptPrequal(offerId: string, params: PrequalAcceptParams): Promise<OfferAcceptanceResponseData>;
    /**
     * Get final offers for an application (after accepting prequal)
     *
     * @example
     * ```typescript
     * const finalOffers = await passage.offers.getFinal(applicationId);
     * ```
     */
    getFinal(applicationId: string): Promise<OffersResponse>;
    /**
     * Accept a final offer to proceed to signing
     *
     * This is the point of no return - the borrower commits to the loan terms.
     *
     * @example
     * ```typescript
     * const result = await passage.offers.acceptFinal(offerId, {
     *   hardPullConsent: {
     *     consented: true,
     *     consentedAt: new Date().toISOString(),
     *     ipAddress: req.ip,
     *     userAgent: req.headers['user-agent'],
     *   },
     *   borrowerWallet: {
     *     address: '0x1234...',
     *     chain: 'polygon',
     *   },
     * });
     * ```
     */
    acceptFinal(offerId: string, params: FinalOfferAcceptParams): Promise<OfferAcceptanceResponseData>;
}

/**
 * Resource for managing loans
 *
 * Supports listing loans (with filters), getting loan details, and viewing repayments.
 */
declare class LoansResource extends BaseResource {
    private api;
    constructor(api: LoansApi, config: ResolvedConfig);
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
    list(params?: LoanListParams): Promise<{
        loans: Loan[];
        pagination: Pagination;
    }>;
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
    getRepayments(loanId: string, params?: {
        limit?: number;
        offset?: number;
        status?: RepaymentStatus;
    }): Promise<{
        repayments: Repayment[];
        pagination: Pagination;
    }>;
    /**
     * Get a single loan by ID
     *
     * @example
     * ```typescript
     * const loan = await passage.loans.get('loan_123');
     * console.log(`Outstanding: ${loan.outstandingBalance}`);
     * ```
     */
    get(loanId: string): Promise<Loan>;
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
    getPaymentSchedule(loanId: string): Promise<PaymentScheduleItem[]>;
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
    getByApplication(applicationId: string): Promise<Loan | null>;
}

/**
 * Resource for discovering available lenders
 */
declare class LendersResource extends BaseResource {
    private api;
    constructor(api: EntityDiscoveryApi, config: ResolvedConfig);
    /**
     * List available lenders with optional filtering
     *
     * Returns lenders that support the specified product type and state.
     * Each lender includes their public key needed for PII encryption.
     *
     * @example
     * ```typescript
     * // Get lenders for personal loans in California
     * const lenders = await passage.lenders.list({
     *   productType: 'personal',
     *   stateCode: 'CA',
     * });
     *
     * // Use lender public keys for encryption
     * for (const lender of lenders) {
     *   console.log(`${lender.name}: supports ${lender.supportedProducts.join(', ')}`);
     * }
     * ```
     */
    list(params?: LenderListParams): Promise<Lender[]>;
}

/**
 * Resource for neobank self-service operations
 */
declare class AccountResource extends BaseResource {
    private api;
    constructor(api: NeobankSelfServiceApi, config: ResolvedConfig);
    /**
     * Get current neobank account information
     *
     * @example
     * ```typescript
     * const info = await passage.account.getInfo();
     * console.log(info.name); // 'My Neobank'
     * console.log(info.environment); // 'sandbox' or 'production'
     * ```
     */
    getInfo(): Promise<AccountInfo>;
    /**
     * Get aggregated statistics for your neobank account
     *
     * Returns application counts by status, loan statistics, and borrower counts.
     *
     * @example
     * ```typescript
     * const stats = await passage.account.getStats();
     * console.log(`Total applications: ${stats.applications.total}`);
     * console.log(`Active loans: ${stats.loans.active}`);
     * console.log(`Total disbursed: ${stats.loans.totalDisbursed}`);
     * console.log(`Unique borrowers: ${stats.borrowers.total}`);
     * ```
     */
    getStats(): Promise<NeobankStats>;
    /**
     * Get webhook configuration
     *
     * @example
     * ```typescript
     * const webhook = await passage.account.getWebhook();
     * if (webhook.webhookUrl) {
     *   console.log(`Webhook configured: ${webhook.webhookUrl}`);
     * }
     * ```
     */
    getWebhook(): Promise<WebhookConfig>;
    /**
     * Update webhook URL
     *
     * URL must be HTTPS in production. HTTP is allowed in sandbox for testing.
     *
     * @example
     * ```typescript
     * const result = await passage.account.updateWebhook({
     *   url: 'https://api.myapp.com/webhooks/passage',
     * });
     * console.log(result.message); // 'Webhook URL updated successfully'
     * ```
     */
    updateWebhook(params: {
        url: string;
    }): Promise<{
        webhookUrl: string | null | undefined;
        message: string;
    }>;
    /**
     * Send a test webhook to verify endpoint configuration
     *
     * @example
     * ```typescript
     * const result = await passage.account.testWebhook();
     * if (result.delivered) {
     *   console.log('Webhook test successful');
     * } else {
     *   console.log(`Test failed: ${result.error}`);
     * }
     * ```
     */
    testWebhook(): Promise<WebhookTestResponseData>;
    /**
     * Rotate webhook secret
     *
     * IMPORTANT: The new secret is only returned once. Store it securely.
     *
     * @example
     * ```typescript
     * const result = await passage.account.rotateWebhookSecret();
     * // Store this securely - it won't be shown again!
     * await saveToSecretManager(result.webhookSecret);
     * ```
     */
    rotateWebhookSecret(): Promise<WebhookSecretRotateResponseData>;
}

/**
 * Signing session data returned from the API
 */
interface SigningSession {
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
 * References SDK type which matches Prisma SigningStatus and OpenAPI status enum
 */
type SigningSessionStatus = _portola_passage.SigningSessionStatusResponseDataStatusEnum;
/**
 * Parameters for creating a signing session
 */
interface SigningSessionCreateParams {
    borrowerEmail: string;
    borrowerName: string;
}
/**
 * Resource for managing document signing sessions
 */
declare class SigningResource extends BaseResource {
    private api;
    constructor(api: SigningApi, config: ResolvedConfig);
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
    create(applicationId: string, params: SigningSessionCreateParams): Promise<SigningSession>;
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
    getStatus(sessionId: string): Promise<SigningSession>;
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
    list(applicationId: string): Promise<SigningSession[]>;
}

/**
 * SDX upload token returned from the API
 */
interface SDXUploadToken {
    /** JWT token for SDX API access */
    sdxToken: string;
    /** Token expiration in seconds (typically 600 = 10 minutes) */
    expiresIn: number;
    /** Base URL of the SDX service for document operations */
    sdxUrl: string;
}
/**
 * Result of uploading a document to SDX
 *
 * Note: Field names match the SDX service response (documentHandle, expiresAt, blobSize)
 * rather than using different names to avoid confusion.
 */
interface SDXUploadResult {
    /** Unique document handle for retrieval (96 hex characters) */
    documentHandle: string;
    /** ISO 8601 timestamp when document handle expires */
    expiresAt: string;
    /** Size of uploaded blob in bytes */
    blobSize?: number;
    /** True if an identical blob was previously uploaded (deduplication) */
    duplicate?: boolean;
}
/**
 * Document type for SDX uploads
 * Matches SDXTokenRequestDocumentTypeEnum from the generated SDK
 */
type SDXDocumentType = 'kyc' | 'contract' | 'signed_contract';
/**
 * Parameters for getting an SDX upload token
 */
interface SDXTokenParams {
    applicationId: string;
    action: 'upload' | 'download';
    documentType?: SDXDocumentType;
}
/**
 * Parameters for uploading to SDX
 */
interface SDXUploadParams {
    /** The SDX token obtained from getToken() */
    token: SDXUploadToken;
    /** The encrypted document data */
    encryptedDocument: Buffer | ArrayBuffer | Uint8Array;
    /** Document type header */
    documentType?: SDXDocumentType;
    /** Optional idempotency key */
    idempotencyKey?: string;
}
/**
 * Parameters for downloading from SDX
 */
interface SDXDownloadParams {
    /** The SDX token obtained from getToken() with action: 'download' */
    token: SDXUploadToken;
    /** The document handle to download */
    documentHandle: string;
}
/**
 * Parameters for storing a KYC handle
 */
interface StoreKYCHandleParams {
    applicationId: string;
    /** The SDX handle from the upload */
    kycDocumentHandle: string;
    /** Document type (e.g., 'drivers_license', 'passport', 'ssn_card') */
    documentType: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Resource for managing SDX (Secure Document Exchange) operations
 *
 * SDX is used for secure, encrypted document storage and transfer.
 * Documents are encrypted client-side before upload.
 */
declare class SDXResource extends BaseResource {
    private sdxApi;
    constructor(sdxApi: SDXApi, config: ResolvedConfig);
    /**
     * Get an SDX access token for document operations
     *
     * Tokens are short-lived (10 minutes) and should be used immediately.
     *
     * @example
     * ```typescript
     * const token = await passage.sdx.getToken({
     *   applicationId: 'app_123',
     *   action: 'upload',
     *   documentType: 'kyc',
     * });
     *
     * console.log('SDX URL:', token.sdxUrl);
     * console.log('Expires in:', token.expiresIn, 'seconds');
     * ```
     */
    getToken(params: SDXTokenParams): Promise<SDXUploadToken>;
    /**
     * Upload an encrypted document to SDX
     *
     * The document should be encrypted using `encryptDocumentForSDX()` from the crypto module.
     *
     * @example
     * ```typescript
     * import { encryptDocumentForSDX } from '@portola/passage-neobank/crypto';
     * import fs from 'fs';
     *
     * // Read and encrypt the document
     * const document = fs.readFileSync('./drivers_license.pdf');
     * const encryptedDoc = encryptDocumentForSDX(document, lenderPublicKey);
     *
     * // Get upload token
     * const token = await passage.sdx.getToken({
     *   applicationId: 'app_123',
     *   action: 'upload',
     *   documentType: 'kyc',
     * });
     *
     * // Upload encrypted document
     * const result = await passage.sdx.upload({
     *   token,
     *   encryptedDocument: encryptedDoc,
     *   documentType: 'kyc',
     * });
     *
     * console.log('Document handle:', result.documentHandle);
     * ```
     */
    upload(params: SDXUploadParams): Promise<SDXUploadResult>;
    /**
     * Convenience method: Get token and upload in one call
     *
     * @example
     * ```typescript
     * const result = await passage.sdx.uploadDocument({
     *   applicationId: 'app_123',
     *   documentType: 'kyc',
     *   encryptedDocument: encryptedDoc,
     * });
     *
     * console.log('Document handle:', result.documentHandle);
     * ```
     */
    uploadDocument(params: {
        applicationId: string;
        documentType?: SDXDocumentType;
        encryptedDocument: Buffer | ArrayBuffer | Uint8Array;
        idempotencyKey?: string;
    }): Promise<SDXUploadResult>;
    /**
     * Download an encrypted document from SDX
     *
     * @example
     * ```typescript
     * const token = await passage.sdx.getToken({
     *   applicationId: 'app_123',
     *   action: 'download',
     * });
     *
     * const encryptedDoc = await passage.sdx.download({
     *   token,
     *   documentHandle: 'sdx_tok_abc123...',
     * });
     * ```
     */
    download(params: SDXDownloadParams): Promise<Buffer>;
    /**
     * Convenience method: Get token and download in one call
     *
     * @example
     * ```typescript
     * const encryptedDoc = await passage.sdx.downloadDocument({
     *   applicationId: 'app_123',
     *   documentHandle: 'sdx_tok_abc123...',
     * });
     *
     * // Decrypt with your private key
     * const plaintext = decryptDocument(encryptedDoc, privateKey);
     * ```
     */
    downloadDocument(params: {
        applicationId: string;
        documentHandle: string;
    }): Promise<Buffer>;
    /**
     * Store a KYC document handle for an application
     *
     * After uploading a KYC document to SDX, store the handle so it can be
     * associated with the application and accessed by lenders.
     *
     * @example
     * ```typescript
     * // Upload KYC document
     * const uploadResult = await passage.sdx.uploadDocument({
     *   applicationId: 'app_123',
     *   documentType: 'kyc',
     *   encryptedDocument: encryptedDoc,
     * });
     *
     * // Store the handle
     * await passage.sdx.storeKYCHandle({
     *   applicationId: 'app_123',
     *   kycDocumentHandle: uploadResult.documentHandle,
     *   documentType: 'drivers_license',
     * });
     * ```
     */
    storeKYCHandle(params: StoreKYCHandleParams): Promise<{
        applicationId: string;
        kycDocumentHandle: string;
        kycSubmittedAt?: string;
    }>;
}

/**
 * Wallet data returned from the API
 */
interface Wallet {
    id: string;
    address: string;
    chain: Chain;
    type: WalletType$1;
    verified: boolean;
    verifiedByThisNeobank: boolean;
    verifiedAt: string | null;
    verificationMethod: WalletVerificationMethod | null;
    externalId: string | null;
    label: string | null;
    createdAt: string;
}
/**
 * Parameters for creating/registering a wallet
 */
interface CreateWalletParams {
    address: string;
    chain?: Chain;
    type?: WalletType$1;
    externalId?: string;
    label?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Parameters for updating wallet metadata
 */
interface UpdateWalletParams {
    externalId?: string;
    label?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Parameters for listing wallets
 */
interface ListWalletsParams {
    verified?: boolean;
    chain?: Chain;
    externalId?: string;
    address?: string;
    limit?: number;
    offset?: number;
}
/**
 * Verification challenge data
 */
interface VerificationChallenge {
    verificationId: string;
    walletId: string;
    method: WalletVerificationMethod;
    status: WalletVerificationStatus;
    challenge: {
        message: string;
        nonce: string;
        signingStandard: 'personal_sign' | 'eth_signTypedData_v4';
        typedData?: Record<string, unknown>;
    };
    expiresAt: string;
}
/**
 * Verification status data
 */
interface Verification {
    id: string;
    walletId: string;
    method: WalletVerificationMethod;
    status: WalletVerificationStatus;
    expiresAt: string;
    completedAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
}
/**
 * Verification list item
 */
interface VerificationSummary {
    id: string;
    method: WalletVerificationMethod;
    status: WalletVerificationStatus;
    initiatedAt: string;
    completedAt: string | null;
    expiresAt: string;
}
/**
 * Result of submitting verification proof
 */
interface VerificationResult {
    verificationId: string;
    status: WalletVerificationStatus;
    verifiedAt: string | null;
    wallet: {
        id: string;
        verified: boolean;
        verificationMethod: WalletVerificationMethod | null;
    };
}
/**
 * Resource for wallet ownership verification
 *
 * @example
 * ```typescript
 * // Register a wallet
 * const wallet = await passage.wallets.create({
 *   address: '0x1234...',
 *   chain: 'base',
 * });
 *
 * // Initiate verification
 * const challenge = await passage.wallets.initiateVerification(wallet.id, {
 *   method: 'MESSAGE_SIGN',
 * });
 *
 * // User signs the message with their wallet
 * const signature = await userWallet.signMessage(challenge.challenge.message);
 *
 * // Submit the proof
 * const result = await passage.wallets.submitProof(challenge.verificationId, {
 *   signature,
 * });
 *
 * console.log(result.status); // 'VERIFIED'
 * ```
 */
declare class WalletsResource extends BaseResource {
    private api;
    constructor(api: WalletsApi, config: ResolvedConfig);
    /**
     * Create or link a wallet
     *
     * Registers a wallet address for ownership verification.
     * Idempotent - returns existing wallet if address+chain already exists.
     *
     * @example
     * ```typescript
     * const wallet = await passage.wallets.create({
     *   address: '0x1234567890abcdef...',
     *   chain: 'base',
     *   externalId: 'user_123', // Your internal user ID
     *   label: "John's wallet",
     * });
     * ```
     */
    create(params: CreateWalletParams): Promise<Wallet>;
    /**
     * Get a wallet by ID
     *
     * @example
     * ```typescript
     * const wallet = await passage.wallets.get('wal_123');
     * console.log(wallet.verified, wallet.verifiedByThisNeobank);
     * ```
     */
    get(walletId: string): Promise<Wallet>;
    /**
     * List wallets linked to this neobank
     *
     * @example
     * ```typescript
     * // List all verified wallets
     * const { wallets } = await passage.wallets.list({ verified: true });
     *
     * // Find wallets by external ID
     * const { wallets } = await passage.wallets.list({ externalId: 'user_123' });
     * ```
     */
    list(params?: ListWalletsParams): Promise<{
        wallets: Wallet[];
        pagination: {
            total: number;
            limit: number;
            offset: number;
        };
    }>;
    /**
     * Update wallet metadata
     *
     * Updates neobank-specific metadata (externalId, label, metadata).
     *
     * @example
     * ```typescript
     * await passage.wallets.update('wal_123', {
     *   label: 'Primary wallet',
     *   externalId: 'new_user_id',
     * });
     * ```
     */
    update(walletId: string, params: UpdateWalletParams): Promise<Wallet>;
    /**
     * Initiate wallet verification
     *
     * Starts the verification process. For MESSAGE_SIGN, returns a message
     * that the user must sign with their wallet.
     *
     * @example
     * ```typescript
     * const challenge = await passage.wallets.initiateVerification('wal_123', {
     *   method: 'MESSAGE_SIGN',
     * });
     *
     * // Present message to user for signing
     * console.log(challenge.challenge.message);
     * ```
     */
    initiateVerification(walletId: string, params: {
        method: WalletVerificationMethod;
    }): Promise<VerificationChallenge>;
    /**
     * Submit verification proof
     *
     * Submits the signature to complete verification.
     *
     * @example
     * ```typescript
     * // After user signs the challenge message
     * const result = await passage.wallets.submitProof(verificationId, {
     *   signature: '0x...',
     * });
     *
     * if (result.status === 'VERIFIED') {
     *   console.log('Wallet verified!');
     * }
     * ```
     */
    submitProof(verificationId: string, params: {
        signature: string;
    }): Promise<VerificationResult>;
    /**
     * Get verification status
     *
     * @example
     * ```typescript
     * const verification = await passage.wallets.getVerification('ver_123');
     * console.log(verification.status);
     * ```
     */
    getVerification(verificationId: string): Promise<Verification>;
    /**
     * List verifications for a wallet
     *
     * Returns all verification attempts for this wallet by this neobank.
     *
     * @example
     * ```typescript
     * const { verifications } = await passage.wallets.listVerifications('wal_123');
     * ```
     */
    listVerifications(walletId: string): Promise<{
        verifications: VerificationSummary[];
    }>;
    /**
     * Ensure a wallet is registered and check verification status
     *
     * This is a convenience method that:
     * 1. Creates/links the wallet if it doesn't exist
     * 2. Checks if already verified by this neobank
     * 3. Returns verification status and challenge if needed
     *
     * Use this when you want to check if a wallet needs verification
     * before showing the signing UI to the user.
     *
     * @example
     * ```typescript
     * const result = await passage.wallets.ensureVerified({
     *   address: userWalletAddress,
     *   chain: 'base',
     *   externalId: user.id,
     * });
     *
     * if (result.verified) {
     *   // Wallet already verified, proceed with application
     *   console.log('Wallet verified:', result.wallet.id);
     * } else {
     *   // Need user to sign - show signing UI
     *   const signature = await walletClient.signMessage({
     *     message: result.challenge.challenge.message,
     *   });
     *
     *   await passage.wallets.submitProof(result.challenge.verificationId, { signature });
     * }
     * ```
     */
    ensureVerified(params: CreateWalletParams): Promise<{
        verified: true;
        wallet: Wallet;
        challenge: null;
    } | {
        verified: false;
        wallet: Wallet;
        challenge: VerificationChallenge;
    }>;
    /**
     * Register wallet and complete verification with a signature
     *
     * This is a convenience method for server-side verification when you
     * already have the user's signature (e.g., from a frontend signing flow).
     *
     * Combines: create → initiateVerification → submitProof in one call.
     *
     * @example
     * ```typescript
     * // Frontend: User signs message
     * const challenge = await passage.wallets.ensureVerified({ address: '0x...' });
     * if (!challenge.verified) {
     *   const signature = await walletClient.signMessage({
     *     message: challenge.challenge.challenge.message,
     *   });
     *   // Send signature to backend
     * }
     *
     * // Backend: Complete verification
     * const result = await passage.wallets.verifyWithSignature({
     *   address: '0x...',
     *   chain: 'base',
     *   signature: signatureFromFrontend,
     * });
     *
     * console.log(result.wallet.verified); // true
     * ```
     */
    verifyWithSignature(params: CreateWalletParams & {
        signature: string;
    }): Promise<VerificationResult & {
        wallet: Wallet;
    }>;
    /**
     * Map API wallet data to Wallet type
     */
    private mapWallet;
}

/**
 * Main Passage SDK client
 *
 * @example
 * ```typescript
 * import { Passage } from '@portola/passage-neobank';
 *
 * const passage = new Passage({
 *   apiKey: process.env.NEOBANK_API_KEY!,
 *   environment: 'sandbox', // or 'production'
 * });
 *
 * // List applications
 * const { applications } = await passage.applications.list();
 *
 * // Get offers
 * const offers = await passage.offers.getPrequalified(applicationId);
 *
 * // Accept an offer
 * await passage.offers.acceptFinal(offerId, {
 *   borrowerWalletAddress: '0x...',
 * });
 * ```
 */
declare class Passage {
    private readonly config;
    private readonly sdkConfig;
    /** Applications resource - create, list, and manage loan applications */
    readonly applications: ApplicationsResource;
    /** Offers resource - view and accept loan offers */
    readonly offers: OffersResource;
    /** Loans resource - view and manage funded loans */
    readonly loans: LoansResource;
    /** Lenders resource - discover available lenders and their public keys */
    readonly lenders: LendersResource;
    /** Account resource - manage neobank settings (webhooks, etc.) */
    readonly account: AccountResource;
    /** Signing resource - manage document signing sessions */
    readonly signing: SigningResource;
    /** SDX resource - secure document exchange (upload/download encrypted documents) */
    readonly sdx: SDXResource;
    /** Wallets resource - wallet ownership verification */
    readonly wallets: WalletsResource;
    constructor(config: PassageClientConfig);
    /**
     * Get the current configuration (read-only)
     */
    getConfig(): Readonly<ResolvedConfig>;
    /**
     * Check if connected to sandbox environment
     */
    get isSandbox(): boolean;
    /**
     * Check if connected to production environment
     */
    get isProduction(): boolean;
}

export { type AccountInfo, type Application, type ApplicationCreateParams, type ApplicationListParams, type BorrowerWallet, type CommunicationPreferences, type CreateWalletParams, type EncryptedPIIPayload, type FinalOfferAcceptParams, type HardPullConsent, type Lender, type LenderListParams, type LenderOffers, type ListWalletsParams, type Offer, type OfferType, type OffersResponse, type Pagination, type PaginationParams, Passage, type PassageClientConfig, type PaymentScheduleItem, type PrequalAcceptParams, type SDXDocumentType, type SDXDownloadParams, type SDXTokenParams, type SDXUploadParams, type SDXUploadResult, type SDXUploadToken, type SigningSession, type SigningSessionCreateParams, type SigningSessionStatus, type StoreKYCHandleParams, type UpdateWalletParams, type Verification, type VerificationChallenge, type VerificationResult, type VerificationSummary, type Wallet, type WalletType, type WebhookConfig, Passage as default };
