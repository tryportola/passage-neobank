import crypto from 'crypto';

// src/webhooks/handler.ts

// src/errors.ts
var PassageError = class extends Error {
  constructor(message, options) {
    super(message);
    this.name = "PassageError";
    this.statusCode = options?.statusCode;
    this.errorCode = options?.errorCode;
    this.requestId = options?.requestId;
    this.details = options?.details;
    this.cause = options?.cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  /**
   * Check if this is a specific error type
   */
  is(errorCode) {
    return this.errorCode === errorCode;
  }
  /**
   * Check if error is retryable (5xx or network errors)
   */
  get isRetryable() {
    if (!this.statusCode) return true;
    return this.statusCode >= 500 || this.statusCode === 429;
  }
  /**
   * Check if error is a client error (4xx)
   */
  get isClientError() {
    return this.statusCode !== void 0 && this.statusCode >= 400 && this.statusCode < 500;
  }
  /**
   * Check if error is a server error (5xx)
   */
  get isServerError() {
    return this.statusCode !== void 0 && this.statusCode >= 500;
  }
};

// src/webhooks/handler.ts
var WebhookSignatureError = class extends PassageError {
  constructor(message) {
    super(message, {
      errorCode: "WEBHOOK_SIGNATURE_INVALID"
    });
    this.name = "WebhookSignatureError";
  }
};
var WebhookHandler = class {
  constructor(config) {
    if (!config.secret) {
      throw new Error("WebhookHandler: secret is required");
    }
    this.secret = config.secret;
    this.tolerance = config.tolerance ?? 300;
  }
  /**
   * Verify signature and construct webhook event
   *
   * @param payload - Raw request body as string
   * @param signature - Value of x-passage-signature header
   * @returns Parsed and verified webhook event
   * @throws WebhookSignatureError if signature is invalid
   */
  constructEvent(payload, signature) {
    this.verifySignature(payload, signature);
    return JSON.parse(payload);
  }
  /**
   * Verify webhook signature
   *
   * @param payload - Raw request body as string
   * @param signature - Value of x-passage-signature header
   * @throws WebhookSignatureError if signature is invalid
   */
  verifySignature(payload, signature) {
    if (!signature) {
      throw new WebhookSignatureError("Missing signature header");
    }
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const sig = parts.find((p) => p.startsWith("v1="))?.slice(3);
    if (!timestamp || !sig) {
      throw new WebhookSignatureError("Invalid signature format");
    }
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1e3);
    if (Math.abs(now - timestampNum) > this.tolerance) {
      throw new WebhookSignatureError("Timestamp outside tolerance window");
    }
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto.createHmac("sha256", this.secret).update(signedPayload).digest("hex");
    const sigBuffer = Buffer.from(sig, "hex");
    const expectedSigBuffer = Buffer.from(expectedSig, "hex");
    if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      throw new WebhookSignatureError("Signature verification failed");
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
  generateTestHeaders(payload) {
    const timestamp = Math.floor(Date.now() / 1e3);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac("sha256", this.secret).update(signedPayload).digest("hex");
    return {
      "x-passage-signature": `t=${timestamp},v1=${signature}`
    };
  }
};

export { WebhookHandler, WebhookSignatureError };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map