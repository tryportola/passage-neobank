/**
 * Webhook event types
 *
 * These types match the actual events sent by the Passage API.
 * @see packages/shared/src/validators/webhook-payloads.ts for source of truth
 */
export type WebhookEventType =
  // Application events
  | 'application.created'
  | 'application.routed'
  | 'application.approved'
  | 'application.rejected'
  | 'application.declined'
  // Offer events
  | 'offer.received'
  | 'offer.accepted'
  | 'offer.rejected'
  | 'prequal_offer.received'
  | 'prequal_offer.accepted'
  | 'final_offer.received'
  | 'final_offer.required'
  | 'final_offer.accepted'
  // E-signature events
  | 'esign.required'
  | 'esign.completed'
  // Signing events
  | 'signing.ready'
  | 'signing.completed'
  // KYC events
  | 'kyc.attestation_available'
  // Funding events
  | 'funding.initiated'
  | 'funding.completed'
  | 'funding.failed'
  | 'funding.required'
  | 'funding.disbursing'
  | 'funding.disbursed'
  | 'funding.declined'
  | 'funding.insufficient_balance'
  // Loan events
  | 'loan.created'
  | 'loan.creation_failed'
  | 'loan.repayment_address_ready'
  | 'loan.repayment_received'
  | 'loan.paid_off'
  | 'loan.status_changed'
  | 'loan.infrastructure_failed'
  // Wallet verification events
  | 'wallet.verification.initiated'
  | 'wallet.verification.completed'
  | 'wallet.verification.failed'
  | 'wallet.verification.expired'
  | 'wallet.verification.revoked'
  // Test event
  | 'test';

/**
 * Base webhook event structure
 */
export interface WebhookEvent<T = unknown> {
  /** Unique event ID */
  id: string;
  /** Event type */
  event: WebhookEventType;
  /** Event payload */
  data: T;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** API version that generated this event */
  version?: string;
  /** Correlation ID for tracing */
  correlationId?: string;
}

// ============================================================================
// Application Event Data Types
// ============================================================================

/**
 * application.created - Application created and routed to lenders
 */
