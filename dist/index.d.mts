import { B as BaseResource, R as ResolvedConfig, A as ApplicationListParams, a as Application, b as ApplicationCreateParams, O as OffersResponse, P as PrequalAcceptParams, F as FinalOfferAcceptParams, L as LoanListParams, c as Repayment, d as PaymentScheduleItem, e as LenderListParams, f as Lender, g as AccountInfo, W as WebhookConfig, S as SigningResource, h as SDXResource, i as WalletsResource, j as PassageClientConfig } from './index-_tP0S-uK.mjs';
export { I as AOPPChallenge, o as BorrowerWallet, C as CommunicationPreferences, D as CreateWalletParams, E as EncryptedPIIPayload, H as HardPullConsent, n as LenderOffers, G as ListWalletsParams, M as MessageSignChallenge, m as Offer, k as PaginationParams, r as SDXDocumentType, u as SDXDownloadParams, s as SDXTokenParams, t as SDXUploadParams, q as SDXUploadResult, p as SDXUploadToken, w as SigningSession, y as SigningSessionCreateParams, x as SigningSessionStatus, v as StoreKYCHandleParams, U as UpdateWalletParams, J as Verification, V as VerificationChallenge, N as VerificationResult, K as VerificationSummary, z as Wallet, l as WalletType, Q as isAOPPChallenge, T as isMessageSignChallenge } from './index-_tP0S-uK.mjs';
import * as _portola_passage from '@portola/passage';
import { ApplicationsApi, ApplicationListItem, Pagination, ApplicationSubmitResponseData, ApplicationStatus, ApplicationStatusUpdateResponseData, OffersApi, OfferAcceptanceResponseData, FinalOfferAcceptanceResponseData, LoansApi, Loan, RepaymentStatus, EntityDiscoveryApi, NeobankSelfServiceApi, AccountStatsData, WebhookTestData, WebhookSecretRotateData } from '@portola/passage';
export { AccountStatsData, ApplicationStatus, Chain, EncryptedPayload as EncryptedPayloadInput, FinalOfferAcceptanceResponseData, KYCHandleData, KYCHandleRequest, KYCHandleResponse, KYCInitiateData, KYCInitiateResponse, KYCProvider, KYCProvidersData, KYCProvidersResponse, KYCStatus, KYCStatusAttestation, KYCStatusData, KYCStatusResponse, LenderPublicKeyResponse, Loan, LoanStatus, OfferAcceptanceResponseData, OfferType, Pagination, ProductType, WalletChain, WalletType as WalletOwnershipType, WalletVerificationMethod, WalletVerificationStatus } from '@portola/passage';
export { A as AuthenticationError, a as AuthorizationError, C as ConflictError, b as NetworkError, N as NotFoundError, P as PassageError, R as RateLimitError, T as TimeoutError, V as ValidationError } from './errors-DgbLNkc1.mjs';
export { a as DecryptedOfferDetails, D as DecryptionResult, H as HybridEncryptedPayload } from './types-CMifTZXy.mjs';

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
    }): Promise<ApplicationSubmitResponseData>;
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
    /**
     * Get the loan associated with an application
     *
     * Returns the loan that was created when this application was funded.
     * Returns null if the application hasn't been funded yet.
     *
     * @example
     * ```typescript
     * // Check if application has a loan
     * const loan = await passage.applications.getLoan('app_123');
     * if (loan) {
     *   console.log(`Loan ${loan.id} - Principal: $${loan.principal}`);
     * } else {
     *   console.log('Application not yet funded');
     * }
     * ```
     */
    getLoan(applicationId: string): Promise<_portola_passage.Loan | null>;
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
     * Requires hard pull consent from the borrower. This triggers the lender
     * to perform a hard credit pull and submit final offers.
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
     *   // Optional: provide wallet for disbursement if not set at application creation
     *   borrowerWallet: {
     *     address: '0x1234...',
     *     chain: 'base',
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
     * Returns signing session details including the URL to redirect the borrower.
     *
     * Note: hardPullConsent and borrowerWallet should have been provided when
     * accepting the prequalified offer via acceptPrequal().
     *
     * @example
     * ```typescript
     * const result = await passage.offers.acceptFinal(offerId, {
     *   borrowerEmail: 'borrower@example.com',
     *   borrowerName: 'John Doe',
     * });
     *
     * // Redirect borrower to sign documents
     * if (result.signingUrl) {
     *   console.log('Sign at:', result.signingUrl);
     * }
     * ```
     */
    acceptFinal(offerId: string, params?: FinalOfferAcceptParams): Promise<FinalOfferAcceptanceResponseData>;
}

/**
 * Resource for managing loans
 *
 * Supports listing loans (with filters), getting loan details, and viewing repayments.
 */
declare class LoansResource extends BaseResource {
    private api;
    private applicationsApi;
    constructor(api: LoansApi, applicationsApi: ApplicationsApi, config: ResolvedConfig);
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
     * Convenience method for neobanks to look up a loan using the application ID.
     * Returns null if the application hasn't been funded yet (no loan exists).
     *
     * @example
     * ```typescript
     * // Get loan for an application
     * const loan = await passage.loans.getByApplication('app_123');
     * if (loan) {
     *   console.log(`Loan status: ${loan.status}`);
     * }
     * ```
     *
     * @see applications.getLoan() - Equivalent method on the applications resource
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
    getStats(): Promise<AccountStatsData>;
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
    testWebhook(): Promise<WebhookTestData>;
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
    rotateWebhookSecret(): Promise<WebhookSecretRotateData>;
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

export { AccountInfo, Application, ApplicationCreateParams, ApplicationListParams, FinalOfferAcceptParams, Lender, LenderListParams, OffersResponse, Passage, PassageClientConfig, PaymentScheduleItem, PrequalAcceptParams, Repayment, WebhookConfig, Passage as default };
