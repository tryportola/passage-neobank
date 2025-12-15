'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var passage = require('@portola/passage');
var axios = require('axios');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var axios__default = /*#__PURE__*/_interopDefault(axios);

// src/client.ts

// package.json
var version = "1.1.0";

// src/config.ts
var API_BASE_URL = "https://api.tryportola.com/api/v1";
function resolveBaseUrl(config) {
  if (config.baseUrl) {
    return config.baseUrl;
  }
  return API_BASE_URL;
}
function resolveConfig(config) {
  return {
    apiKey: config.apiKey,
    environment: config.environment ?? "production",
    baseUrl: resolveBaseUrl(config),
    timeout: config.timeout ?? 3e4,
    maxRetries: config.maxRetries ?? 3,
    debug: config.debug ?? false
  };
}

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
var ValidationError = class extends PassageError {
  constructor(message, fields, options) {
    super(message, {
      statusCode: 400,
      errorCode: "VALIDATION_ERROR",
      requestId: options?.requestId,
      details: options?.details
    });
    this.name = "ValidationError";
    this.fields = fields;
  }
  /**
   * Get errors for a specific field
   */
  getFieldErrors(field) {
    return this.fields?.[field] ?? [];
  }
  /**
   * Check if a specific field has errors
   */
  hasFieldError(field) {
    return (this.fields?.[field]?.length ?? 0) > 0;
  }
};
var AuthenticationError = class extends PassageError {
  constructor(message = "Invalid or expired API key", requestId) {
    super(message, {
      statusCode: 401,
      errorCode: "AUTHENTICATION_ERROR",
      requestId
    });
    this.name = "AuthenticationError";
  }
};
var AuthorizationError = class extends PassageError {
  constructor(message = "Insufficient permissions for this action", requestId) {
    super(message, {
      statusCode: 403,
      errorCode: "AUTHORIZATION_ERROR",
      requestId
    });
    this.name = "AuthorizationError";
  }
};
var NotFoundError = class extends PassageError {
  constructor(message, options) {
    super(message, {
      statusCode: 404,
      errorCode: "NOT_FOUND",
      requestId: options?.requestId
    });
    this.name = "NotFoundError";
    this.resourceType = options?.resourceType;
    this.resourceId = options?.resourceId;
  }
};
var RateLimitError = class extends PassageError {
  constructor(message = "Rate limit exceeded", retryAfter, requestId) {
    super(message, {
      statusCode: 429,
      errorCode: "RATE_LIMIT_EXCEEDED",
      requestId
    });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
};
var ConflictError = class extends PassageError {
  constructor(message, requestId) {
    super(message, {
      statusCode: 409,
      errorCode: "CONFLICT",
      requestId
    });
    this.name = "ConflictError";
  }
};
var NetworkError = class extends PassageError {
  constructor(message = "Network error", cause) {
    super(message, {
      errorCode: "NETWORK_ERROR",
      cause
    });
    this.name = "NetworkError";
  }
};
var TimeoutError = class extends PassageError {
  constructor(message = "Request timed out", cause) {
    super(message, {
      errorCode: "TIMEOUT",
      cause
    });
    this.name = "TimeoutError";
  }
};
function createErrorFromResponse(statusCode, body) {
  const message = body.message || body.error || "Unknown error";
  const requestId = body.requestId;
  const errorCode = body.error || body.code;
  switch (statusCode) {
    case 400:
      if (body.details && Array.isArray(body.details)) {
        const fields = {};
        for (const detail of body.details) {
          if (!fields[detail.field]) {
            fields[detail.field] = [];
          }
          fields[detail.field].push(detail.message);
        }
        return new ValidationError(message, fields, { requestId });
      }
      if (body.fields) {
        return new ValidationError(message, body.fields, { requestId });
      }
      if (errorCode === "VALIDATION_ERROR") {
        return new ValidationError(message, void 0, { requestId });
      }
      return new PassageError(message, {
        statusCode: 400,
        errorCode: errorCode || "BAD_REQUEST",
        requestId
      });
    case 401:
      return new AuthenticationError(message, requestId);
    case 403:
      return new AuthorizationError(message, requestId);
    case 404:
      return new NotFoundError(message, { requestId });
    case 409:
      return new ConflictError(message, requestId);
    case 429:
      return new RateLimitError(message, void 0, requestId);
    default:
      return new PassageError(message, {
        statusCode,
        errorCode: errorCode || `HTTP_${statusCode}`,
        requestId,
        details: body
      });
  }
}

// src/resources/base.ts
function unwrapResponse(response) {
  const envelope = response.data;
  if (!envelope.success) {
    const errorEnvelope = envelope;
    throw new PassageError(errorEnvelope.message || errorEnvelope.error || "Request failed", {
      errorCode: errorEnvelope.code,
      requestId: errorEnvelope.requestId
    });
  }
  return envelope.data;
}
var BaseResource = class {
  constructor(config) {
    this.config = config;
  }
  /**
   * Execute an API call with retry logic and error handling
   */
  async execute(operation, operationName) {
    let lastError;
    const maxRetries = this.config.maxRetries;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const passageError = this.convertError(error, operationName);
        if (passageError.isClientError && passageError.statusCode !== 429) {
          throw passageError;
        }
        if (attempt === maxRetries) {
          throw passageError;
        }
        if (this.config.debug) {
          console.log(
            `[Passage] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`,
            passageError.message
          );
        }
        const delay = Math.min(100 * Math.pow(2, attempt), 1e4);
        await this.sleep(delay);
      }
    }
    throw lastError || new PassageError("Unknown error");
  }
  /**
   * Convert various error types to PassageError
   */
  convertError(error, operationName) {
    if (error instanceof PassageError) {
      return error;
    }
    if (this.isAxiosError(error)) {
      if (error.response) {
        const { status, data } = error.response;
        return createErrorFromResponse(status, data || {});
      }
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        return new TimeoutError(`${operationName} timed out`, error);
      }
      return new NetworkError(`${operationName} failed: ${error.message}`, error);
    }
    if (error instanceof Error) {
      return new PassageError(`${operationName} failed: ${error.message}`, {
        cause: error
      });
    }
    return new PassageError(`${operationName} failed with unknown error`);
  }
  /**
   * Type guard for axios errors
   */
  isAxiosError(error) {
    return typeof error === "object" && error !== null && ("response" in error || "code" in error || "isAxiosError" in error);
  }
  /**
   * Sleep for a specified duration
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Log debug message if debug mode is enabled
   */
  debug(message, ...args) {
    if (this.config.debug) {
      console.log(`[Passage] ${message}`, ...args);
    }
  }
};

