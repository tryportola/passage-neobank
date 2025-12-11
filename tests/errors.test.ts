import { describe, it, expect } from 'vitest';
import {
  PassageError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
  NetworkError,
  TimeoutError,
  createErrorFromResponse,
} from '../src/errors';

describe('errors', () => {
  describe('PassageError', () => {
    it('should create error with message', () => {
      const error = new PassageError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('PassageError');
    });

    it('should include optional properties', () => {
      const error = new PassageError('Error', {
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        requestId: 'req_123',
        details: { foo: 'bar' },
      });

      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
      expect(error.requestId).toBe('req_123');
      expect(error.details).toEqual({ foo: 'bar' });
    });

    it('should include cause error', () => {
      const cause = new Error('Original error');
      const error = new PassageError('Wrapped error', { cause });

      expect(error.cause).toBe(cause);
    });

    describe('is()', () => {
      it('should return true for matching error code', () => {
        const error = new PassageError('Error', { errorCode: 'MY_ERROR' });
        expect(error.is('MY_ERROR')).toBe(true);
      });

      it('should return false for non-matching error code', () => {
        const error = new PassageError('Error', { errorCode: 'MY_ERROR' });
        expect(error.is('OTHER_ERROR')).toBe(false);
      });
    });

    describe('isRetryable', () => {
      it('should be true for 5xx errors', () => {
        expect(new PassageError('Error', { statusCode: 500 }).isRetryable).toBe(true);
        expect(new PassageError('Error', { statusCode: 502 }).isRetryable).toBe(true);
        expect(new PassageError('Error', { statusCode: 503 }).isRetryable).toBe(true);
      });

      it('should be true for 429 rate limit', () => {
        expect(new PassageError('Error', { statusCode: 429 }).isRetryable).toBe(true);
      });

      it('should be false for 4xx errors (except 429)', () => {
        expect(new PassageError('Error', { statusCode: 400 }).isRetryable).toBe(false);
        expect(new PassageError('Error', { statusCode: 401 }).isRetryable).toBe(false);
        expect(new PassageError('Error', { statusCode: 404 }).isRetryable).toBe(false);
      });

      it('should be true for network errors (no status code)', () => {
        expect(new PassageError('Network error').isRetryable).toBe(true);
      });
    });

    describe('isClientError', () => {
      it('should be true for 4xx errors', () => {
        expect(new PassageError('Error', { statusCode: 400 }).isClientError).toBe(true);
        expect(new PassageError('Error', { statusCode: 404 }).isClientError).toBe(true);
        expect(new PassageError('Error', { statusCode: 499 }).isClientError).toBe(true);
      });

      it('should be false for 5xx errors', () => {
        expect(new PassageError('Error', { statusCode: 500 }).isClientError).toBe(false);
      });

      it('should be false for no status code', () => {
        expect(new PassageError('Error').isClientError).toBe(false);
      });
    });

    describe('isServerError', () => {
      it('should be true for 5xx errors', () => {
        expect(new PassageError('Error', { statusCode: 500 }).isServerError).toBe(true);
        expect(new PassageError('Error', { statusCode: 503 }).isServerError).toBe(true);
      });

      it('should be false for 4xx errors', () => {
        expect(new PassageError('Error', { statusCode: 400 }).isServerError).toBe(false);
      });

      it('should be false for no status code', () => {
        expect(new PassageError('Error').isServerError).toBe(false);
      });
    });
  });

  describe('ValidationError', () => {
    it('should have status 400 and VALIDATION_ERROR code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should include field errors', () => {
      const fields = {
        email: ['Invalid email format'],
        age: ['Must be 18 or older', 'Required field'],
      };
      const error = new ValidationError('Validation failed', fields);

      expect(error.fields).toEqual(fields);
    });

    describe('getFieldErrors()', () => {
      it('should return errors for specified field', () => {
        const error = new ValidationError('Error', {
          email: ['Invalid format'],
        });
        expect(error.getFieldErrors('email')).toEqual(['Invalid format']);
      });

      it('should return empty array for unknown field', () => {
        const error = new ValidationError('Error', { email: ['Invalid'] });
        expect(error.getFieldErrors('name')).toEqual([]);
      });

      it('should return empty array when no fields', () => {
        const error = new ValidationError('Error');
        expect(error.getFieldErrors('any')).toEqual([]);
      });
    });

    describe('hasFieldError()', () => {
      it('should return true for field with errors', () => {
        const error = new ValidationError('Error', { email: ['Invalid'] });
        expect(error.hasFieldError('email')).toBe(true);
      });

      it('should return false for field without errors', () => {
        const error = new ValidationError('Error', { email: ['Invalid'] });
        expect(error.hasFieldError('name')).toBe(false);
      });

      it('should return false for empty errors array', () => {
        const error = new ValidationError('Error', { email: [] });
        expect(error.hasFieldError('email')).toBe(false);
      });
    });
  });

  describe('AuthenticationError', () => {
    it('should have status 401 and default message', () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Invalid or expired API key');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Token expired');
      expect(error.message).toBe('Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should have status 403 and default message', () => {
      const error = new AuthorizationError();
      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('AUTHORIZATION_ERROR');
      expect(error.message).toBe('Insufficient permissions for this action');
      expect(error.name).toBe('AuthorizationError');
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404', () => {
      const error = new NotFoundError('Application not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should include resource info', () => {
      const error = new NotFoundError('Not found', {
        resourceType: 'Application',
        resourceId: 'app_123',
      });
      expect(error.resourceType).toBe('Application');
      expect(error.resourceId).toBe('app_123');
    });
  });

  describe('RateLimitError', () => {
    it('should have status 429 and default message', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.name).toBe('RateLimitError');
    });

    it('should include retry after timestamp', () => {
      const retryAfter = Math.floor(Date.now() / 1000) + 60;
      const error = new RateLimitError('Too many requests', retryAfter);
      expect(error.retryAfter).toBe(retryAfter);
    });

    it('should be retryable', () => {
      const error = new RateLimitError();
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('ConflictError', () => {
    it('should have status 409', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('NetworkError', () => {
    it('should have NETWORK_ERROR code and default message', () => {
      const error = new NetworkError();
      expect(error.errorCode).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network error');
      expect(error.name).toBe('NetworkError');
      expect(error.statusCode).toBeUndefined();
    });

    it('should include cause', () => {
      const cause = new Error('ECONNREFUSED');
      const error = new NetworkError('Connection failed', cause);
      expect(error.cause).toBe(cause);
    });

    it('should be retryable', () => {
      const error = new NetworkError();
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('TimeoutError', () => {
    it('should have TIMEOUT code and default message', () => {
      const error = new TimeoutError();
      expect(error.errorCode).toBe('TIMEOUT');
      expect(error.message).toBe('Request timed out');
      expect(error.name).toBe('TimeoutError');
    });

    it('should be retryable', () => {
      const error = new TimeoutError();
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('createErrorFromResponse', () => {
    it('should create ValidationError for 400 with fields', () => {
      const error = createErrorFromResponse(400, {
        message: 'Validation failed',
        fields: { email: ['Invalid'] },
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fields).toEqual({ email: ['Invalid'] });
    });

    it('should create PassageError for 400 without fields', () => {
      const error = createErrorFromResponse(400, {
        message: 'Bad request',
        code: 'INVALID_FORMAT',
      });

      expect(error).toBeInstanceOf(PassageError);
      expect(error).not.toBeInstanceOf(ValidationError);
      expect(error.errorCode).toBe('INVALID_FORMAT');
    });

    it('should create AuthenticationError for 401', () => {
      const error = createErrorFromResponse(401, { message: 'Invalid API key' });
      expect(error).toBeInstanceOf(AuthenticationError);
    });

    it('should create AuthorizationError for 403', () => {
      const error = createErrorFromResponse(403, { message: 'Access denied' });
      expect(error).toBeInstanceOf(AuthorizationError);
    });

    it('should create NotFoundError for 404', () => {
      const error = createErrorFromResponse(404, { message: 'Not found' });
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should create ConflictError for 409', () => {
      const error = createErrorFromResponse(409, { message: 'Duplicate' });
      expect(error).toBeInstanceOf(ConflictError);
    });

    it('should create RateLimitError for 429', () => {
      const error = createErrorFromResponse(429, { message: 'Too many requests' });
      expect(error).toBeInstanceOf(RateLimitError);
    });

    it('should create generic PassageError for other status codes', () => {
      const error = createErrorFromResponse(500, { message: 'Internal error' });
      expect(error).toBeInstanceOf(PassageError);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('HTTP_500');
    });

    it('should use error field if message is not present', () => {
      const error = createErrorFromResponse(400, { error: 'Something broke' });
      expect(error.message).toBe('Something broke');
    });

    it('should default to "Unknown error" if no message', () => {
      const error = createErrorFromResponse(500, {});
      expect(error.message).toBe('Unknown error');
    });

    it('should include requestId', () => {
      const error = createErrorFromResponse(400, {
        message: 'Error',
        requestId: 'req_abc123',
      });
      expect(error.requestId).toBe('req_abc123');
    });
  });
});
