import crypto from 'crypto';
import type { WebhookEvent, WebhookEventType } from './types';
import { PassageError } from '../errors';

/**
 * Configuration for the webhook handler
 */
export interface WebhookHandlerConfig {
  /** Webhook signing secret (starts with whsec_) */
  secret: string;
  /** Tolerance for timestamp validation in seconds (default: 300 = 5 minutes) */
  tolerance?: number;
}

/**
 * Error thrown when webhook signature verification fails
 */
export class WebhookSignatureError extends PassageError {
  constructor(message: string) {
    super(message, {
      errorCode: 'WEBHOOK_SIGNATURE_INVALID',
    });
    this.name = 'WebhookSignatureError';
  }
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
export class WebhookHandler {
  private secret: string;
  private tolerance: number;

  constructor(config: WebhookHandlerConfig) {
    if (!config.secret) {
      throw new Error('WebhookHandler: secret is required');
    }
    this.secret = config.secret;
    this.tolerance = config.tolerance ?? 300; // 5 minutes default
  }

  /**
   * Verify signature and construct webhook event
   *
   * @param payload - Raw request body as string
   * @param signature - Value of x-passage-signature header
   * @returns Parsed and verified webhook event
   * @throws WebhookSignatureError if signature is invalid
   */
  constructEvent<T = unknown>(payload: string, signature: string): WebhookEvent<T> {
    this.verifySignature(payload, signature);
    return JSON.parse(payload) as WebhookEvent<T>;
  }

  /**
   * Verify webhook signature
   *
   * @param payload - Raw request body as string
   * @param signature - Value of x-passage-signature header
   * @throws WebhookSignatureError if signature is invalid
   */
  verifySignature(payload: string, signature: string): void {
    if (!signature) {
      throw new WebhookSignatureError('Missing signature header');
    }

    // Parse signature header: t=timestamp,v1=signature
    const parts = signature.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const sig = parts.find((p) => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !sig) {
      throw new WebhookSignatureError('Invalid signature format');
    }

    // Verify timestamp is within tolerance
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - timestampNum) > this.tolerance) {
      throw new WebhookSignatureError('Timestamp outside tolerance window');
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(signedPayload)
      .digest('hex');

    // Timing-safe comparison
    // Note: Must check buffer lengths first - timingSafeEqual throws if lengths differ
    const sigBuffer = Buffer.from(sig, 'hex');
    const expectedSigBuffer = Buffer.from(expectedSig, 'hex');

    if (
      sigBuffer.length !== expectedSigBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
    ) {
      throw new WebhookSignatureError('Signature verification failed');
    }
  }

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
  generateTestHeaders(payload: string): { 'x-passage-signature': string } {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', this.secret).update(signedPayload).digest('hex');

    return {
      'x-passage-signature': `t=${timestamp},v1=${signature}`,
    };
  }
}