export interface ApplicationCreatedData {
  applicationId: string;
  productType: string;
  routedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * application.routed - Application routed to specific lenders
 */
export interface ApplicationRoutedData {
  applicationId: string;
  lenderIds: string[];
  routedAt: string;
}

/**
 * application.approved - Application approved for funding
 */
export interface ApplicationApprovedData {
  applicationId: string;
  approvedAt: string;
  status: 'APPROVED';
  fundingAmount?: string;
}

/**
 * application.rejected - Application rejected by lender
 */
export interface ApplicationRejectedData {
  applicationId: string;
  rejectedAt: string;
  reason?: string;
  status: 'REJECTED';
}

/**
 * application.declined - Lender declined after hard pull
 */
export interface ApplicationDeclinedData {
  applicationId: string;
  lenderId: string;
  declinedAt: string;
}

// ============================================================================
// Offer Event Data Types
// ============================================================================

/**
 * offer.received - Lender submitted an offer
 */
export interface OfferReceivedData {
  applicationId: string;
  offerId: string;
  lenderId: string;
  loanAmount: string;
  interestRate: string;
  monthlyPayment: string;
  termMonths?: number;
  expiresAt: string;
}

/**
 * offer.accepted - Offer accepted by neobank
 */
export interface OfferAcceptedData {
  applicationId: string;
  offerId: string;
  lenderId: string;
  acceptedAt: string;
}

/**
 * offer.rejected - Offer rejected (another offer accepted)
 */
export interface OfferRejectedData {
  applicationId: string;
  offerId?: string;
  rejectedAt: string;
  reason?: string;
  status: 'REJECTED';
  timestamp: string;
}

/**
 * prequal_offer.received - Prequalified offers received from lender
 */
export interface PrequalOfferReceivedData {
  applicationId: string;
  lenderId: string;
  offerCount: number;
  receivedAt: string;
}

/**
 * prequal_offer.accepted - Prequalified offer accepted
 */
export interface PrequalOfferAcceptedData {
  applicationId: string;
  offerId: string;
  lenderId: string;
  acceptedAt: string;
}

/**
 * final_offer.received - Final offers received from lender
 */
export interface FinalOfferReceivedData {
  applicationId: string;
  lenderId: string;
  offerCount: number;
  receivedAt: string;
}

/**
 * final_offer.required - Lender needs to submit final offer after hard pull
 */
export interface FinalOfferRequiredData {
  applicationId: string;
  lenderId: string;
  acceptedPrequalOfferId: string;
  hardPullConsentAt: string;
}

/**
 * final_offer.accepted - Final offer accepted
 */
export interface FinalOfferAcceptedData {
  applicationId: string;
  offerId: string;
  lenderId: string;
  acceptedAt: string;
}

// ============================================================================
// E-Signature Event Data Types
// ============================================================================

/**
 * esign.required - Documents ready for borrower signature
 */
export interface ESignRequiredData {
  applicationId: string;
  documentType: string;
  unsignedDocumentHandle: string;
  action: 'signature_required';
  timestamp: string;
}

/**
 * esign.completed - Documents signed successfully
 */
export interface ESignCompletedData {
  applicationId: string;
  documentType: string;
  signedDocumentHandle: string;
  signatureStatus: 'completed';
  timestamp: string;
}

// ============================================================================
// Signing Event Data Types
// ============================================================================

/**
 * signing.ready - Signing session created
 */
export interface SigningReadyData {
  applicationId: string;
  sessionId: string;
  signingUrl: string;
  timestamp: string;
}

/**
 * signing.completed - Documents signed by borrower
 */
export interface SigningCompletedData {
  applicationId: string;
  signedDocumentHandle: string;
  documentType: 'loan_agreement_signed';
  timestamp: string;
}

// ============================================================================
// KYC Event Data Types
// ============================================================================

/**
 * kyc.attestation_available - KYC documents available for lender review
 */
export interface KYCAttestationAvailableData {
  applicationId: string;
  documentType: 'kyc';
  kycDocumentHandle?: string;
  proofDocumentHandle?: string;
  documentsAvailable: true;
  timestamp: string;
}

// ============================================================================
// Funding Event Data Types
// ============================================================================

/**
 * funding.initiated - Lender initiated funding
 */
export interface FundingInitiatedData {
  applicationId: string;
  offerId?: string;
  fundingAmount: string;
  initiatedAt: string;
  estimatedCompletionDate?: string;
}

/**
 * funding.completed - Funding completed successfully
 */
export interface FundingCompletedData {
  applicationId: string;
  offerId?: string;
  fundingAmount: string;
  completedAt: string;
  transactionReference?: string;
}

/**
 * funding.failed - Funding failed
 */
export interface FundingFailedData {
  applicationId: string;
  offerId?: string;
  failedAt: string;
  reason: string;
  errorCode?: string;
}

/**
 * funding.required - Loan signed, funding consent required
 */
export interface FundingRequiredData {
  applicationId: string;
  fundingId: string;
  amount: string;
  currency: string;
  signedAt?: string | null;
}

/**
 * funding.disbursing - Disbursement in progress
 */
export interface FundingDisbursingData {
  fundingId: string;
  applicationId: string;
  amount: string;
  blockchain?: string | null;
  recipientAddress?: string | null;
  initiatedAt?: string | null;
  bridgeTransferId?: string | null;
}

/**
 * funding.disbursed - Funds sent to borrower wallet
 */
export interface FundingDisbursedData {
  fundingId: string;
  applicationId: string;
  amount: string;
  txHash?: string | null;
  blockchain?: string | null;
  completedAt?: string | null;
}

/**
 * funding.declined - Lender declined to fund
 */
export interface FundingDeclinedData {
  applicationId: string;
  fundingId: string;
  reason?: string;
}

/**
 * funding.insufficient_balance - Lender wallet insufficient balance
 */
export interface FundingInsufficientBalanceData {
  fundingId: string;
  applicationId: string;
  requiredAmount: string;
  availableBalance: string;
  currency: string;
}

// ============================================================================
// Loan Event Data Types
// ============================================================================

/**
 * loan.created - Loan record created after disbursement
 */
export interface LoanCreatedData {
  loanId: string;
  fundingId: string;
  applicationId: string;
  principal: string;
  annualRate: string;
  termMonths: number;
  monthlyPayment: string;
  firstPaymentDue: string;
  maturityDate: string;
  repaymentAddress: string | null;
  createdAt: string;
}

/**
 * loan.creation_failed - Loan could not be created
 */
export interface LoanCreationFailedData {
  fundingId: string;
  applicationId: string;
  reason: string;
  message: string;
}

/**
 * loan.repayment_address_ready - Repayment address created
 */
export interface LoanRepaymentAddressReadyData {
  loanId: string;
  applicationId: string;
  repaymentAddress: string;
  repaymentChain: string;
  createdAt: string;
}

/**
 * loan.repayment_received - Payment received on loan
 */
export interface LoanRepaymentReceivedData {
  loanId: string;
  repaymentId: string;
  applicationId: string;
  amount: string;
  currency?: string;
  principalPortion?: string | null;
  interestPortion?: string | null;
  balanceAfter?: string | null;
  depositTxHash: string | null;
  receivedAt: string;
}

/**
 * loan.paid_off - Loan fully repaid
 */
export interface LoanPaidOffData {
  loanId: string;
  applicationId: string;
  totalPaid?: string;
  paidOffAt: string;
}

/**
 * loan.status_changed - Loan status changed
 */
export interface LoanStatusChangedData {
  loanId: string;
  applicationId: string;
  previousStatus: 'ACTIVE' | 'PAID_OFF' | 'DELINQUENT' | 'DEFAULTED' | 'CLOSED';
  newStatus: 'ACTIVE' | 'PAID_OFF' | 'DELINQUENT' | 'DEFAULTED' | 'CLOSED';
  changedAt: string;
}

/**
 * loan.infrastructure_failed - Failed to create repayment infrastructure
 */
export interface LoanInfrastructureFailedData {
  loanId: string;
  applicationId: string;
  error: string | null;
  message: string;
  retryCount?: number;
}

// ============================================================================
// Wallet Verification Event Data Types
// ============================================================================

/**
 * Verification method type
 * @see packages/shared/src/validators/webhook-payloads.ts
 */
type WalletVerificationMethod = 'MESSAGE_SIGN' | 'MICRO_DEPOSIT' | 'AOPP';

/**
 * Verification status type
 */
type WalletVerificationStatus = 'PENDING' | 'AWAITING_CONFIRMATION' | 'VERIFIED' | 'FAILED' | 'EXPIRED';

/**
 * wallet.verification.initiated - Verification challenge created
 */
export interface WalletVerificationInitiatedData {
  verificationId: string;
  walletId: string;
  walletAddress: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
}

/**
 * wallet.verification.completed - Wallet successfully verified
 */
export interface WalletVerificationCompletedData {
  verificationId: string;
  walletId: string;
  walletAddress: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
  completedAt: string;
}

/**
 * wallet.verification.failed - Verification failed (bad signature, etc.)
 */
export interface WalletVerificationFailedData {
  verificationId: string;
  walletId: string;
  walletAddress: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
  failureReason: string;
}

/**
 * wallet.verification.expired - Verification challenge expired
 */
export interface WalletVerificationExpiredData {
  verificationId: string;
  walletId: string;
  walletAddress: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
}

/**
 * wallet.verification.revoked - Verification revoked by admin
 */
export interface WalletVerificationRevokedData {
  verificationId: string;
  walletId: string;
  walletAddress: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
  reason: string;
  revokedBy: string;
}

// ============================================================================
// Test Event Data Types
// ============================================================================

/**
 * test - Test webhook event
 */
export interface TestWebhookData {
  message: string;
  timestamp: string;
}
