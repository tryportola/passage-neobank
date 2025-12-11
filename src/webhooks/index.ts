/**
 * Webhook handling utilities for the Passage SDK
 *
 * @module webhooks
 */

export type {
  WebhookEventType,
  WebhookEvent,
  ApplicationStatusChangedData,
  OfferSubmittedData,
  OfferAcceptedData,
  LoanFundedData,
  LoanRepaymentData,
  SigningSessionData,
  TestWebhookData,
} from './types';

export { WebhookHandler, WebhookSignatureError, type WebhookHandlerConfig } from './handler';
