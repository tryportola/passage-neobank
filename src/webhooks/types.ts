/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'application.created'
  | 'application.status.changed'
  | 'application.routed'
  | 'offer.prequal.submitted'
  | 'offer.prequal.accepted'
  | 'offer.final.submitted'
  | 'offer.final.accepted'
  | 'signing.session.created'
  | 'signing.session.completed'
  | 'loan.created'
  | 'loan.funded'
  | 'loan.repayment.received'
  | 'loan.status.changed'
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
  version: string;
}

/**
 * Application status changed event data
 */
export interface ApplicationStatusChangedData {
  applicationId: string;
  previousStatus: string;
  newStatus: string;
  triggeredBy: string;
}

/**
 * Offer submitted event data
 */
export interface OfferSubmittedData {
  applicationId: string;
  lenderId: string;
  offerCount: number;
  offerType: 'prequalified' | 'final';
}

/**
 * Offer accepted event data
 */
export interface OfferAcceptedData {
  applicationId: string;
  lenderId: string;
  offerId: string;
  offerType: 'prequalified' | 'final';
}

/**
 * Loan funded event data
 */
export interface LoanFundedData {
  loanId: string;
  applicationId: string;
  amount: string;
  txHash: string;
  borrowerAddress: string;
}

/**
 * Loan repayment received event data
 */
export interface LoanRepaymentData {
  loanId: string;
  repaymentId: string;
  amount: string;
  txHash: string;
  remainingBalance: string;
}

/**
 * Signing session event data
 */
export interface SigningSessionData {
  sessionId: string;
  applicationId: string;
  status: 'created' | 'completed' | 'expired';
}

/**
 * Test webhook event data
 */
export interface TestWebhookData {
  message: string;
  timestamp: string;
}
