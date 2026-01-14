/**
 * Passage SDK Client Types
 *
 * This module re-exports types from the generated SDK and defines
 * additional types specific to the client wrapper.
 */

// Import types used internally in this module
import type {
  BorrowerWallet as BorrowerWalletType,
  HardPullConsent as HardPullConsentType,
} from '@portola/passage';

// ============================================================================
// Re-export types from generated SDK
// ============================================================================

// Application types
export type {
  ApplicationRequest,
  EncryptedPayload,
  ProductType,
  ApplicationResponse,
  ApplicationResponseData,
  ApplicationSubmitResponse,
  ApplicationSubmitResponseData,
  ApplicationStatus,
  ApplicationStatusUpdateResponse,
  ApplicationStatusUpdateResponseData,
  ApplicationListItem,
  ApplicationListResponse,
  ApplicationListResponseData,
} from '@portola/passage';

// Offer types
export type {
  EncryptedOffer,
  OfferType,
  EncryptedOffersResponse,
  EncryptedOffersResponseData,
  EncryptedOffersLenderGroup,
  OfferAcceptanceRequest,
  BorrowerWallet,
  BorrowerWalletWalletTypeEnum,
  HardPullConsent,
  OfferAcceptanceRequestCommunicationPreferences,
  OfferAcceptanceResponse,
  OfferAcceptanceResponseData,
  FinalOfferAcceptanceResponse,
  FinalOfferAcceptanceResponseData,
  SupportedChain,
} from '@portola/passage';

// Loan types (Loan is re-exported separately to avoid conflicts)
export type {
  LoanStatus,
  LoanResponse,
  PaymentScheduleResponse,
  ScheduledPayment,
} from '@portola/passage';

// Lender types
export type {
  LenderListResponse,
  LenderListData,
  LenderListItem,
  LenderDetailResponse,
  LenderDetailData,
  LenderDetail,
  LenderPublicKeyResponse,
  LenderPublicKeyData,
} from '@portola/passage';

// Draft submission types
export type {
  DraftSubmitRequest,
  DraftSubmitResponse,
} from '@portola/passage';

// Self-service types
export type {
  NeobankAccountResponse,
  NeobankAccountData,
  WebhookConfigResponse,
  WebhookConfigData,
  WebhookUrlUpdateResponse,
  WebhookUrlUpdateData,
  WebhookTestResponse,
  WebhookTestData,
  WebhookSecretRotateResponse,
  WebhookSecretRotateData,
} from '@portola/passage';

// ============================================================================
// Pagination
// ============================================================================

// Re-export Pagination from SDK (response type)
export type { Pagination } from '@portola/passage';

// Client-specific input params (not in SDK)
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ============================================================================
// SDK Client Convenience Aliases
// ============================================================================

/**
 * Alias for EncryptedPayload
 * Use this when creating encrypted payloads for application submission
 */
export type EncryptedPIIPayload =
  import('@portola/passage').EncryptedPayload;

/**
 * Alias for ProductType enum
 * @deprecated Import ProductType directly from this module instead
 */
export type ProductTypeAlias =
  import('@portola/passage').ProductType;

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
export type WalletType =
  import('@portola/passage').WalletType;

/**
 * Alias for offer type enum
 * Indicates the type of offer (prequalified or final)
 * @deprecated Import OfferType directly from this module instead
 */
export type OfferTypeAlias =
  import('@portola/passage').OfferType;

// BorrowerWallet and HardPullConsent are now exported directly from @portola/passage above

/**
 * Alias for OfferAcceptanceRequestCommunicationPreferences
 */
export type CommunicationPreferences =
  import('@portola/passage').OfferAcceptanceRequestCommunicationPreferences;

/**
 * Alias for ScheduledPayment
 */
export type PaymentScheduleItem =
  import('@portola/passage').ScheduledPayment;

// ============================================================================
// SDK Client Input Parameter Types
// ============================================================================

/**
 * Parameters for listing applications
 */
export interface ApplicationListParams extends PaginationParams {
  status?: import('@portola/passage').ApplicationStatus;
  productType?: import('@portola/passage').ProductType;
  /** Filter by your external reference ID (exact match) */
  externalId?: string;
  /** Filter by borrower's wallet address (case-insensitive) */
  borrowerWalletAddress?: string;
}

/**
 * Parameters for creating a new application
 */
export interface ApplicationCreateParams {
  productType: import('@portola/passage').ProductType;
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
export interface PrequalAcceptParams {
  /** Required consent for credit check */
  hardPullConsent: HardPullConsentType;
  /** Borrower communication preferences */
  communicationPreferences?: CommunicationPreferences;
  /**
   * Borrower wallet for USDC disbursement
   * If not provided here, must be set when creating the application
   */
  borrowerWallet?: BorrowerWalletType;
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
export interface FinalOfferAcceptParams {
  /** Borrower email for signing session */
  borrowerEmail?: string;
  /** Borrower name for signing session */
  borrowerName?: string;
}

/**
 * Parameters for listing lenders
 */
export interface LenderListParams {
  productType?: string;
  stateCode?: string;
}

/**
 * Parameters for listing loans
 */
export interface LoanListParams extends PaginationParams {
  /** Filter by loan status */
  status?: 'active' | 'paid_off' | 'delinquent' | 'defaulted' | 'closed' | 'all';
  /** Filter by application's external reference ID (joins through application) */
  externalId?: string;
  /** Filter by borrower's wallet address (case-insensitive) */
  borrowerAddress?: string;
}

// ============================================================================
// SDK Client Response Types (unwrapped)
// ============================================================================

/**
 * Application data returned from the API (unwrapped from envelope)
 */
export type Application =
  import('@portola/passage').ApplicationResponseData;

/**
 * Application list item (lighter weight than full Application)
 */
export type ApplicationListItemType =
  import('@portola/passage').ApplicationListItem;

/**
 * Offers response data (unwrapped from envelope)
 */
export type OffersResponse =
  import('@portola/passage').EncryptedOffersResponseData;

/**
 * Single offer from a lender (response type with full offer details)
 *
 * Note: EncryptedOfferResponse is the response type with offerId, status, etc.
 * EncryptedOffer is the request type used when lenders submit offers.
 */
export type Offer = import('@portola/passage').EncryptedOfferResponse;

/**
 * Lender with offers grouped
 */
export type LenderOffers =
  import('@portola/passage').EncryptedOffersLenderGroup;

// Note: OfferAcceptanceResponseData is exported directly from @portola/passage above

// Note: Loan type is re-exported from index.ts to avoid duplicate exports

/**
 * Account info (unwrapped)
 */
export type AccountInfo =
  import('@portola/passage').NeobankAccountData;

/**
 * Webhook config (unwrapped)
 */
export type WebhookConfig =
  import('@portola/passage').WebhookConfigData;

/**
 * Lender info from discovery list
 */
export type Lender = import('@portola/passage').LenderListItem;

/**
 * Repayment data from a loan
 *
 * Matches the controller output from loanController.listLoanRepayments
 */
export interface Repayment {
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
  // Deprecated aliases for backward compatibility (will be removed in next major version)
  /** @deprecated Use `sourceAddress` instead */
  fromAddress?: string | null;
  /** @deprecated Use `status` instead */
  state?: string;
}

// ============================================================================
// Encryption/Decryption Types - Re-exported from crypto module
// ============================================================================

export type {
  HybridEncryptedPayload,
  EncryptedPIIPayload as CryptoEncryptedPIIPayload,
  DecryptedOfferDetails,
  DecryptionResult,
} from './crypto/types';
