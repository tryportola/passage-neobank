/**
 * Consolidated Type Exports
 *
 * This barrel file provides a single import point for all types in the SDK.
 * Types are organized by domain for easier discovery.
 *
 * @example
 * ```typescript
 * import type {
 *   Application,
 *   Loan,
 *   Wallet,
 *   SigningSession,
 * } from '@portola/passage-neobank/types';
 * ```
 */

// ============================================================================
// Core Types (from types.ts)
// ============================================================================

export type {
  // Pagination
  Pagination,
  PaginationParams,

  // Applications
  Application,
  ApplicationListParams,
  ApplicationCreateParams,
  ApplicationStatus,
  ProductType,
  ApplicationListItemType,

  // Offers
  Offer,
  OfferType,
  LenderOffers,
  OffersResponse,
  PrequalAcceptParams,
  FinalOfferAcceptParams,
  OfferAcceptanceResponseData,
  FinalOfferAcceptanceResponseData,

  // Loans
  LoanStatus,
  PaymentScheduleItem,

  // Lenders
  Lender,
  LenderListParams,
  LenderPublicKeyResponse,

  // Account
  AccountInfo,
  WebhookConfig,

  // Repayments
  Repayment,

  // Encryption
  HybridEncryptedPayload,
  DecryptedOfferDetails,
  DecryptionResult,

  // Convenience aliases
  EncryptedPIIPayload,
  HardPullConsent,
  BorrowerWallet,
  CommunicationPreferences,
  WalletType,
} from '../types';

// ============================================================================
// Wallet Types (from resources/wallets.ts)
// ============================================================================

export type {
  Wallet,
  CreateWalletParams,
  UpdateWalletParams,
  ListWalletsParams,
  MessageSignChallenge,
  AOPPChallenge,
  VerificationChallenge,
  Verification,
  VerificationSummary,
  VerificationResult,
  WalletVerificationMethod,
  WalletVerificationStatus,
  Chain,
  WalletChain,
} from '../resources/wallets';

export {
  isAOPPChallenge,
  isMessageSignChallenge,
} from '../resources/wallets';

// ============================================================================
// Signing Types (from resources/signing.ts)
// ============================================================================

export type {
  SigningSession,
  SigningSessionStatus,
  SigningSessionCreateParams,
} from '../resources/signing';

// ============================================================================
// SDX Types (from resources/sdx.ts)
// ============================================================================

export type {
  SDXUploadToken,
  SDXUploadResult,
  SDXDocumentType,
  SDXTokenParams,
  SDXUploadParams,
  SDXDownloadParams,
  StoreKYCHandleParams,
} from '../resources/sdx';

// ============================================================================
// Re-exported SDK Types
// ============================================================================

export type {
  // Loan (avoid duplicate with local Loan type)
  Loan,
  // Account stats
  AccountStatsData,
  // KYC types
  KYCProvidersResponse,
  KYCProvidersData,
  KYCProvider,
  KYCStatusResponse,
  KYCStatusData,
  KYCStatus,
  KYCStatusAttestation,
  KYCInitiateResponse,
  KYCInitiateData,
  KYCHandleRequest,
  KYCHandleResponse,
  KYCHandleData,
} from '@portola/passage';
