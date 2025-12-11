import { describe, it, expect } from 'vitest';
import { resolveBaseUrl, resolveConfig } from '../src/config';
import type { PassageClientConfig } from '../src/config';

describe('config', () => {
  describe('resolveBaseUrl', () => {
    it('should return custom baseUrl when provided', () => {
      const config: PassageClientConfig = {
        apiKey: 'nb_test_123',
        baseUrl: 'https://custom.api.example.com',
      };

      expect(resolveBaseUrl(config)).toBe('https://custom.api.example.com');
    });

    it('should return default API URL when baseUrl not provided', () => {
      const config: PassageClientConfig = {
        apiKey: 'nb_test_123',
        environment: 'sandbox',
      };

      expect(resolveBaseUrl(config)).toBe('https://api.tryportola.com/api/v1');
    });

    it('should return same URL for sandbox and production (routing by API key)', () => {
      const sandboxConfig: PassageClientConfig = {
        apiKey: 'nb_test_123',
        environment: 'sandbox',
      };

      const prodConfig: PassageClientConfig = {
        apiKey: 'nb_live_123',
        environment: 'production',
      };

      expect(resolveBaseUrl(sandboxConfig)).toBe(resolveBaseUrl(prodConfig));
    });
  });

  describe('resolveConfig', () => {
    it('should apply all default values', () => {
      const config: PassageClientConfig = {
        apiKey: 'nb_test_abc123',
      };

      const resolved = resolveConfig(config);

      expect(resolved.apiKey).toBe('nb_test_abc123');
      expect(resolved.environment).toBe('production'); // Default before client auto-detection
      expect(resolved.baseUrl).toBe('https://api.tryportola.com/api/v1');
      expect(resolved.timeout).toBe(30000);
      expect(resolved.maxRetries).toBe(3);
      expect(resolved.debug).toBe(false);
    });

    it('should preserve explicit values', () => {
      const config: PassageClientConfig = {
        apiKey: 'nb_live_xyz789',
        environment: 'production',
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        maxRetries: 5,
        debug: true,
      };

      const resolved = resolveConfig(config);

      expect(resolved.apiKey).toBe('nb_live_xyz789');
      expect(resolved.environment).toBe('production');
      expect(resolved.baseUrl).toBe('https://custom.api.com');
      expect(resolved.timeout).toBe(60000);
      expect(resolved.maxRetries).toBe(5);
      expect(resolved.debug).toBe(true);
    });

    it('should handle partial configuration', () => {
      const config: PassageClientConfig = {
        apiKey: 'nb_test_partial',
        timeout: 10000,
        // Other fields use defaults
      };

      const resolved = resolveConfig(config);

      expect(resolved.timeout).toBe(10000);
      expect(resolved.maxRetries).toBe(3); // Default
      expect(resolved.debug).toBe(false); // Default
    });

    it('should return new object (not mutate input)', () => {
      const config: PassageClientConfig = {
        apiKey: 'nb_test_123',
      };

      const resolved = resolveConfig(config);

      expect(resolved).not.toBe(config);
      expect(config).not.toHaveProperty('baseUrl');
    });
  });
});