// src/resources/applications.ts
var ApplicationsResource = class extends BaseResource {
  constructor(api, config) {
    super(config);
    this.api = api;
  }
  /**
   * List applications with optional filtering
   *
   * Note: Returns ApplicationListItem[], which is a lighter type than Application.
   * Use get(id) to fetch the full Application details if needed.
   *
   * @example
   * ```typescript
   * // List all applications
   * const { applications, pagination } = await passage.applications.list();
   *
   * // Filter by status
   * const { applications } = await passage.applications.list({
   *   status: 'OFFERS_READY',
   *   limit: 20,
   * });
   *
   * // Get full details for a specific application
   * const fullApp = await passage.applications.get(applications[0].id);
   * ```
   */
  async list(params) {
    return this.execute(async () => {
      this.debug("applications.list", params);
      const response = await this.api.listApplications({
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        productType: params?.productType,
        externalId: params?.externalId,
        borrowerWalletAddress: params?.borrowerWalletAddress
      });
      const data = unwrapResponse(response);
      return {
        applications: data.applications,
        pagination: data.pagination ?? {
          total: data.applications.length,
          limit: params?.limit ?? 20,
          offset: params?.offset ?? 0,
          hasMore: false
        }
      };
    }, "applications.list");
  }
  /**
   * Get a single application by ID
   *
   * @example
   * ```typescript
   * const application = await passage.applications.get('app_123');
   * console.log(application.status); // 'OFFERS_READY'
   * ```
   */
  async get(applicationId) {
    return this.execute(async () => {
      this.debug("applications.get", applicationId);
      const response = await this.api.getApplication({ applicationId });
      return unwrapResponse(response);
    }, "applications.get");
  }
  /**
   * Create a new loan application
   *
   * @example
   * ```typescript
   * import { encryptPIIForLenders } from '@portola/passage-neobank/crypto';
   *
   * // Get available lenders
   * const lenders = await passage.lenders.list({ productType: 'personal', stateCode: 'CA' });
   *
   * // Encrypt PII for each lender
   * const encryptedPayloads = encryptPIIForLenders(
   *   lenders.map(l => ({ lenderId: l.lenderId, publicKey: l.publicKey })),
   *   borrowerPII
   * );
   *
   * // Create application
   * const application = await passage.applications.create({
   *   productType: 'personal',
   *   encryptedPayloads,
   *   metadata: { requestedAmount: 10000 },
   * });
   * ```
   */
  async create(params) {
    return this.execute(async () => {
      this.debug("applications.create", { productType: params.productType, externalId: params.externalId });
      const response = await this.api.submitApplication({
        applicationRequest: {
          productType: params.productType,
          encryptedPayloads: params.encryptedPayloads,
          externalId: params.externalId,
          metadata: params.metadata,
          draft: params.draft,
          borrowerWalletAddress: params.borrowerWalletAddress,
          borrowerWalletChain: params.borrowerWalletChain
        }
      });
      return unwrapResponse(response);
    }, "applications.create");
  }
  /**
   * Submit a draft application
   *
   * @example
   * ```typescript
   * const submitted = await passage.applications.submitDraft(draftApp.id, {
   *   perLenderKycHandles: [
   *     { lenderId: 'lender_1', handle: 'sdx_handle_1' },
   *   ],
   * });
   * ```
   */
  async submitDraft(applicationId, params) {
    return this.execute(async () => {
      this.debug("applications.submitDraft", applicationId);
      const response = await this.api.submitDraftApplication({
        applicationId,
        draftSubmitRequest: {
          perLenderKycHandles: params?.perLenderKycHandles
        }
      });
      return unwrapResponse(response);
    }, "applications.submitDraft");
  }
  /**
   * Update an application's status
   *
   * Note: Not all status transitions are valid. The API will return an error
   * for invalid transitions (e.g., cannot move from FUNDED back to PENDING).
   *
   * @example
   * ```typescript
   * // Cancel an application
   * const updated = await passage.applications.updateStatus('app_123', 'CANCELLED');
   * console.log(updated.status); // 'CANCELLED'
   * ```
   */
  async updateStatus(applicationId, status) {
    return this.execute(async () => {
      this.debug("applications.updateStatus", { applicationId, status });
      const response = await this.api.updateApplicationStatus({
        applicationId,
        updateApplicationStatusRequest: { status }
      });
      return unwrapResponse(response);
    }, "applications.updateStatus");
  }
  /**
   * Cancel an application
   *
   * Convenience method that calls updateStatus with 'CANCELLED'.
   * This is typically used when a borrower abandons the application flow.
   *
   * @example
   * ```typescript
   * // User clicked "Cancel Application"
   * const cancelled = await passage.applications.cancel('app_123');
   * console.log(cancelled.status); // 'CANCELLED'
   * ```
   */
  async cancel(applicationId) {
    return this.updateStatus(applicationId, "CANCELLED");
  }
};

