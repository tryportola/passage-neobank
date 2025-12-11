/**
 * Base error class for all Passage SDK errors
 */
export class PassageError extends Error {
  /** HTTP status code (if applicable) */
  readonly statusCode?: number;
  /** API error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR') */
  readonly errorCode?: string;
  /** Request ID for support debugging */
  readonly requestId?: string;
  /** Original error details from API */
  readonly details?: unknown;
  /** Original cause error */
  readonly cause?: Error;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      errorCode?: string;
      requestId?: string;
      details?: unknown;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'PassageError';
    this.statusCode = options?.statusCode;
    this.errorCode = options?.errorCode;
    this.requestId = options?.requestId;
    this.details = options?.details;
    this.cause = options?.cause;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Check if this is a specific error type
   */
  is(errorCode: string): boolean {
    return this.errorCode === errorCode;
  }

  /**
   * Check if error is retryable (5xx or network errors)
   */
  get isRetryable(): boolean {
    if (!this.statusCode) return true; // Network errors are retryable
    return this.statusCode >= 500 || this.statusCode === 429;
  }

  /**
   * Check if error is a client error (4xx)
   */
  get isClientError(): boolean {
    return (
      this.statusCode !== undefined &&
      this.statusCode >= 400 &&
      this.statusCode < 500
    );
  }

  /**
   * Check if error is a server error (5xx)
   */
  get isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500;
  }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends PassageError {
  /** Field-specific validation errors */
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    fields?: Record<string, string[]>,
    options?: {
      requestId?: string;
      details?: unknown;
    }
  ) {
    super(message, {
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      requestId: options?.requestId,
      details: options?.details,
    });
    this.name = 'ValidationError';
    this.fields = fields;
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(field: string): string[] {
    return this.fields?.[field] ?? [];
  }

  /**
   * Check if a specific field has errors
   */
  hasFieldError(field: string): boolean {
    return (this.fields?.[field]?.length ?? 0) > 0;
  }
}

/**
 * Authentication error (invalid or expired API key)
 */
export class AuthenticationError extends PassageError {
  constructor(
    message: string = 'Invalid or expired API key',
    requestId?: string
  ) {
    super(message, {
      statusCode: 401,
      errorCode: 'AUTHENTICATION_ERROR',
      requestId,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (insufficient permissions)
 */
export class AuthorizationError extends PassageError {
  constructor(
    message: string = 'Insufficient permissions for this action',
    requestId?: string
  ) {
    super(message, {
      statusCode: 403,
      errorCode: 'AUTHORIZATION_ERROR',
      requestId,
    });
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends PassageError {
  /** The type of resource that wasn't found */
  readonly resourceType?: string;
  /** The ID that was looked up */
  readonly resourceId?: string;

  constructor(
    message: string,
    options?: {
      resourceType?: string;
      resourceId?: string;
      requestId?: string;
    }
  ) {
    super(message, {
      statusCode: 404,
      errorCode: 'NOT_FOUND',
      requestId: options?.requestId,
    });
    this.name = 'NotFoundError';
    this.resourceType = options?.resourceType;
    this.resourceId = options?.resourceId;
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends PassageError {
  /** When the rate limit resets (Unix timestamp) */
  readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    requestId?: string
  ) {
    super(message, {
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      requestId,
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Conflict error (e.g., duplicate resource, invalid state transition)
 */
export class ConflictError extends PassageError {
  constructor(message: string, requestId?: string) {
    super(message, {
      statusCode: 409,
      errorCode: 'CONFLICT',
      requestId,
    });
    this.name = 'ConflictError';
  }
}

/**
 * Network or connection error
 */
export class NetworkError extends PassageError {
  constructor(message: string = 'Network error', cause?: Error) {
    super(message, {
      errorCode: 'NETWORK_ERROR',
      cause,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Request timeout error
 */
export class TimeoutError extends PassageError {
  constructor(message: string = 'Request timed out', cause?: Error) {
    super(message, {
      errorCode: 'TIMEOUT',
      cause,
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Create appropriate error from API response
 */
export function createErrorFromResponse(
  statusCode: number,
  body: {
    error?: string;
    message?: string;
    code?: string;
    fields?: Record<string, string[]>;
    requestId?: string;
  }
): PassageError {
  const message = body.message || body.error || 'Unknown error';
  const requestId = body.requestId;

  switch (statusCode) {
    case 400:
      if (body.fields) {
        return new ValidationError(message, body.fields, { requestId });
      }
      return new PassageError(message, {
        statusCode: 400,
        errorCode: body.code || 'BAD_REQUEST',
        requestId,
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
      return new RateLimitError(message, undefined, requestId);

    default:
      return new PassageError(message, {
        statusCode,
        errorCode: body.code || `HTTP_${statusCode}`,
        requestId,
        details: body,
      });
  }
}
