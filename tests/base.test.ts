import { describe, it, expect } from 'vitest';
import type { AxiosResponse } from 'axios';
import { unwrapResponse, unwrapPaginatedResponse } from '../src/resources/base';
import { PassageError } from '../src/errors';

// Helper to create mock AxiosResponse
function mockResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };
}

describe('base resource helpers', () => {
  describe('unwrapResponse', () => {
    it('should extract data from successful response', () => {
      const response = mockResponse({
        success: true,
        data: { id: 'app_123', status: 'submitted' },
      });

      const result = unwrapResponse(response);

      expect(result).toEqual({ id: 'app_123', status: 'submitted' });
    });

    it('should handle nested data objects', () => {
      const response = mockResponse({
        success: true,
        data: {
          application: { id: 'app_123' },
          offers: [{ id: 'off_1' }, { id: 'off_2' }],
        },
      });

      const result = unwrapResponse(response);

      expect(result.application.id).toBe('app_123');
      expect(result.offers).toHaveLength(2);
    });

    it('should throw PassageError for unsuccessful response', () => {
      const response = mockResponse({
        success: false,
        data: null,
        message: 'Application not found',
        code: 'NOT_FOUND',
        requestId: 'req_123',
      });

      expect(() => unwrapResponse(response)).toThrow(PassageError);

      try {
        unwrapResponse(response);
      } catch (error) {
        expect(error).toBeInstanceOf(PassageError);
        const passageError = error as PassageError;
        expect(passageError.message).toBe('Application not found');
        expect(passageError.errorCode).toBe('NOT_FOUND');
        expect(passageError.requestId).toBe('req_123');
      }
    });

    it('should use error field as message fallback', () => {
      const response = mockResponse({
        success: false,
        data: null,
        error: 'VALIDATION_ERROR',
      });

      expect(() => unwrapResponse(response)).toThrow('VALIDATION_ERROR');
    });

    it('should use generic message when no error info provided', () => {
      const response = mockResponse({
        success: false,
        data: null,
      });

      expect(() => unwrapResponse(response)).toThrow('Request failed');
    });
  });

  describe('unwrapPaginatedResponse', () => {
    it('should extract data and pagination', () => {
      const response = mockResponse({
        success: true,
        data: {
          applications: [{ id: 'app_1' }, { id: 'app_2' }],
          pagination: {
            total: 100,
            limit: 10,
            offset: 0,
            hasMore: true,
          },
        },
      });

      const result = unwrapPaginatedResponse(response);

      expect(result.data.applications).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 100,
        limit: 10,
        offset: 0,
        hasMore: true,
      });
    });

    it('should handle response without pagination', () => {
      const response = mockResponse({
        success: true,
        data: {
          items: [{ id: '1' }],
        },
      });

      const result = unwrapPaginatedResponse(response);

      expect(result.data.items).toHaveLength(1);
      expect(result.pagination).toBeUndefined();
    });

    it('should throw PassageError for unsuccessful response', () => {
      const response = mockResponse({
        success: false,
        data: null,
        message: 'Unauthorized',
      });

      expect(() => unwrapPaginatedResponse(response)).toThrow(PassageError);
    });

    it('should preserve all data fields alongside pagination', () => {
      const response = mockResponse({
        success: true,
        data: {
          loans: [{ id: 'loan_1' }],
          summary: { totalCount: 50 },
          pagination: { total: 50, limit: 10, offset: 0 },
        },
      });

      const result = unwrapPaginatedResponse(response);

      expect(result.data.loans).toHaveLength(1);
      expect(result.data.summary).toEqual({ totalCount: 50 });
      expect(result.pagination).toBeDefined();
    });
  });
});
