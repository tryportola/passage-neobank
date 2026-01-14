import * as _portola_passage from '@portola/passage';
import { HardPullConsent, BorrowerWallet, SigningApi, SDXApi, WalletsApi, WalletChain, WalletType as WalletType$1, Chain, WalletVerificationMethod, WalletVerificationStatus } from '@portola/passage';
import './types-CMifTZXy.mjs';

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

interface PaginationParams {
    limit?: number;
    offset?: number;
}
/**
 * Alias for EncryptedPayload
 * Use this when creating encrypted payloads for application submission
 */
type EncryptedPIIPayload = _portola_passage.EncryptedPayload;
/**
 * Wallet custody model for loan disbursement (used in application creation).
 *
 * Indicates whether the borrower's wallet is custodial or non-custodial,
 * which affects how loan funds are disbursed.
 *
 * Values: `'CUSTODIAL'` | `'NON_CUSTODIAL'`
 *
 * **Note:** This is different from `WalletOwnershipType`, which is used in the
 * Wallet Verification system to indicate individual vs entity ownership.
 *
 * @example
 * ```typescript
 * // In application creation (legacy pattern)
 * const app = await passage.applications.create({
 *   productType: 'personal',
 *   borrowerWalletAddress: '0x...',
 *   // walletType defaults based on context
 * });
 * ```
 *
 * @see WalletOwnershipType - For wallet verification ownership type (different concept)
 */
type WalletType = _portola_passage.WalletType;
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
    productType?: _portola_passage.ProductType;
    /** Filter by your external reference ID (exact match) */
    externalId?: string;
    /** Filter by borrower's wallet address (case-insensitive) */
    borrowerWalletAddress?: string;
}
/**
 * Parameters for creating a new application
 */
