import { Configuration, ApplicationsApi, OffersApi, LoansApi, EntityDiscoveryApi, NeobankSelfServiceApi, SigningApi, SDXApi, WalletsApi } from '@portola/passage';
export { WalletType as WalletOwnershipType } from '@portola/passage';
import axios from 'axios';

// src/client.ts

// package.json
var version = "1.2.0";

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
          walletId: params.walletId,
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
        applicationSubmitRequest: {
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
        applicationStatusUpdateRequest: { status }
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
  /**
   * Get the loan associated with an application
   *
   * Returns the loan that was created when this application was funded.
   * Returns null if the application hasn't been funded yet.
   *
   * @example
   * ```typescript
   * // Check if application has a loan
   * const loan = await passage.applications.getLoan('app_123');
   * if (loan) {
   *   console.log(`Loan ${loan.id} - Principal: $${loan.principal}`);
   * } else {
   *   console.log('Application not yet funded');
   * }
   * ```
   */
  async getLoan(applicationId) {
    return this.execute(async () => {
      this.debug("applications.getLoan", applicationId);
      try {
        const response = await this.api.getLoanByApplication({ applicationId });
        return unwrapResponse(response);
      } catch (error) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    }, "applications.getLoan");
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
   * Requires hard pull consent from the borrower. This triggers the lender
   * to perform a hard credit pull and submit final offers.
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
   *   // Optional: provide wallet for disbursement if not set at application creation
   *   borrowerWallet: {
   *     address: '0x1234...',
   *     chain: 'base',
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
          communicationPreferences: params.communicationPreferences,
          borrowerWallet: params.borrowerWallet,
          borrowerEmail: params.borrowerEmail,
          borrowerName: params.borrowerName,
          requestedDisbursement: params.requestedDisbursement
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
   * Returns signing session details including the URL to redirect the borrower.
   *
   * Note: hardPullConsent and borrowerWallet should have been provided when
   * accepting the prequalified offer via acceptPrequal().
   *
   * @example
   * ```typescript
   * const result = await passage.offers.acceptFinal(offerId, {
   *   borrowerEmail: 'borrower@example.com',
   *   borrowerName: 'John Doe',
   * });
   *
   * // Redirect borrower to sign documents
   * if (result.signingUrl) {
   *   console.log('Sign at:', result.signingUrl);
   * }
   * ```
   */
  async acceptFinal(offerId, params = {}) {
    return this.execute(async () => {
      this.debug("offers.acceptFinal", offerId);
      const response = await this.api.acceptFinalOffer({
        offerId,
        finalOfferAcceptanceRequest: {
          borrowerEmail: params.borrowerEmail,
          borrowerName: params.borrowerName
        }
      });
      return unwrapResponse(response);
    }, "offers.acceptFinal");
  }
};

// src/resources/loans.ts
var LoansResource = class extends BaseResource {
  constructor(api, applicationsApi, config) {
    super(config);
    this.api = api;
    this.applicationsApi = applicationsApi;
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
   * Convenience method for neobanks to look up a loan using the application ID.
   * Returns null if the application hasn't been funded yet (no loan exists).
   *
   * @example
   * ```typescript
   * // Get loan for an application
   * const loan = await passage.loans.getByApplication('app_123');
   * if (loan) {
   *   console.log(`Loan status: ${loan.status}`);
   * }
   * ```
   *
   * @see applications.getLoan() - Equivalent method on the applications resource
   */
  async getByApplication(applicationId) {
    return this.execute(async () => {
      this.debug("loans.getByApplication", applicationId);
      try {
        const response = await this.applicationsApi.getLoanByApplication({ applicationId });
        return unwrapResponse(response);
      } catch (error) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    }, "loans.getByApplication");
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
      return unwrapResponse(response);
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
        documentHandle: data.signedDocHandle
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
        lenderId: session.lenderId,
        status: session.status,
        borrowerEmail: session.borrowerEmail,
        borrowerName: session.borrowerName,
        initiatedAt: session.initiatedAt,
        expiresAt: session.expiresAt,
        completedAt: session.completedAt,
        documentHandle: session.signedDocHandle
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
      const response = await axios.post(
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
      const response = await axios.get(
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

// src/resources/wallets.ts
var WalletsResource = class extends BaseResource {
  constructor(api, config) {
    super(config);
    this.api = api;
  }
  /**
   * Create or link a wallet
   *
   * Registers a wallet address for ownership verification.
   * Idempotent - returns existing wallet if address+chain already exists.
   *
   * @example
   * ```typescript
   * const wallet = await passage.wallets.create({
   *   address: '0x1234567890abcdef...',
   *   chain: 'base',
   *   externalId: 'user_123', // Your internal user ID
   *   label: "John's wallet",
   * });
   * ```
   */
  async create(params) {
    return this.execute(async () => {
      this.debug("wallets.create", params.address);
      const response = await this.api.createWallet({
        createWalletRequest: {
          address: params.address,
          chain: params.chain,
          type: params.type,
          externalId: params.externalId,
          label: params.label,
          metadata: params.metadata
        }
      });
      const data = unwrapResponse(response);
      return this.mapWallet(data);
    }, "wallets.create");
  }
  /**
   * Get a wallet by ID
   *
   * @example
   * ```typescript
   * const wallet = await passage.wallets.get('wal_123');
   * console.log(wallet.verified, wallet.verifiedByThisNeobank);
   * ```
   */
  async get(walletId) {
    return this.execute(async () => {
      this.debug("wallets.get", walletId);
      const response = await this.api.getWallet({ id: walletId });
      const data = unwrapResponse(response);
      return this.mapWallet(data);
    }, "wallets.get");
  }
  /**
   * List wallets linked to this neobank
   *
   * @example
   * ```typescript
   * // List all verified wallets
   * const { wallets } = await passage.wallets.list({ verified: true });
   *
   * // Find wallets by external ID
   * const { wallets } = await passage.wallets.list({ externalId: 'user_123' });
   * ```
   */
  async list(params = {}) {
    return this.execute(async () => {
      this.debug("wallets.list", params);
      const verifiedParam = params.verified === void 0 ? void 0 : params.verified ? "true" : "false";
      const response = await this.api.listWallets({
        verified: verifiedParam,
        chain: params.chain,
        externalId: params.externalId,
        address: params.address,
        limit: params.limit,
        offset: params.offset
      });
      const data = unwrapResponse(response);
      return {
        wallets: data.wallets.map((w) => this.mapWallet(w)),
        pagination: data.pagination
      };
    }, "wallets.list");
  }
  /**
   * Update wallet metadata
   *
   * Updates neobank-specific metadata (externalId, label, metadata).
   *
   * @example
   * ```typescript
   * await passage.wallets.update('wal_123', {
   *   label: 'Primary wallet',
   *   externalId: 'new_user_id',
   * });
   * ```
   */
  async update(walletId, params) {
    return this.execute(async () => {
      this.debug("wallets.update", walletId);
      const response = await this.api.updateWallet({
        id: walletId,
        updateWalletRequest: {
          externalId: params.externalId,
          label: params.label,
          metadata: params.metadata
        }
      });
      const data = unwrapResponse(response);
      return this.mapWallet(data);
    }, "wallets.update");
  }
  /**
   * Initiate wallet verification
   *
   * Starts the verification process. For MESSAGE_SIGN, returns a message
   * that the user must sign with their wallet.
   *
   * @example
   * ```typescript
   * const challenge = await passage.wallets.initiateVerification('wal_123', {
   *   method: 'MESSAGE_SIGN',
   * });
   *
   * // Present message to user for signing
   * console.log(challenge.challenge.message);
   * ```
   */
  async initiateVerification(walletId, params) {
    return this.execute(async () => {
      this.debug("wallets.initiateVerification", walletId, params.method);
      const response = await this.api.initiateVerification({
        walletId,
        initiateVerificationRequest: { method: params.method }
      });
      const data = unwrapResponse(response);
      return {
        verificationId: data.verificationId,
        walletId: data.walletId,
        method: data.method,
        status: data.status,
        challenge: data.challenge,
        expiresAt: data.expiresAt
      };
    }, "wallets.initiateVerification");
  }
  /**
   * Submit verification proof
   *
   * Submits the signature to complete verification.
   *
   * @example
   * ```typescript
   * // After user signs the challenge message
   * const result = await passage.wallets.submitProof(verificationId, {
   *   signature: '0x...',
   * });
   *
   * if (result.status === 'VERIFIED') {
   *   console.log('Wallet verified!');
   * }
   * ```
   */
  async submitProof(verificationId, params) {
    return this.execute(async () => {
      this.debug("wallets.submitProof", verificationId);
      const response = await this.api.submitVerificationProof({
        verificationId,
        submitProofRequest: { signature: params.signature }
      });
      const data = unwrapResponse(response);
      return {
        verificationId: data.verificationId,
        status: data.status,
        verifiedAt: data.verifiedAt,
        wallet: {
          id: data.wallet.id,
          verified: data.wallet.verified,
          verificationMethod: data.wallet.verificationMethod
        }
      };
    }, "wallets.submitProof");
  }
  /**
   * Get verification status
   *
   * @example
   * ```typescript
   * const verification = await passage.wallets.getVerification('ver_123');
   * console.log(verification.status);
   * ```
   */
  async getVerification(verificationId) {
    return this.execute(async () => {
      this.debug("wallets.getVerification", verificationId);
      const response = await this.api.getVerificationStatus({ verificationId });
      const data = unwrapResponse(response);
      return {
        id: data.id,
        walletId: data.walletId,
        method: data.method,
        status: data.status,
        expiresAt: data.expiresAt ?? null,
        completedAt: data.completedAt,
        failedAt: data.failedAt,
        failureReason: data.failureReason
      };
    }, "wallets.getVerification");
  }
  /**
   * List verifications for a wallet
   *
   * Returns all verification attempts for this wallet by this neobank.
   *
   * @example
   * ```typescript
   * const { verifications } = await passage.wallets.listVerifications('wal_123');
   * ```
   */
  async listVerifications(walletId) {
    return this.execute(async () => {
      this.debug("wallets.listVerifications", walletId);
      const response = await this.api.listWalletVerifications({ walletId });
      const data = unwrapResponse(response);
      return {
        verifications: data.verifications.map((v) => ({
          id: v.id,
          method: v.method,
          status: v.status,
          initiatedAt: v.initiatedAt,
          completedAt: v.completedAt ?? null,
          expiresAt: v.expiresAt
        }))
      };
    }, "wallets.listVerifications");
  }
  // =========================================================================
  // Convenience Methods
  // =========================================================================
  /**
   * Ensure a wallet is registered and check verification status
   *
   * This is a convenience method that:
   * 1. Creates/links the wallet if it doesn't exist
   * 2. Checks if already verified by this neobank
   * 3. Returns verification status and challenge if needed
   *
   * Use this when you want to check if a wallet needs verification
   * before showing the signing UI to the user.
   *
   * @example
   * ```typescript
   * const result = await passage.wallets.ensureVerified({
   *   address: userWalletAddress,
   *   chain: 'base',
   *   externalId: user.id,
   * });
   *
   * if (result.verified) {
   *   // Wallet already verified, proceed with application
   *   console.log('Wallet verified:', result.wallet.id);
   * } else {
   *   // Need user to sign - show signing UI
   *   const signature = await walletClient.signMessage({
   *     message: result.challenge.challenge.message,
   *   });
   *
   *   await passage.wallets.submitProof(result.challenge.verificationId, { signature });
   * }
   * ```
   */
  async ensureVerified(params) {
    return this.execute(async () => {
      this.debug("wallets.ensureVerified", params.address);
      const wallet = await this.create(params);
      if (wallet.verifiedByThisNeobank) {
        return { verified: true, wallet, challenge: null };
      }
      const challenge = await this.initiateVerification(wallet.id, {
        method: "MESSAGE_SIGN"
      });
      return { verified: false, wallet, challenge };
    }, "wallets.ensureVerified");
  }
  /**
   * Register wallet and complete verification in a single atomic operation
   *
   * This method creates a NEW challenge internally and verifies the signature
   * against that challenge. It is designed for server-controlled signing
   * scenarios (custodial wallets, automated systems) where you can sign the
   * challenge message in the same execution context.
   *
   * **WARNING:** Do NOT use this after calling `ensureVerified()` or
   * `initiateVerification()`. Each call creates a new challenge with a unique
   * nonce, so signatures from previous challenges will fail verification.
   *
   * For browser-based user wallet verification, use the two-step flow:
   * 1. Call `ensureVerified()` to get the challenge
   * 2. User signs the challenge message in their wallet
   * 3. Call `submitProof(challenge.verificationId, { signature })`
   *
   * @example
   * ```typescript
   * // For custodial/server-controlled wallets only
   * const result = await passage.wallets.verifyWithSignature({
   *   address: custodialWalletAddress,
   *   chain: 'base',
   *   signature: await custodialSigner.signMessage(challengeMessage),
   * });
   *
   * console.log(result.wallet.verified); // true
   * ```
   *
   * @example
   * ```typescript
   * // For browser-based user wallets, use ensureVerified + submitProof instead:
   * const result = await passage.wallets.ensureVerified({ address: '0x...' });
   * if (!result.verified) {
   *   const signature = await userWallet.signMessage(result.challenge.challenge.message);
   *   await passage.wallets.submitProof(result.challenge.verificationId, { signature });
   * }
   * ```
   */
  async verifyWithSignature(params) {
    return this.execute(async () => {
      this.debug("wallets.verifyWithSignature", params.address);
      const { signature, ...walletParams } = params;
      const wallet = await this.create(walletParams);
      if (wallet.verifiedByThisNeobank) {
        return {
          verificationId: "",
          // No new verification created
          status: "VERIFIED",
          verifiedAt: wallet.verifiedAt,
          wallet
        };
      }
      const challenge = await this.initiateVerification(wallet.id, {
        method: "MESSAGE_SIGN"
      });
      const result = await this.submitProof(challenge.verificationId, { signature });
      const updatedWallet = await this.get(wallet.id);
      return {
        ...result,
        wallet: updatedWallet
      };
    }, "wallets.verifyWithSignature");
  }
  // =========================================================================
  // AOPP Methods
  // =========================================================================
  /**
   * Initiate AOPP verification
   *
   * Returns a challenge with an aoppUri that can be displayed as a QR code.
   * The user scans this with an AOPP-compatible wallet (Ledger Live, BitBox),
   * and the wallet POSTs the signature directly to our callback URL.
   *
   * After displaying the QR code, poll with `waitForAOPPVerification()` to
   * detect when the user completes verification.
   *
   * @example
   * ```typescript
   * import { isAOPPChallenge } from '@portola/passage-neobank';
   *
   * const challenge = await passage.wallets.initiateAOPPVerification('wal_123');
   *
   * if (isAOPPChallenge(challenge.challenge)) {
   *   // Display QR code with challenge.challenge.aoppUri
   *   showQRCode(challenge.challenge.aoppUri);
   *
   *   // Poll for completion (user signs in their wallet app)
   *   const result = await passage.wallets.waitForAOPPVerification(
   *     challenge.verificationId,
   *     { timeout: 600000 } // 10 minutes
   *   );
   *
   *   if (result.status === 'VERIFIED') {
   *     console.log('Wallet verified via AOPP!');
   *   }
   * }
   * ```
   */
  async initiateAOPPVerification(walletId) {
    return this.execute(async () => {
      this.debug("wallets.initiateAOPPVerification", walletId);
      const response = await this.api.initiateVerification({
        walletId,
        initiateVerificationRequest: { method: "AOPP" }
      });
      const data = unwrapResponse(response);
      return {
        verificationId: data.verificationId,
        walletId: data.walletId,
        method: data.method,
        status: data.status,
        challenge: data.challenge,
        expiresAt: data.expiresAt
      };
    }, "wallets.initiateAOPPVerification");
  }
  /**
   * Poll for AOPP verification completion
   *
   * Since AOPP callbacks go directly to the server (not through the frontend),
   * this method polls the verification status until it completes, fails, or times out.
   *
   * @param verificationId - The verification ID from initiateAOPPVerification
   * @param options - Polling options
   * @param options.timeout - Max time to wait in ms (default: 600000 = 10 minutes)
   * @param options.interval - Poll interval in ms (default: 2000 = 2 seconds)
   * @param options.onPoll - Optional callback on each poll (for showing countdown)
   *
   * @example
   * ```typescript
   * const result = await passage.wallets.waitForAOPPVerification(verificationId, {
   *   timeout: 600000, // 10 minutes
   *   interval: 2000,  // Check every 2 seconds
   *   onPoll: (verification) => {
   *     console.log(`Status: ${verification.status}, expires: ${verification.expiresAt}`);
   *   },
   * });
   * ```
   */
  async waitForAOPPVerification(verificationId, options = {}) {
    const { timeout = 6e5, interval = 2e3, onPoll } = options;
    const startTime = Date.now();
    return this.execute(async () => {
      this.debug("wallets.waitForAOPPVerification", verificationId);
      while (Date.now() - startTime < timeout) {
        const verification = await this.getVerification(verificationId);
        if (onPoll) {
          onPoll(verification);
        }
        if (verification.status === "VERIFIED" || verification.status === "FAILED" || verification.status === "EXPIRED") {
          return verification;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
      return this.getVerification(verificationId);
    }, "wallets.waitForAOPPVerification");
  }
  /**
   * Map API wallet data to Wallet type
   */
  mapWallet(data) {
    return {
      id: data.id,
      address: data.address,
      chain: data.chain,
      type: data.type,
      verified: data.verified,
      verifiedByThisNeobank: data.verifiedByThisNeobank,
      verifiedAt: data.verifiedAt ?? null,
      verificationMethod: data.verificationMethod ?? null,
      externalId: data.externalId ?? null,
      label: data.label ?? null,
      createdAt: data.createdAt
    };
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
    this.sdkConfig = new Configuration({
      basePath: this.config.baseUrl,
      apiKey: this.config.apiKey,
      baseOptions: {
        timeout: this.config.timeout,
        headers: {
          "User-Agent": `passage-neobank/${version}`
        }
      }
    });
    const applicationsApi = new ApplicationsApi(this.sdkConfig);
    const offersApi = new OffersApi(this.sdkConfig);
    const loansApi = new LoansApi(this.sdkConfig);
    const entityDiscoveryApi = new EntityDiscoveryApi(this.sdkConfig);
    const selfServiceApi = new NeobankSelfServiceApi(this.sdkConfig);
    const signingApi = new SigningApi(this.sdkConfig);
    const sdxApi = new SDXApi(this.sdkConfig);
    const walletsApi = new WalletsApi(this.sdkConfig);
    this.applications = new ApplicationsResource(applicationsApi, this.config);
    this.offers = new OffersResource(offersApi, this.config);
    this.loans = new LoansResource(loansApi, applicationsApi, this.config);
    this.lenders = new LendersResource(entityDiscoveryApi, this.config);
    this.account = new AccountResource(selfServiceApi, this.config);
    this.signing = new SigningResource(signingApi, this.config);
    this.sdx = new SDXResource(sdxApi, this.config);
    this.wallets = new WalletsResource(walletsApi, this.config);
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

export { AuthenticationError, AuthorizationError, ConflictError, NetworkError, NotFoundError, Passage, PassageError, RateLimitError, TimeoutError, ValidationError, Passage as default };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map