// src/resources/offers.ts
var OffersResource = class extends BaseResource {
  constructor(api, config) {
    super(config);
    this.api = api;
  }
  /**
   * Get prequalified offers for an application
   *
   * @example
   * ```typescript
   * import { decryptOfferDetails } from '@portola/passage-neobank/crypto';
   *
   * const offers = await passage.offers.getPrequalified(applicationId);
   *
   * for (const lenderGroup of offers.lenders) {
   *   for (const offer of lenderGroup.offers) {
   *     const { data, verified } = decryptOfferDetails(
   *       offer.encryptedOfferDetailsNeobank,
   *       offer.checksumSha256,
   *       process.env.NEOBANK_PRIVATE_KEY!
   *     );
   *
   *     if (verified) {
   *       console.log(`${lenderGroup.lenderName}: ${data.apr} APR`);
   *     }
   *   }
   * }
   * ```
   */
  async getPrequalified(applicationId) {
    return this.execute(async () => {
      this.debug("offers.getPrequalified", applicationId);
      const response = await this.api.getPrequalOffers({ applicationId });
      return unwrapResponse(response);
    }, "offers.getPrequalified");
  }
  /**
   * Accept a prequalified offer to proceed to final underwriting
   *
   * Requires hard pull consent from the borrower.
   *
   * @example
   * ```typescript
   * const result = await passage.offers.acceptPrequal(offerId, {
   *   hardPullConsent: {
   *     consented: true,
   *     consentedAt: new Date().toISOString(),
   *     ipAddress: req.ip,
   *     userAgent: req.headers['user-agent'],
   *   },
   * });
   * // Application moves to final underwriting
   * ```
   */
  async acceptPrequal(offerId, params) {
    return this.execute(async () => {
      this.debug("offers.acceptPrequal", offerId);
      const response = await this.api.acceptPrequalOffer({
        offerId,
        offerAcceptanceRequest: {
          hardPullConsent: params.hardPullConsent,
          communicationPreferences: params.communicationPreferences
        }
      });
      return unwrapResponse(response);
    }, "offers.acceptPrequal");
  }
  /**
   * Get final offers for an application (after accepting prequal)
   *
   * @example
   * ```typescript
   * const finalOffers = await passage.offers.getFinal(applicationId);
   * ```
   */
  async getFinal(applicationId) {
    return this.execute(async () => {
      this.debug("offers.getFinal", applicationId);
      const response = await this.api.getFinalOffers({ applicationId });
      return unwrapResponse(response);
    }, "offers.getFinal");
  }
  /**
   * Accept a final offer to proceed to signing
   *
   * This is the point of no return - the borrower commits to the loan terms.
   *
   * @example
   * ```typescript
   * const result = await passage.offers.acceptFinal(offerId, {
   *   hardPullConsent: {
   *     consented: true,
   *     consentedAt: new Date().toISOString(),
   *     ipAddress: req.ip,
   *     userAgent: req.headers['user-agent'],
   *   },
   *   borrowerWallet: {
   *     address: '0x1234...',
   *     chain: 'polygon',
   *   },
   * });
   * ```
   */
  async acceptFinal(offerId, params) {
    return this.execute(async () => {
      this.debug("offers.acceptFinal", offerId);
      const response = await this.api.acceptFinalOffer({
        offerId,
        offerAcceptanceRequest: {
          hardPullConsent: params.hardPullConsent,
          borrowerWallet: params.borrowerWallet,
          communicationPreferences: params.communicationPreferences
        }
      });
      return unwrapResponse(response);
    }, "offers.acceptFinal");
  }
};