interface ApplicationCreateParams {
    productType: _portola_passage.ProductType;
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
 *
 * This triggers the lender to perform a hard credit pull.
 * Optionally, you can also provide borrower wallet info and
 * communication preferences at this stage.
 */
interface PrequalAcceptParams {
    /** Required consent for credit check */
    hardPullConsent: HardPullConsent;
    /** Borrower communication preferences */
    communicationPreferences?: CommunicationPreferences;
    /**
     * Borrower wallet for USDC disbursement
     * If not provided here, must be set when creating the application
     */
    borrowerWallet?: BorrowerWallet;
    /** Borrower email for signing session (can also be provided at final acceptance) */
    borrowerEmail?: string;
    /** Borrower name for signing session (can also be provided at final acceptance) */
    borrowerName?: string;
    /** Requested disbursement details */
    requestedDisbursement?: {
        amount?: number;
        method?: 'ach' | 'wire' | 'stablecoin';
        destination?: string;
    };
}
/**
 * Parameters for accepting a final offer
 */
interface FinalOfferAcceptParams {
    /** Borrower email for signing session */
    borrowerEmail?: string;
    /** Borrower name for signing session */
    borrowerName?: string;
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
 * Application list item (lighter weight than full Application)
 */
type ApplicationListItemType = _portola_passage.ApplicationListItem;
/**
 * Offers response data (unwrapped from envelope)
 */
type OffersResponse = _portola_passage.EncryptedOffersResponseData;
/**
 * Single offer from a lender (response type with full offer details)
 *
 * Note: EncryptedOfferResponse is the response type with offerId, status, etc.
 * EncryptedOffer is the request type used when lenders submit offers.
 */
type Offer = _portola_passage.EncryptedOfferResponse;
/**
 * Lender with offers grouped
 */
type LenderOffers = _portola_passage.EncryptedOffersLenderGroup;
/**
 * Account info (unwrapped)
 */
type AccountInfo = _portola_passage.NeobankAccountData;
/**
 * Webhook config (unwrapped)
 */
type WebhookConfig = _portola_passage.WebhookConfigData;
/**
 * Lender info from discovery list
 */
type Lender = _portola_passage.LenderListItem;
/**
 * Repayment data from a loan
 *
 * Matches the controller output from loanController.listLoanRepayments
 */
interface Repayment {
    id: string;
    loanId: string;
    bridgeDrainId: string;
    amount: string;
    currency: string;
    sourceAddress: string | null;
    sourceChain: string | null;
    depositTxHash: string | null;
    destinationTxHash: string | null;
    principalPortion: string | null;
    interestPortion: string | null;
    balanceBefore: string | null;
    balanceAfter: string | null;
    receivedAt: string;
    completedAt: string | null;
    status: string;
    createdAt: string;
    /** @deprecated Use `sourceAddress` instead */
    fromAddress?: string | null;
    /** @deprecated Use `status` instead */
    state?: string;
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
 * Signing session data returned from the API
 */
interface SigningSession {
    sessionId: string;
    applicationId: string;
    lenderId?: string;
    status: SigningSessionStatus;
    signingUrl?: string;
    initiatedAt?: string;
    expiresAt?: string;
    borrowerEmail?: string;
    borrowerName?: string;
    completedAt?: string | null;
    documentHandle?: string | null;
}
/**
 * Signing session status enum
 * References SDK type which matches Prisma SigningStatus and OpenAPI status enum
 */
type SigningSessionStatus = _portola_passage.SigningSessionStatus;
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
    /** Blockchain chain for the wallet (e.g., 'base', 'ethereum', 'polygon') */
    chain?: WalletChain;
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
 * MESSAGE_SIGN challenge structure
 */
interface MessageSignChallenge {
    message: string;
    nonce: string;
    signingStandard: 'personal_sign' | 'eth_signTypedData_v4';
    typedData?: Record<string, unknown>;
}
/**
 * AOPP challenge structure
 */
interface AOPPChallenge {
    callback: string;
    message: string;
    asset: string;
    format?: string;
    aoppUri: string;
}
/**
 * Verification challenge data
 */
interface VerificationChallenge {
    verificationId: string;
    walletId: string;
    method: WalletVerificationMethod;
    status: WalletVerificationStatus;
    challenge: MessageSignChallenge | AOPPChallenge;
    expiresAt: string;
}
/**
 * Type guard to check if challenge is AOPP
 */
declare function isAOPPChallenge(challenge: MessageSignChallenge | AOPPChallenge): challenge is AOPPChallenge;
/**
 * Type guard to check if challenge is MESSAGE_SIGN
 */
declare function isMessageSignChallenge(challenge: MessageSignChallenge | AOPPChallenge): challenge is MessageSignChallenge;
/**
 * Verification status data
 */
interface Verification {
    id: string;
    walletId: string;
    method: WalletVerificationMethod;
    status: WalletVerificationStatus;
    expiresAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    failureReason: string | null;
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
     * Register wallet and complete verification in a single atomic operation
     *
     * This method creates a NEW challenge internally and verifies the signature
     * against that challenge. It is designed for server-controlled signing
     * scenarios (custodial wallets, automated systems) where you can sign the
     * challenge message in the same execution context.
     *
     * **WARNING:** Do NOT use this after calling `ensureVerified()` or
     * `initiateVerification()`. Each call creates a new challenge with a unique
     * nonce, so signatures from previous challenges will fail verification.
     *
     * For browser-based user wallet verification, use the two-step flow:
     * 1. Call `ensureVerified()` to get the challenge
     * 2. User signs the challenge message in their wallet
     * 3. Call `submitProof(challenge.verificationId, { signature })`
     *
     * @example
     * ```typescript
     * // For custodial/server-controlled wallets only
     * const result = await passage.wallets.verifyWithSignature({
     *   address: custodialWalletAddress,
     *   chain: 'base',
     *   signature: await custodialSigner.signMessage(challengeMessage),
     * });
     *
     * console.log(result.wallet.verified); // true
     * ```
     *
     * @example
     * ```typescript
     * // For browser-based user wallets, use ensureVerified + submitProof instead:
     * const result = await passage.wallets.ensureVerified({ address: '0x...' });
     * if (!result.verified) {
     *   const signature = await userWallet.signMessage(result.challenge.challenge.message);
     *   await passage.wallets.submitProof(result.challenge.verificationId, { signature });
     * }
     * ```
     */
    verifyWithSignature(params: CreateWalletParams & {
        signature: string;
    }): Promise<VerificationResult & {
        wallet: Wallet;
    }>;
    /**
     * Initiate AOPP verification
     *
     * Returns a challenge with an aoppUri that can be displayed as a QR code.
     * The user scans this with an AOPP-compatible wallet (Ledger Live, BitBox),
     * and the wallet POSTs the signature directly to our callback URL.
     *
     * After displaying the QR code, poll with `waitForAOPPVerification()` to
     * detect when the user completes verification.
     *
     * @example
     * ```typescript
     * import { isAOPPChallenge } from '@portola/passage-neobank';
     *
     * const challenge = await passage.wallets.initiateAOPPVerification('wal_123');
     *
     * if (isAOPPChallenge(challenge.challenge)) {
     *   // Display QR code with challenge.challenge.aoppUri
     *   showQRCode(challenge.challenge.aoppUri);
     *
     *   // Poll for completion (user signs in their wallet app)
     *   const result = await passage.wallets.waitForAOPPVerification(
     *     challenge.verificationId,
     *     { timeout: 600000 } // 10 minutes
     *   );
     *
     *   if (result.status === 'VERIFIED') {
     *     console.log('Wallet verified via AOPP!');
     *   }
     * }
     * ```
     */
    initiateAOPPVerification(walletId: string): Promise<VerificationChallenge>;
    /**
     * Poll for AOPP verification completion
     *
     * Since AOPP callbacks go directly to the server (not through the frontend),
     * this method polls the verification status until it completes, fails, or times out.
     *
     * @param verificationId - The verification ID from initiateAOPPVerification
     * @param options - Polling options
     * @param options.timeout - Max time to wait in ms (default: 600000 = 10 minutes)
     * @param options.interval - Poll interval in ms (default: 2000 = 2 seconds)
     * @param options.onPoll - Optional callback on each poll (for showing countdown)
     *
     * @example
     * ```typescript
     * const result = await passage.wallets.waitForAOPPVerification(verificationId, {
     *   timeout: 600000, // 10 minutes
     *   interval: 2000,  // Check every 2 seconds
     *   onPoll: (verification) => {
     *     console.log(`Status: ${verification.status}, expires: ${verification.expiresAt}`);
     *   },
     * });
     * ```
     */
    waitForAOPPVerification(verificationId: string, options?: {
        timeout?: number;
        interval?: number;
        onPoll?: (verification: Verification) => void;
    }): Promise<Verification>;
    /**
     * Map API wallet data to Wallet type
     */
    private mapWallet;
}

export { type ApplicationListParams as A, BaseResource as B, type CommunicationPreferences as C, type ListWalletsParams as D, type EncryptedPIIPayload as E, type FinalOfferAcceptParams as F, type AOPPChallenge as G, type Verification as H, type VerificationSummary as I, type VerificationResult as J, isAOPPChallenge as K, type LoanListParams as L, type MessageSignChallenge as M, isMessageSignChallenge as N, type OffersResponse as O, type PrequalAcceptParams as P, type ApplicationListItemType as Q, type ResolvedConfig as R, SigningResource as S, type UpdateWalletParams as U, type VerificationChallenge as V, type WebhookConfig as W, type Application as a, type ApplicationCreateParams as b, type Repayment as c, type PaymentScheduleItem as d, type LenderListParams as e, type Lender as f, type AccountInfo as g, SDXResource as h, WalletsResource as i, type PassageClientConfig as j, type PaginationParams as k, type WalletType as l, type Offer as m, type LenderOffers as n, type SDXUploadToken as o, type SDXUploadResult as p, type SDXDocumentType as q, type SDXTokenParams as r, type SDXUploadParams as s, type SDXDownloadParams as t, type StoreKYCHandleParams as u, type SigningSession as v, type SigningSessionStatus as w, type SigningSessionCreateParams as x, type Wallet as y, type CreateWalletParams as z };
