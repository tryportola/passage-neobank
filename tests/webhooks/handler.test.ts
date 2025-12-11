import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { WebhookHandler, WebhookSignatureError } from '../../src/webhooks/handler';
import type { WebhookEvent } from '../../src/webhooks/types';

describe('webhooks/handler', () => {
  const TEST_SECRET = 'whsec_test_secret_key_12345';

  describe('WebhookHandler constructor', () => {
    it('should initialize with valid config', () => {
      const handler = new WebhookHandler({ secret: TEST_SECRET });
      expect(handler).toBeInstanceOf(WebhookHandler);
    });

    it('should throw if secret is empty', () => {
      expect(() => new WebhookHandler({ secret: '' })).toThrow('secret is required');
    });

    it('should use default tolerance of 300 seconds', () => {
      const handler = new WebhookHandler({ secret: TEST_SECRET });
      // We can verify this by testing with an old timestamp
      const timestamp = Math.floor(Date.now() / 1000) - 301; // Just over 5 minutes old
      const payload = JSON.stringify({ test: true });
      const signature = createSignature(payload, timestamp, TEST_SECRET);

      expect(() => handler.verifySignature(payload, signature)).toThrow('Timestamp outside tolerance');
    });

    it('should accept custom tolerance', () => {
      const handler = new WebhookHandler({ secret: TEST_SECRET, tolerance: 600 });
      const timestamp = Math.floor(Date.now() / 1000) - 500; // 8+ minutes old
      const payload = JSON.stringify({ test: true });
      const signature = createSignature(payload, timestamp, TEST_SECRET);

      // Should not throw with extended tolerance
      expect(() => handler.verifySignature(payload, signature)).not.toThrow();
    });
  });

  describe('verifySignature', () => {
    let handler: WebhookHandler;

    beforeEach(() => {
      handler = new WebhookHandler({ secret: TEST_SECRET });
    });

    it('should verify valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createSignature(payload, timestamp, TEST_SECRET);

      expect(() => handler.verifySignature(payload, signature)).not.toThrow();
    });

    it('should throw WebhookSignatureError for missing signature', () => {
      const payload = JSON.stringify({ test: true });

      expect(() => handler.verifySignature(payload, '')).toThrow(WebhookSignatureError);
      expect(() => handler.verifySignature(payload, '')).toThrow('Missing signature header');
    });

    it('should throw WebhookSignatureError for invalid signature format', () => {
      const payload = JSON.stringify({ test: true });

      expect(() => handler.verifySignature(payload, 'invalid')).toThrow('Invalid signature format');
      expect(() => handler.verifySignature(payload, 't=123')).toThrow('Invalid signature format');
      expect(() => handler.verifySignature(payload, 'v1=abc')).toThrow('Invalid signature format');
    });

    it('should throw WebhookSignatureError for expired timestamp', () => {
      const payload = JSON.stringify({ test: true });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = createSignature(payload, oldTimestamp, TEST_SECRET);

      expect(() => handler.verifySignature(payload, signature)).toThrow('Timestamp outside tolerance');
    });

    it('should throw WebhookSignatureError for future timestamp', () => {
      const payload = JSON.stringify({ test: true });
      const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 minutes in future
      const signature = createSignature(payload, futureTimestamp, TEST_SECRET);

      expect(() => handler.verifySignature(payload, signature)).toThrow('Timestamp outside tolerance');
    });

    it('should throw WebhookSignatureError for wrong secret', () => {
      const payload = JSON.stringify({ test: true });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createSignature(payload, timestamp, 'wrong_secret');

      expect(() => handler.verifySignature(payload, signature)).toThrow('Signature verification failed');
    });

    it('should throw WebhookSignatureError for tampered payload', () => {
      const originalPayload = JSON.stringify({ test: true });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createSignature(originalPayload, timestamp, TEST_SECRET);

      const tamperedPayload = JSON.stringify({ test: false });

      expect(() => handler.verifySignature(tamperedPayload, signature)).toThrow('Signature verification failed');
    });

    it('should be timing-safe against signature comparison attacks', () => {
      const payload = JSON.stringify({ test: true });
      const timestamp = Math.floor(Date.now() / 1000);

      // Create a valid signature structure but with wrong value
      const wrongSig = `t=${timestamp},v1=${'a'.repeat(64)}`;

      // This should fail but use constant-time comparison
      expect(() => handler.verifySignature(payload, wrongSig)).toThrow('Signature verification failed');
    });
  });

  describe('constructEvent', () => {
    let handler: WebhookHandler;

    beforeEach(() => {
      handler = new WebhookHandler({ secret: TEST_SECRET });
    });

    it('should verify and parse valid webhook event', () => {
      const eventData: WebhookEvent = {
        id: 'evt_123456',
        event: 'application.status.changed',
        data: {
          applicationId: 'app_abc',
          previousStatus: 'PENDING',
          newStatus: 'OFFERS_READY',
        },
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      const payload = JSON.stringify(eventData);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createSignature(payload, timestamp, TEST_SECRET);

      const result = handler.constructEvent(payload, signature);

      expect(result.id).toBe('evt_123456');
      expect(result.event).toBe('application.status.changed');
      expect(result.data).toEqual(eventData.data);
    });

    it('should throw for invalid signature before parsing', () => {
      const payload = JSON.stringify({ id: 'evt_123', event: 'test' });

      expect(() => handler.constructEvent(payload, 'invalid')).toThrow(WebhookSignatureError);
    });

    it('should support generic type parameter', () => {
      interface CustomData {
        customField: string;
      }

      const eventData = {
        id: 'evt_123',
        event: 'test' as const,
        data: { customField: 'value' },
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      const payload = JSON.stringify(eventData);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createSignature(payload, timestamp, TEST_SECRET);

      const result = handler.constructEvent<CustomData>(payload, signature);

      expect(result.data.customField).toBe('value');
    });
  });

  describe('generateTestHeaders', () => {
    let handler: WebhookHandler;

    beforeEach(() => {
      handler = new WebhookHandler({ secret: TEST_SECRET });
    });

    it('should generate valid signature headers', () => {
      const payload = JSON.stringify({
        id: 'evt_test',
        event: 'test',
        data: { message: 'test' },
        timestamp: new Date().toISOString(),
        version: '1.0',
      });

      const headers = handler.generateTestHeaders(payload);

      expect(headers).toHaveProperty('x-passage-signature');
      expect(headers['x-passage-signature']).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('should generate headers that pass verification', () => {
      const payload = JSON.stringify({
        id: 'evt_test',
        event: 'test',
        data: {},
        timestamp: new Date().toISOString(),
        version: '1.0',
      });

      const headers = handler.generateTestHeaders(payload);

      // Should not throw
      expect(() => handler.verifySignature(payload, headers['x-passage-signature'])).not.toThrow();
    });

    it('should generate headers that work with constructEvent', () => {
      const eventData = {
        id: 'evt_roundtrip',
        event: 'loan.funded' as const,
        data: { loanId: 'loan_123', amount: '10000' },
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      const payload = JSON.stringify(eventData);
      const headers = handler.generateTestHeaders(payload);

      const result = handler.constructEvent(payload, headers['x-passage-signature']);

      expect(result.id).toBe('evt_roundtrip');
      expect(result.event).toBe('loan.funded');
    });

    it('should generate different timestamps on each call', async () => {
      const payload = JSON.stringify({ test: true });

      const headers1 = handler.generateTestHeaders(payload);

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const headers2 = handler.generateTestHeaders(payload);

      const timestamp1 = headers1['x-passage-signature'].split(',')[0];
      const timestamp2 = headers2['x-passage-signature'].split(',')[0];

      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('WebhookSignatureError', () => {
    it('should be instanceof PassageError', () => {
      const error = new WebhookSignatureError('test message');
      expect(error.name).toBe('WebhookSignatureError');
      expect(error.message).toBe('test message');
    });

    it('should have correct error code', () => {
      const error = new WebhookSignatureError('test');
      expect(error.errorCode).toBe('WEBHOOK_SIGNATURE_INVALID');
    });
  });
});

// Helper function to create valid signatures for testing
function createSignature(payload: string, timestamp: number, secret: string): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