// src/resources/loans.ts
var LoansResource = class extends BaseResource {
  constructor(api, config) {
    super(config);
    this.api = api;
  }
  /**
   * List loans with optional filtering
   *
   * @example
   * ```typescript
   * // List all loans
   * const { loans, pagination } = await passage.loans.list();
   *
   * // Filter by external user ID
   * const { loans } = await passage.loans.list({ externalId: 'user_123' });
   *
   * // Filter by borrower wallet
   * const { loans } = await passage.loans.list({ borrowerAddress: '0x...' });
   *
   * // Filter by status
   * const { loans } = await passage.loans.list({ status: 'active' });
   * ```
   */
  async list(params) {
    return this.execute(async () => {
      this.debug("loans.list", params);
      const response = await this.api.listLoans({
        status: params?.status,
        externalId: params?.externalId,
        borrowerAddress: params?.borrowerAddress,
        limit: params?.limit,
        offset: params?.offset
      });
      const data = unwrapResponse(response);
      return {
        loans: data.loans,
        pagination: data.pagination ?? {
          total: data.loans.length,
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0,
          hasMore: false
        }
      };
    }, "loans.list");
  }
  /**
   * List repayments for a loan
   *
   * @example
   * ```typescript
   * const { repayments, pagination } = await passage.loans.getRepayments('loan_123');
   *
   * for (const repayment of repayments) {
   *   console.log(`Received ${repayment.amount} on ${repayment.receivedAt}`);
   * }
   * ```
   */
  async getRepayments(loanId, params) {
    return this.execute(async () => {
      this.debug("loans.getRepayments", { loanId, ...params });
      const response = await this.api.listLoanRepayments({
        loanId,
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status
      });
      const data = unwrapResponse(response);
      return {
        repayments: data.repayments,
        pagination: data.pagination ?? {
          total: data.repayments.length,
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0,
          hasMore: false
        }
      };
    }, "loans.getRepayments");
  }
  /**
   * Get a single loan by ID
   *
   * @example
   * ```typescript
   * const loan = await passage.loans.get('loan_123');
   * console.log(`Outstanding: ${loan.outstandingBalance}`);
   * ```
   */
  async get(loanId) {
    return this.execute(async () => {
      this.debug("loans.get", loanId);
      const response = await this.api.getLoan({ loanId });
      return unwrapResponse(response);
    }, "loans.get");
  }
  /**
   * Get the payment schedule for a loan
   *
   * @example
   * ```typescript
   * const schedule = await passage.loans.getPaymentSchedule('loan_123');
   *
   * for (const payment of schedule) {
   *   console.log(`Payment ${payment.paymentNumber}: ${payment.payment} due ${payment.dueDate}`);
   * }
   * ```
   */
  async getPaymentSchedule(loanId) {
    return this.execute(async () => {
      this.debug("loans.getPaymentSchedule", loanId);
      const response = await this.api.getPaymentSchedule({ loanId });
      const data = unwrapResponse(response);
      return data.projectedSchedule;
    }, "loans.getPaymentSchedule");
  }
  /**
   * Get loan by application ID
   *
   * Returns null if no loan exists for this application (instead of throwing NotFoundError).
   *
   * @example
   * ```typescript
   * const loan = await passage.loans.getByApplication('app_123');
   * if (loan) {
   *   console.log(`Loan found: ${loan.id}`);
   * } else {
   *   console.log('No loan exists for this application yet');
   * }
   * ```
   */
  async getByApplication(applicationId) {
    try {
      return await this.execute(async () => {
        this.debug("loans.getByApplication", applicationId);
        const response = await this.api.getLoanByApplication({ applicationId });
        return unwrapResponse(response);
      }, "loans.getByApplication");
    } catch (error) {
      if (error instanceof PassageError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
};

// src/resources/lenders.ts
var LendersResource = class extends BaseResource {
  constructor(api, config) {
    super(config);
    this.api = api;
  }
  /**
   * List available lenders with optional filtering
   *
   * Returns lenders that support the specified product type and state.
   * Each lender includes their public key needed for PII encryption.
   *
   * @example
   * ```typescript
   * // Get lenders for personal loans in California
   * const lenders = await passage.lenders.list({
   *   productType: 'personal',
   *   stateCode: 'CA',
   * });
   *
   * // Use lender public keys for encryption
   * for (const lender of lenders) {
   *   console.log(`${lender.name}: supports ${lender.supportedProducts.join(', ')}`);
   * }
   * ```
   */
  async list(params) {
    return this.execute(async () => {
      this.debug("lenders.list", params);
      const response = await this.api.listLenders({
        productType: params?.productType,
        stateCode: params?.stateCode
      });
      const data = unwrapResponse(response);
      return data.lenders;
    }, "lenders.list");
  }
};

// src/resources/account.ts
var AccountResource = class extends BaseResource {
  constructor(api, config) {
    super(config);
    this.api = api;
  }
  /**
   * Get current neobank account information
   *
   * @example
   * ```typescript
   * const info = await passage.account.getInfo();
   * console.log(info.name); // 'My Neobank'
   * console.log(info.environment); // 'sandbox' or 'production'
   * ```
   */
  async getInfo() {
    return this.execute(async () => {
      this.debug("account.getInfo");
      const response = await this.api.getAccountInfo();
      return unwrapResponse(response);
    }, "account.getInfo");
  }
  /**
   * Get aggregated statistics for your neobank account
   *
   * Returns application counts by status, loan statistics, and borrower counts.
   *
   * @example
   * ```typescript
   * const stats = await passage.account.getStats();
   * console.log(`Total applications: ${stats.applications.total}`);
   * console.log(`Active loans: ${stats.loans.active}`);
   * console.log(`Total disbursed: ${stats.loans.totalDisbursed}`);
   * console.log(`Unique borrowers: ${stats.borrowers.total}`);
   * ```
   */
  async getStats() {
    return this.execute(async () => {
      this.debug("account.getStats");
      const response = await this.api.getAccountStats();
      const data = unwrapResponse(response);
      return data;
    }, "account.getStats");
  }
  /**
   * Get webhook configuration
   *
   * @example
   * ```typescript
   * const webhook = await passage.account.getWebhook();
   * if (webhook.webhookUrl) {
   *   console.log(`Webhook configured: ${webhook.webhookUrl}`);
   * }
   * ```
   */
  async getWebhook() {
    return this.execute(async () => {
      this.debug("account.getWebhook");
      const response = await this.api.getWebhookConfig();
      return unwrapResponse(response);
    }, "account.getWebhook");
  }
  /**
   * Update webhook URL
   *
   * URL must be HTTPS in production. HTTP is allowed in sandbox for testing.
   *
   * @example
   * ```typescript
   * const result = await passage.account.updateWebhook({
   *   url: 'https://api.myapp.com/webhooks/passage',
   * });
   * console.log(result.message); // 'Webhook URL updated successfully'
   * ```
   */
  async updateWebhook(params) {
    return this.execute(async () => {
      this.debug("account.updateWebhook", params.url);
      const response = await this.api.updateWebhookUrl({
        webhookUrlUpdateRequest: { webhookUrl: params.url }
      });
      const data = unwrapResponse(response);
      return {
        webhookUrl: data.webhookUrl,
        message: data.message
      };
    }, "account.updateWebhook");
  }
  /**
   * Send a test webhook to verify endpoint configuration
   *
   * @example
   * ```typescript
   * const result = await passage.account.testWebhook();
   * if (result.delivered) {
   *   console.log('Webhook test successful');
   * } else {
   *   console.log(`Test failed: ${result.error}`);
   * }
   * ```
   */
  async testWebhook() {
    return this.execute(async () => {
      this.debug("account.testWebhook");
      const response = await this.api.testWebhook();
      return unwrapResponse(response);
    }, "account.testWebhook");
  }
  /**
   * Rotate webhook secret
   *
   * IMPORTANT: The new secret is only returned once. Store it securely.
   *
   * @example
   * ```typescript
   * const result = await passage.account.rotateWebhookSecret();
   * // Store this securely - it won't be shown again!
   * await saveToSecretManager(result.webhookSecret);
   * ```
   */
  async rotateWebhookSecret() {
    return this.execute(async () => {
      this.debug("account.rotateWebhookSecret");
      const response = await this.api.rotateWebhookSecret();
      return unwrapResponse(response);
    }, "account.rotateWebhookSecret");
  }
};

// src/resources/signing.ts
var SigningResource = class extends BaseResource {
  constructor(api, config) {
    super(config);
    this.api = api;
  }
  /**
   * Create a new signing session for an application
   *
   * After accepting a final offer, create a signing session to allow
   * the borrower to sign loan documents electronically.
   *
   * @example
   * ```typescript
   * const session = await passage.signing.create('app_123', {
   *   borrowerEmail: 'borrower@example.com',
   *   borrowerName: 'John Doe',
   * });
   *
   * // Redirect borrower to sign documents
   * console.log('Sign here:', session.signingUrl);
   * ```
   */
  async create(applicationId, params) {
    return this.execute(async () => {
      this.debug("signing.create", applicationId);
      const response = await this.api.createSigningSession({
        applicationId,
        createSigningSessionRequest: {
          borrowerEmail: params.borrowerEmail,
          borrowerName: params.borrowerName
        }
      });
      const data = unwrapResponse(response);
      return {
        sessionId: data.sessionId,
        applicationId: data.applicationId,
        status: data.status,
        signingUrl: data.signingUrl,
        expiresAt: data.expiresAt
      };
    }, "signing.create");
  }
  /**
   * Get the status of a signing session
   *
   * @example
   * ```typescript
   * const session = await passage.signing.getStatus('session_abc123');
   *
   * if (session.status === 'COMPLETED') {
   *   console.log('Documents signed at:', session.completedAt);
   *   // Document handle available for download
   *   console.log('Document handle:', session.documentHandle);
   * }
   * ```
   */
  async getStatus(sessionId) {
    return this.execute(async () => {
      this.debug("signing.getStatus", sessionId);
      const response = await this.api.getSigningSessionStatus({ sessionId });
      const data = unwrapResponse(response);
      return {
        sessionId: data.sessionId,
        applicationId: data.applicationId,
        status: data.status,
        borrowerEmail: data.borrowerEmail,
        borrowerName: data.borrowerName,
        completedAt: data.completedAt,
        documentHandle: data.signedDocHandle,
        failedAt: data.failedAt,
        failureReason: data.failureReason
      };
    }, "signing.getStatus");
  }
  /**
   * List all signing sessions for an application
   *
   * @example
   * ```typescript
   * const sessions = await passage.signing.list('app_123');
   *
   * for (const session of sessions) {
   *   console.log(`Session ${session.sessionId}: ${session.status}`);
   * }
   * ```
   */
  async list(applicationId) {
    return this.execute(async () => {
      this.debug("signing.list", applicationId);
      const response = await this.api.getSigningSessionsByApplication({ applicationId });
      const data = unwrapResponse(response);
      return data.sessions.map((session) => ({
        sessionId: session.sessionId,
        applicationId: session.applicationId,
        status: session.status,
        borrowerEmail: session.borrowerEmail,
        borrowerName: session.borrowerName,
        completedAt: session.completedAt,
        expiresAt: session.expiresAt,
        documentHandle: session.signedDocHandle,
        failedAt: session.failedAt,
        failureReason: session.failureReason
      }));
    }, "signing.list");
  }
};
var SDXResource = class extends BaseResource {
  constructor(sdxApi, config) {
    super(config);
    this.sdxApi = sdxApi;
  }
  /**
   * Get an SDX access token for document operations
   *
   * Tokens are short-lived (10 minutes) and should be used immediately.
   *
   * @example
   * ```typescript
   * const token = await passage.sdx.getToken({
   *   applicationId: 'app_123',
   *   action: 'upload',
   *   documentType: 'kyc',
   * });
   *
   * console.log('SDX URL:', token.sdxUrl);
   * console.log('Expires in:', token.expiresIn, 'seconds');
   * ```
   */
  async getToken(params) {
    return this.execute(async () => {
      this.debug("sdx.getToken", params);
      const response = await this.sdxApi.generateSDXToken({
        sDXTokenRequest: {
          applicationId: params.applicationId,
          action: params.action,
          documentType: params.documentType
        }
      });
      const data = unwrapResponse(response);
      return {
        sdxToken: data.sdxToken,
        expiresIn: data.expiresIn,
        sdxUrl: data.sdxUrl
      };
    }, "sdx.getToken");
  }
  /**
   * Upload an encrypted document to SDX
   *
   * The document should be encrypted using `encryptDocumentForSDX()` from the crypto module.
   *
   * @example
   * ```typescript
   * import { encryptDocumentForSDX } from '@portola/passage-neobank/crypto';
   * import fs from 'fs';
   *
   * // Read and encrypt the document
   * const document = fs.readFileSync('./drivers_license.pdf');
   * const encryptedDoc = encryptDocumentForSDX(document, lenderPublicKey);
   *
   * // Get upload token
   * const token = await passage.sdx.getToken({
   *   applicationId: 'app_123',
   *   action: 'upload',
   *   documentType: 'kyc',
   * });
   *
   * // Upload encrypted document
   * const result = await passage.sdx.upload({
   *   token,
   *   encryptedDocument: encryptedDoc,
   *   documentType: 'kyc',
   * });
   *
   * console.log('Document handle:', result.documentHandle);
   * ```
   */
  async upload(params) {
    return this.execute(async () => {
      this.debug("sdx.upload", { documentType: params.documentType });
      const documentBuffer = params.encryptedDocument instanceof Buffer ? params.encryptedDocument : params.encryptedDocument instanceof Uint8Array ? params.encryptedDocument : new Uint8Array(params.encryptedDocument);
      const response = await axios__default.default.post(
        `${params.token.sdxUrl}/sdx/blobs`,
        documentBuffer,
        {
          headers: {
            Authorization: `Bearer ${params.token.sdxToken}`,
            "Content-Type": "application/octet-stream",
            "Content-Length": documentBuffer.length.toString(),
            "X-Document-Type": params.documentType ?? "other",
            ...params.idempotencyKey && {
              "Idempotency-Key": params.idempotencyKey
            }
          },
          timeout: this.config.timeout
        }
      );
      return {
        documentHandle: response.data.documentHandle,
        expiresAt: response.data.expiresAt,
        blobSize: response.data.blobSize,
        duplicate: response.data.duplicate
      };
    }, "sdx.upload");
  }
  /**
   * Convenience method: Get token and upload in one call
   *
   * @example
   * ```typescript
   * const result = await passage.sdx.uploadDocument({
   *   applicationId: 'app_123',
   *   documentType: 'kyc',
   *   encryptedDocument: encryptedDoc,
   * });
   *
   * console.log('Document handle:', result.documentHandle);
   * ```
   */
  async uploadDocument(params) {
    const token = await this.getToken({
      applicationId: params.applicationId,
      action: "upload",
      documentType: params.documentType
    });
    return this.upload({
      token,
      encryptedDocument: params.encryptedDocument,
      documentType: params.documentType,
      idempotencyKey: params.idempotencyKey
    });
  }
  /**
   * Download an encrypted document from SDX
   *
   * @example
   * ```typescript
   * const token = await passage.sdx.getToken({
   *   applicationId: 'app_123',
   *   action: 'download',
   * });
   *
   * const encryptedDoc = await passage.sdx.download({
   *   token,
   *   documentHandle: 'sdx_tok_abc123...',
   * });
   * ```
   */
  async download(params) {
    return this.execute(async () => {
      this.debug("sdx.download", params.documentHandle);
      const response = await axios__default.default.get(
        `${params.token.sdxUrl}/sdx/blobs/${params.documentHandle}`,
        {
          headers: {
            Authorization: `Bearer ${params.token.sdxToken}`
          },
          responseType: "arraybuffer",
          timeout: this.config.timeout
        }
      );
      return Buffer.from(response.data);
    }, "sdx.download");
  }
  /**
   * Convenience method: Get token and download in one call
   *
   * @example
   * ```typescript
   * const encryptedDoc = await passage.sdx.downloadDocument({
   *   applicationId: 'app_123',
   *   documentHandle: 'sdx_tok_abc123...',
   * });
   *
   * // Decrypt with your private key
   * const plaintext = decryptDocument(encryptedDoc, privateKey);
   * ```
   */
  async downloadDocument(params) {
    const token = await this.getToken({
      applicationId: params.applicationId,
      action: "download"
    });
    return this.download({
      token,
      documentHandle: params.documentHandle
    });
  }
  /**
   * Store a KYC document handle for an application
   *
   * After uploading a KYC document to SDX, store the handle so it can be
   * associated with the application and accessed by lenders.
   *
   * @example
   * ```typescript
   * // Upload KYC document
   * const uploadResult = await passage.sdx.uploadDocument({
   *   applicationId: 'app_123',
   *   documentType: 'kyc',
   *   encryptedDocument: encryptedDoc,
   * });
   *
   * // Store the handle
   * await passage.sdx.storeKYCHandle({
   *   applicationId: 'app_123',
   *   kycDocumentHandle: uploadResult.documentHandle,
   *   documentType: 'drivers_license',
   * });
   * ```
   */
  async storeKYCHandle(params) {
    return this.execute(async () => {
      this.debug("sdx.storeKYCHandle", params.applicationId);
      const response = await this.sdxApi.storeKYCHandle({
        kYCHandleRequest: {
          applicationId: params.applicationId,
          kycDocumentHandle: params.kycDocumentHandle,
          documentType: params.documentType,
          metadata: params.metadata
        }
      });
      const data = unwrapResponse(response);
      return {
        applicationId: data.applicationId,
        kycDocumentHandle: data.kycDocumentHandle,
        // Normalize null to undefined to match return type contract (?: string)
        kycSubmittedAt: data.kycSubmittedAt ?? void 0
      };
    }, "sdx.storeKYCHandle");
  }
};

// src/client.ts
var Passage = class {
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("Passage: apiKey is required");
    }
    if (!config.apiKey.startsWith("nb_test_") && !config.apiKey.startsWith("nb_live_")) {
      throw new Error(
        'Passage: apiKey must start with "nb_test_" (sandbox) or "nb_live_" (production)'
      );
    }
    const environment = config.environment ?? (config.apiKey.startsWith("nb_test_") ? "sandbox" : "production");
    this.config = resolveConfig({ ...config, environment });
    this.sdkConfig = new passage.Configuration({
      basePath: this.config.baseUrl,
      apiKey: this.config.apiKey,
      baseOptions: {
        timeout: this.config.timeout,
        headers: {
          "User-Agent": `passage-neobank/${version}`
        }
      }
    });
    const applicationsApi = new passage.ApplicationsApi(this.sdkConfig);
    const offersApi = new passage.OffersApi(this.sdkConfig);
    const loansApi = new passage.LoansApi(this.sdkConfig);
    const entityDiscoveryApi = new passage.EntityDiscoveryApi(this.sdkConfig);
    const selfServiceApi = new passage.NeobankSelfServiceApi(this.sdkConfig);
    const signingApi = new passage.SigningApi(this.sdkConfig);
    const sdxApi = new passage.SDXApi(this.sdkConfig);
    this.applications = new ApplicationsResource(applicationsApi, this.config);
    this.offers = new OffersResource(offersApi, this.config);
    this.loans = new LoansResource(loansApi, this.config);
    this.lenders = new LendersResource(entityDiscoveryApi, this.config);
    this.account = new AccountResource(selfServiceApi, this.config);
    this.signing = new SigningResource(signingApi, this.config);
    this.sdx = new SDXResource(sdxApi, this.config);
    if (this.config.debug) {
      console.log("[Passage] Initialized client", {
        environment: this.config.environment,
        baseUrl: this.config.baseUrl
      });
    }
  }
  /**
   * Get the current configuration (read-only)
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Check if connected to sandbox environment
   */
  get isSandbox() {
    return this.config.environment === "sandbox";
  }
  /**
   * Check if connected to production environment
   */
  get isProduction() {
    return this.config.environment === "production";
  }
};

exports.AuthenticationError = AuthenticationError;
exports.AuthorizationError = AuthorizationError;
exports.ConflictError = ConflictError;
exports.NetworkError = NetworkError;
exports.NotFoundError = NotFoundError;
exports.Passage = Passage;
exports.PassageError = PassageError;
exports.RateLimitError = RateLimitError;
exports.TimeoutError = TimeoutError;
exports.ValidationError = ValidationError;
exports.default = Passage;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map