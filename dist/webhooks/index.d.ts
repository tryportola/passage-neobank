import { P as PassageError } from '../errors-DgbLNkc1.js';

/**
 * Webhook event types
 */
type WebhookEventType = 'application.created' | 'application.status.changed' | 'application.routed' | 'offer.prequal.submitted' | 'offer.prequal.accepted' | 'offer.final.submitted' | 'offer.final.accepted' | 'signing.session.created' | 'signing.session.completed' | 'loan.created' | 'loan.funded' | 'loan.repayment.received' | 'loan.status.changed' | 'test';
/**
 * Base webhook event structure
 */
interface WebhookEvent<T = unknown> {
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
interface ApplicationStatusChangedData {
    applicationId: string;
    previousStatus: string;
    newStatus: string;
    triggeredBy: string;
}
/**
 * Offer submitted event data
 */
interface OfferSubmittedData {
    applicationId: string;
    lenderId: string;
    offerCount: number;
    offerType: 'prequalified' | 'final';
}
/**
 * Offer accepted event data
 */
interface OfferAcceptedData {
    applicationId: string;
    lenderId: string;
    offerId: string;
    offerType: 'prequalified' | 'final';
}
/**
 * Loan funded event data
 */
interface LoanFundedData {
    loanId: string;
    applicationId: string;
    amount: string;
    txHash: string;
    borrowerAddress: string;
}
/**
 * Loan repayment received event data
 */
interface LoanRepaymentData {
    loanId: string;
    repaymentId: string;
    amount: string;
    txHash: string;
    remainingBalance: string;
}
/**
 * Signing session event data
 */
interface SigningSessionData {
    sessionId: string;
    applicationId: string;
    status: 'created' | 'completed' | 'expired';
}
/**
 * Test webhook event data
 */
interface TestWebhookData {
    message: string;
    timestamp: string;
}

/**
 * Configuration for the webhook handler
 */
interface WebhookHandlerConfig {
    /** Webhook signing secret (starts with whsec_) */
    secret: string;
    /** Tolerance for timestamp validation in seconds (default: 300 = 5 minutes) */
    tolerance?: number;
}
/**
 * Error thrown when webhook signature verification fails
 */
declare class WebhookSignatureError extends PassageError {
    constructor(message: string);
}
/**
 * Webhook handler for verifying and parsing Passage webhooks
 *
 * @example
 * ```typescript
 * import { WebhookHandler } from '@portola/passage-neobank/webhooks';
 *
 * const webhooks = new WebhookHandler({
 *   secret: process.env.WEBHOOK_SECRET!,
 * });
 *
 * // In your webhook endpoint (e.g., Next.js API route)
 * export async function POST(req: Request) {
 *   const body = await req.text();
 *   const signature = req.headers.get('x-passage-signature')!;
 *
 *   try {
 *     const event = webhooks.constructEvent(body, signature);
 *
 *     switch (event.event) {
 *       case 'application.status.changed':
 *         console.log('Application status changed:', event.data);
 *         break;
 *       case 'loan.funded':
 *         console.log('Loan funded:', event.data);
 *         break;
 *     }
 *
 *     return new Response('OK', { status: 200 });
 *   } catch (error) {
 *     if (error instanceof WebhookSignatureError) {
 *       return new Response('Invalid signature', { status: 401 });
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
declare class WebhookHandler {
    private secret;
    private tolerance;
    constructor(config: WebhookHandlerConfig);
    /**
     * Verify signature and construct webhook event
     *
     * @param payload - Raw request body as string
     * @param signature - Value of x-passage-signature header
     * @returns Parsed and verified webhook event
     * @throws WebhookSignatureError if signature is invalid
     */
    constructEvent<T = unknown>(payload: string, signature: string): WebhookEvent<T>;
    /**
     * Verify webhook signature
     *
     * @param payload - Raw request body as string
     * @param signature - Value of x-passage-signature header
     * @throws WebhookSignatureError if signature is invalid
     */
    verifySignature(payload: string, signature: string): void;
    /**
     * Generate test headers for webhook testing
     *
     * Useful for writing unit tests for your webhook handlers.
     *
     * @param payload - The webhook payload to sign
     * @returns Object with x-passage-signature header value
     *
     * @example
     * ```typescript
     * // In your tests
     * const webhooks = new WebhookHandler({ secret: 'test_secret' });
     *
     * const testPayload = JSON.stringify({
     *   id: 'evt_123',
     *   event: 'application.status.changed',
     *   data: { applicationId: 'app_123', newStatus: 'OFFERS_READY' },
     *   timestamp: new Date().toISOString(),
     *   version: '1.0',
     * });
     *
     * const headers = webhooks.generateTestHeaders(testPayload);
     *
     * // Use in your test
     * const response = await fetch('/api/webhooks', {
     *   method: 'POST',
     *   body: testPayload,
     *   headers: {
     *     'Content-Type': 'application/json',
     *     'x-passage-signature': headers['x-passage-signature'],
     *   },
     * });
     * ```
     */
    generateTestHeaders(payload: string): {
        'x-passage-signature': string;
    };
}

export { type ApplicationStatusChangedData, type LoanFundedData, type LoanRepaymentData, type OfferAcceptedData, type OfferSubmittedData, type SigningSessionData, type TestWebhookData, type WebhookEvent, type WebhookEventType, WebhookHandler, type WebhookHandlerConfig, WebhookSignatureError };
