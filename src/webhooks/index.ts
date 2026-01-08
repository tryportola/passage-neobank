/**
 * Webhook handling utilities for the Passage SDK
 *
 * @module webhooks
 */

export type {
  WebhookEventType,
  WebhookEvent,
  // Application events
  ApplicationCreatedData,
  ApplicationRoutedData,
  ApplicationApprovedData,
  ApplicationRejectedData,
  ApplicationDeclinedData,
  // Offer events
  OfferReceivedData,
  OfferAcceptedData,
  OfferRejectedData,
  PrequalOfferReceivedData,
  PrequalOfferAcceptedData,
  FinalOfferReceivedData,
  FinalOfferRequiredData,
  FinalOfferAcceptedData,
  // E-signature events
  ESignRequiredData,
  ESignCompletedData,
  // Signing events
  SigningReadyData,
  SigningCompletedData,
  // KYC events
  KYCAttestationAvailableData,
  // Funding events
  FundingInitiatedData,
  FundingCompletedData,
  FundingFailedData,
  FundingRequiredData,
  FundingDisbursingData,
  FundingDisbursedData,
  FundingDeclinedData,
  FundingInsufficientBalanceData,
  // Loan events
  LoanCreatedData,
  LoanCreationFailedData,
  LoanRepaymentAddressReadyData,
  LoanRepaymentReceivedData,
  LoanPaidOffData,
  LoanStatusChangedData,
  LoanInfrastructureFailedData,
  // Wallet verification events
  WalletVerificationInitiatedData,
  WalletVerificationCompletedData,
  WalletVerificationFailedData,
  WalletVerificationExpiredData,
  WalletVerificationRevokedData,
  // Test event
  TestWebhookData,
} from './types';

export { WebhookHandler, WebhookSignatureError, type WebhookHandlerConfig } from './handler';
