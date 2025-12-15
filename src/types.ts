/**
 * Passage SDK Client Types
 *
 * This module re-exports types from the generated SDK and defines
 * additional types specific to the client wrapper.
 */

// ============================================================================
// Re-export types from generated SDK
// ============================================================================

// Application types
export type {
  ApplicationRequest,
  ApplicationRequestEncryptedPayloadsInner,
  ApplicationRequestProductTypeEnum,
  ApplicationResponse,
  ApplicationResponseData,
  ApplicationResponseDataWalletTypeEnum,
  ApplicationSubmitResponse,
  ApplicationSubmitResponseData,
  ApplicationStatus,
  ApplicationStatusUpdateResponse,
  ApplicationStatusUpdateResponseData,
  ApplicationListItem,
  ListApplications200Response,
  ListApplications200ResponseData,
} from '@portola/passage';

// Offer types
export type {
  EncryptedOffer,
  EncryptedOfferOfferTypeEnum,
  EncryptedOffersResponse,
  EncryptedOffersResponseData,
  EncryptedOffersResponseDataLendersInner,
  OfferAcceptanceRequest,
  OfferAcceptanceRequestBorrowerWallet,
  OfferAcceptanceRequestBorrowerWalletChainEnum,
  OfferAcceptanceRequestBorrowerWalletWalletTypeEnum,
  OfferAcceptanceRequestHardPullConsent,
  OfferAcceptanceRequestCommunicationPreferences,
  OfferAcceptanceResponse,
  OfferAcceptanceResponseData,
} from '@portola/passage';

// Loan types (Loan is re-exported separately to avoid conflicts)
export type {
  LoanStatus,
  LoanResponse,
  PaymentScheduleResponse,
  PaymentScheduleResponseData,
  ScheduledPayment,
} from '@portola/passage';

// Lender types
export type {
  LenderListResponse,
  LenderListResponseData,
  LenderListItem,
  LenderDetailResponse,
  LenderDetailResponseData,
  LenderDetail,
  LenderDetailPublicKey,
  LenderPublicKeyResponse,
  LenderPublicKeyResponseData,
} from '@portola/passage';

// Draft submission types
export type {
  DraftSubmitRequest,
  DraftSubmitRequestPerLenderKycHandlesInner,
  DraftSubmitResponse,
} from '@portola/passage';

// Self-service types
export type {
  NeobankAccountResponse,
  NeobankAccountResponseData,
  WebhookConfigResponse,
  WebhookConfigResponseData,
  WebhookUrlUpdateResponse,
  WebhookUrlUpdateResponseData,
  WebhookTestResponse,
  WebhookTestResponseData,
  WebhookSecretRotateResponse,
  WebhookSecretRotateResponseData,
} from '@portola/passage';

// ============================================================================
// Pagination (SDK client specific)
// ============================================================================

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ============================================================================
// SDK Client Convenience Aliases
// ============================================================================

/**
 * Alias for ApplicationRequestEncryptedPayloadsInner
 * Use this when creating encrypted payloads for application submission
 */
export type EncryptedPIIPayload =
  import('@portola/passage').ApplicationRequestEncryptedPayloadsInner;

/**
 * Alias for ApplicationRequestProductTypeEnum
 */
export type ProductType =
  import('@portola/passage').ApplicationRequestProductTypeEnum;

/**
 * Alias for ApplicationResponseDataWalletTypeEnum
 * Indicates the custody model for the borrower's wallet
 */
export type WalletType =
  import('@portola/passage').ApplicationResponseDataWalletTypeEnum;

/**
 * Alias for EncryptedOfferOfferTypeEnum
 * Indicates the type of offer (prequalified or final)
 */
export type OfferType =
  import('@portola/passage').EncryptedOfferOfferTypeEnum;

/**
 * Alias for OfferAcceptanceRequestBorrowerWallet
 */
export type BorrowerWallet =
  import('@portola/passage').OfferAcceptanceRequestBorrowerWallet;

/**
 * Alias for OfferAcceptanceRequestHardPullConsent
 */
export type HardPullConsent =
  import('@portola/passage').OfferAcceptanceRequestHardPullConsent;

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
  productType?: import('@portola/passage').ApplicationRequestProductTypeEnum;
  /** Filter by your external reference ID (exact match) */
  externalId?: string;
  /** Filter by borrower's wallet address (case-insensitive) */
  borrowerWalletAddress?: string;
}

/**
 * Parameters for creating a new application
 */
export interface ApplicationCreateParams {
  productType: import('@portola/passage').ApplicationRequestProductTypeEnum;
  encryptedPayloads: EncryptedPIIPayload[];
  /** Your external reference ID (e.g., user ID in your system) */
  externalId?: string;
  metadata?: Record<string, unknown>;
  draft?: boolean;
  /** Borrower's wallet address for disbursement (optional - for wallet-first apps) */
  borrowerWalletAddress?: string;
  /** Blockchain chain for borrower's wallet (default: 'base') */
  borrowerWalletChain?: 'base' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'solana';
}

/**
 * Parameters for accepting a prequalified offer
 */
export interface PrequalAcceptParams {
  hardPullConsent: HardPullConsent;
  communicationPreferences?: CommunicationPreferences;
}

/**
 * Parameters for accepting a final offer
 */
export interface FinalOfferAcceptParams {
  hardPullConsent: HardPullConsent;
  borrowerWallet?: BorrowerWallet;
  communicationPreferences?: CommunicationPreferences;
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
 * Single offer from a lender
 */
export type Offer = import('@portola/passage').EncryptedOffer;

/**
 * Lender with offers grouped
 */
export type LenderOffers =
  import('@portola/passage').EncryptedOffersResponseDataLendersInner;

// Note: Loan type is re-exported from index.ts to avoid duplicate exports

/**
 * Account info (unwrapped)
 */
export type AccountInfo =
  import('@portola/passage').NeobankAccountResponseData;

/**
 * Webhook config (unwrapped)
 */
export type WebhookConfig =
  import('@portola/passage').WebhookConfigResponseData;

/**
 * Lender info from discovery list
 */
export type Lender = import('@portola/passage').LenderListItem;

/**
 * Account statistics response
 */
export interface NeobankStats {
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
export interface Repayment {
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

// ============================================================================
// Encryption/Decryption Types - Re-exported from crypto module
// ============================================================================

export type {
  HybridEncryptedPayload,
  EncryptedPIIPayload as CryptoEncryptedPIIPayload,
  DecryptedOfferDetails,
  DecryptionResult,
} from './crypto/types';
