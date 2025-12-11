import type { AxiosResponse } from 'axios';
import type { ResolvedConfig } from '../config';
import type { Pagination } from '../types';
import {
  PassageError,
  NetworkError,
  TimeoutError,
  createErrorFromResponse,
} from '../errors';

/**
 * Standard API response envelope structure
 * All SDK-generated response types follow this pattern: { success: boolean, data: T }
 */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
}

/**
 * Type helper to extract the data type from a response envelope
 * E.g., ExtractData<ApplicationResponse> = ApplicationResponseData
 */
type ExtractData<T> = T extends { data: infer D } ? D : never;

/**
 * Unwrap a standard API response, extracting the data property.
 *
 * The generated SDK response types already include the envelope structure,
 * so this function extracts response.data.data with full type safety.
 *
 * @example
 * // response is AxiosResponse<ApplicationResponse>
 * // ApplicationResponse = { success: boolean, data: ApplicationResponseData }
 * const data = unwrapResponse(response);
 * // data is ApplicationResponseData
 */
export function unwrapResponse<TResponse extends { success: boolean; data: unknown }>(
  response: AxiosResponse<TResponse>
): ExtractData<TResponse> {
  const envelope = response.data;

  if (!envelope.success) {
    const errorEnvelope = envelope as ApiEnvelope<unknown>;
    throw new PassageError(errorEnvelope.message || errorEnvelope.error || 'Request failed', {
      errorCode: errorEnvelope.code,
      requestId: errorEnvelope.requestId,
    });
  }

  return envelope.data as ExtractData<TResponse>;
}

/**
 * Unwrap a paginated API response
 *
 * Note: Pagination info is at the same level as data in the envelope,
 * not nested inside the data object.
 */
export function unwrapPaginatedResponse<TResponse extends { success: boolean; data: unknown }>(
  response: AxiosResponse<TResponse & { pagination?: Pagination }>
): { data: ExtractData<TResponse>; pagination?: Pagination } {
  const envelope = response.data;

  if (!envelope.success) {
    const errorEnvelope = envelope as ApiEnvelope<unknown>;
    throw new PassageError(errorEnvelope.message || errorEnvelope.error || 'Request failed', {
      errorCode: errorEnvelope.code,
      requestId: errorEnvelope.requestId,
    });
  }

  return {
    data: envelope.data as ExtractData<TResponse>,
    pagination: envelope.pagination,
  };
}

/**
 * Base class for all resource clients
 */
export abstract class BaseResource {
  protected config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  /**
   * Execute an API call with retry logic and error handling
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;
    const maxRetries = this.config.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Convert axios errors to PassageErrors
        const passageError = this.convertError(error, operationName);

        // Don't retry client errors (4xx except 429)
        if (passageError.isClientError && passageError.statusCode !== 429) {
          throw passageError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw passageError;
        }

        // Log retry in debug mode
        if (this.config.debug) {
          console.log(
            `[Passage] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`,
            passageError.message
          );
        }

        // Exponential backoff: 100ms, 200ms, 400ms, ...
        const delay = Math.min(100 * Math.pow(2, attempt), 10000);
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError || new PassageError('Unknown error');
  }

  /**
   * Convert various error types to PassageError
   */
  private convertError(error: unknown, operationName: string): PassageError {
    // Already a PassageError
    if (error instanceof PassageError) {
      return error;
    }

    // Axios error with response
    if (this.isAxiosError(error)) {
      if (error.response) {
        const { status, data } = error.response;
        return createErrorFromResponse(status, data || {});
      }

      // Network error (no response)
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return new TimeoutError(`${operationName} timed out`, error as Error);
      }

      return new NetworkError(`${operationName} failed: ${error.message}`, error as Error);
    }

    // Generic error
    if (error instanceof Error) {
      return new PassageError(`${operationName} failed: ${error.message}`, {
        cause: error,
      });
    }

    // Unknown error type
    return new PassageError(`${operationName} failed with unknown error`);
  }

  /**
   * Type guard for axios errors
   */
  private isAxiosError(error: unknown): error is {
    response?: { status: number; data: unknown };
    code?: string;
    message?: string;
  } {
    return (
      typeof error === 'object' &&
      error !== null &&
      ('response' in error || 'code' in error || 'isAxiosError' in error)
    );
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log debug message if debug mode is enabled
   */
  protected debug(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[Passage] ${message}`, ...args);
    }
  }
}
