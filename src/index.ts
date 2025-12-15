/**
 * Passage SDK Client
 *
 * Official TypeScript SDK for integrating with the Passage loan platform.
 *
 * @packageDocumentation
 * @module @portola/passage-neobank
 *
 * @example Basic Usage
 * ```typescript
 * import { Passage } from '@portola/passage-neobank';
 *
 * const passage = new Passage({
 *   apiKey: process.env.NEOBANK_API_KEY!,
 *   environment: 'sandbox',
 * });
 *
 * // List applications
 * const { applications } = await passage.applications.list();
 *
 * // Create an application
 * const app = await passage.applications.create({
 *   productType: 'personal',
 *   encryptedPayloads,
 * });
 * ```
 *
 * @example With Encryption
 * ```typescript
 * import { Passage } from '@portola/passage-neobank';
 * import { encryptPIIForLenders, decryptOfferDetails } from '@portola/passage-neobank/crypto';
 *
 * const passage = new Passage({ apiKey: process.env.NEOBANK_API_KEY! });
 *
 * // Get lenders and encrypt PII
 * const lenders = await passage.lenders.list({ productType: 'personal', stateCode: 'CA' });
 * const encryptedPayloads = encryptPIIForLenders(
 *   lenders.map(l => ({ lenderId: l.lenderId, publicKey: l.publicKey })),
 *   borrowerPII
 * );
 *
 * // Create application and get offers
 * const app = await passage.applications.create({ productType: 'personal', encryptedPayloads });
 * const offers = await passage.offers.getPrequalified(app.id);
 *
 * // Decrypt offer details
 * for (const lenderGroup of offers.lenders) {
 *   for (const offer of lenderGroup.offers) {
 *     const { data, verified } = decryptOfferDetails(
 *       offer.encryptedOfferDetailsNeobank,
 *       offer.checksumSha256,
 *       process.env.NEOBANK_PRIVATE_KEY!
 *     );
 *     if (verified) {
 *       console.log(`APR: ${data.apr}`);
 *     }
 *   }
 * }
 * ```
 */

// Main client
export { Passage, Passage as default } from './client';

// Configuration
export type { PassageClientConfig } from './config';

// Errors
export {
  PassageError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
  NetworkError,
  TimeoutError,
} from './errors';

// Types
export type {
  // Pagination
  Pagination,
  PaginationParams,

  // Applications
  Application,
  ApplicationListParams,
  ApplicationCreateParams,

  // Re-export SDK types for consumers
  ApplicationStatus,
  ApplicationRequestProductTypeEnum as ProductType,
  ApplicationRequestEncryptedPayloadsInner as EncryptedPayloadInput,
  ApplicationStatusUpdateResponseData,
  WalletType,

  // Offers
  Offer,
  OfferType,
  LenderOffers,
  OffersResponse,
  PrequalAcceptParams,
  FinalOfferAcceptParams,
  OfferAcceptanceResponseData,

  // Loans
  LoanStatus,
  PaymentScheduleItem,

  // Lenders
  Lender,
  LenderListParams,
  LenderDetail,
  LenderDetailPublicKey,
  LenderPublicKeyResponse,
  LenderPublicKeyResponseData,

  // Account
  AccountInfo,
  WebhookConfig,
  WebhookTestResponseData,
  WebhookSecretRotateResponseData,

  // Encryption (re-exported from crypto/types.ts)
  HybridEncryptedPayload,
  DecryptedOfferDetails,
  DecryptionResult,

  // Convenience aliases
  HardPullConsent,
  BorrowerWallet,
  CommunicationPreferences,
  EncryptedPIIPayload,
} from './types';

// SDX types (defined in resources/sdx.ts)
export type {
  SDXUploadToken,
  SDXUploadResult,
  SDXDocumentType,
  SDXTokenParams,
  SDXUploadParams,
  SDXDownloadParams,
  StoreKYCHandleParams,
} from './resources/sdx';

// Signing types (defined in resources/signing.ts)
export type {
  SigningSession,
  SigningSessionStatus,
  SigningSessionCreateParams,
} from './resources/signing';

// Re-export Loan type directly from SDK to avoid duplicate issues
export type { Loan } from '@portola/passage';

// Re-export KYC types for neobank consumers (neobank-facing endpoints)
export type {
  KYCProvidersResponse,
  KYCProvidersResponseData,
  KYCProvidersResponseDataProvidersInner,
  KYCStatusResponse,
  KYCStatusResponseData,
  KYCStatusResponseDataStatusEnum,
  KYCStatusResponseDataAttestationsInner,
  KYCInitiateResponse,
  KYCInitiateResponseData,
  KYCHandleRequest,
  KYCHandleResponse,
  KYCHandleResponseData,
} from '@portola/passage';
