/**
 * Base error class for all Passage SDK errors
 */
declare class PassageError extends Error {
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
    constructor(message: string, options?: {
        statusCode?: number;
        errorCode?: string;
        requestId?: string;
        details?: unknown;
        cause?: Error;
    });
    /**
     * Check if this is a specific error type
     */
    is(errorCode: string): boolean;
    /**
     * Check if error is retryable (5xx or network errors)
     */
    get isRetryable(): boolean;
    /**
     * Check if error is a client error (4xx)
     */
    get isClientError(): boolean;
    /**
     * Check if error is a server error (5xx)
     */
    get isServerError(): boolean;
}
/**
 * Validation error with field-level details
 */
declare class ValidationError extends PassageError {
    /** Field-specific validation errors */
    readonly fields?: Record<string, string[]>;
    constructor(message: string, fields?: Record<string, string[]>, options?: {
        requestId?: string;
        details?: unknown;
    });
    /**
     * Get errors for a specific field
     */
    getFieldErrors(field: string): string[];
    /**
     * Check if a specific field has errors
     */
    hasFieldError(field: string): boolean;
}
/**
 * Authentication error (invalid or expired API key)
 */
declare class AuthenticationError extends PassageError {
    constructor(message?: string, requestId?: string);
}
/**
 * Authorization error (insufficient permissions)
 */
declare class AuthorizationError extends PassageError {
    constructor(message?: string, requestId?: string);
}
/**
 * Resource not found error
 */
declare class NotFoundError extends PassageError {
    /** The type of resource that wasn't found */
    readonly resourceType?: string;
    /** The ID that was looked up */
    readonly resourceId?: string;
    constructor(message: string, options?: {
        resourceType?: string;
        resourceId?: string;
        requestId?: string;
    });
}
/**
 * Rate limit exceeded error
 */
declare class RateLimitError extends PassageError {
    /** When the rate limit resets (Unix timestamp) */
    readonly retryAfter?: number;
    constructor(message?: string, retryAfter?: number, requestId?: string);
}
/**
 * Conflict error (e.g., duplicate resource, invalid state transition)
 */
declare class ConflictError extends PassageError {
    constructor(message: string, requestId?: string);
}
/**
 * Network or connection error
 */
declare class NetworkError extends PassageError {
    constructor(message?: string, cause?: Error);
}
/**
 * Request timeout error
 */
declare class TimeoutError extends PassageError {
    constructor(message?: string, cause?: Error);
}

export { AuthenticationError as A, ConflictError as C, NotFoundError as N, PassageError as P, RateLimitError as R, TimeoutError as T, ValidationError as V, AuthorizationError as a, NetworkError as b };
