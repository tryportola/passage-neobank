import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Passage } from '../src/client';
import type { PassageClientConfig } from '../src/config';

// Mock the passage-sdk module
vi.mock('@portola/passage', () => ({
  Configuration: vi.fn().mockImplementation((config) => config),
  ApplicationsApi: vi.fn().mockImplementation(() => ({})),
  OffersApi: vi.fn().mockImplementation(() => ({})),
  LoansApi: vi.fn().mockImplementation(() => ({})),
  EntityDiscoveryApi: vi.fn().mockImplementation(() => ({})),
  NeobankSelfServiceApi: vi.fn().mockImplementation(() => ({})),
  SigningApi: vi.fn().mockImplementation(() => ({})),
  SDXApi: vi.fn().mockImplementation(() => ({})),
  WalletsApi: vi.fn().mockImplementation(() => ({})),
}));

describe('Passage client', () => {
  const validTestKey = 'nb_test_abc123xyz789';
  const validLiveKey = 'nb_live_abc123xyz789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid test API key', () => {
      const client = new Passage({ apiKey: validTestKey });
      expect(client).toBeInstanceOf(Passage);
    });

    it('should initialize with valid live API key', () => {
      const client = new Passage({ apiKey: validLiveKey });
      expect(client).toBeInstanceOf(Passage);
    });

    it('should throw if apiKey is missing', () => {
      expect(() => new Passage({ apiKey: '' })).toThrow('apiKey is required');
      expect(() => new Passage({} as PassageClientConfig)).toThrow('apiKey is required');
    });

    it('should throw if apiKey has invalid prefix', () => {
      expect(() => new Passage({ apiKey: 'invalid_key' })).toThrow(
        'apiKey must start with "nb_test_" (sandbox) or "nb_live_" (production)'
      );
      expect(() => new Passage({ apiKey: 'sk_test_abc123' })).toThrow();
      expect(() => new Passage({ apiKey: 'nb_abc123' })).toThrow();
    });

    it('should auto-detect sandbox environment from test key', () => {
      const client = new Passage({ apiKey: validTestKey });
      expect(client.isSandbox).toBe(true);
      expect(client.isProduction).toBe(false);
    });

    it('should auto-detect production environment from live key', () => {
      const client = new Passage({ apiKey: validLiveKey });
      expect(client.isSandbox).toBe(false);
      expect(client.isProduction).toBe(true);
    });

    it('should respect explicit environment override', () => {
      // Using live key but explicitly setting sandbox
      const client = new Passage({
        apiKey: validLiveKey,
        environment: 'sandbox',
      });
      expect(client.isSandbox).toBe(true);
    });

    it('should initialize all resource clients', () => {
      const client = new Passage({ apiKey: validTestKey });

      expect(client.applications).toBeDefined();
      expect(client.offers).toBeDefined();
      expect(client.loans).toBeDefined();
      expect(client.lenders).toBeDefined();
      expect(client.account).toBeDefined();
      expect(client.signing).toBeDefined();
      expect(client.sdx).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return resolved configuration', () => {
      const client = new Passage({
        apiKey: validTestKey,
        timeout: 5000,
        maxRetries: 5,
      });

      const config = client.getConfig();

      expect(config.apiKey).toBe(validTestKey);
      expect(config.environment).toBe('sandbox');
      expect(config.timeout).toBe(5000);
      expect(config.maxRetries).toBe(5);
      expect(config.debug).toBe(false);
      expect(config.baseUrl).toBe('https://api.tryportola.com/api/v1');
    });

    it('should apply default values', () => {
      const client = new Passage({ apiKey: validTestKey });
      const config = client.getConfig();

      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
      expect(config.debug).toBe(false);
    });

    it('should return immutable copy', () => {
      const client = new Passage({ apiKey: validTestKey });
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should use custom baseUrl when provided', () => {
      const client = new Passage({
        apiKey: validTestKey,
        baseUrl: 'https://custom.api.com',
      });

      expect(client.getConfig().baseUrl).toBe('https://custom.api.com');
    });
  });

  describe('isSandbox / isProduction', () => {
    it('should correctly identify sandbox environment', () => {
      const client = new Passage({
        apiKey: validTestKey,
        environment: 'sandbox',
      });

      expect(client.isSandbox).toBe(true);
      expect(client.isProduction).toBe(false);
    });

    it('should correctly identify production environment', () => {
      const client = new Passage({
        apiKey: validLiveKey,
        environment: 'production',
      });

      expect(client.isSandbox).toBe(false);
      expect(client.isProduction).toBe(true);
    });
  });

  describe('debug mode', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log initialization when debug is true', () => {
      new Passage({ apiKey: validTestKey, debug: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Passage] Initialized client',
        expect.objectContaining({
          environment: 'sandbox',
          baseUrl: 'https://api.tryportola.com/api/v1',
        })
      );
    });

    it('should not log when debug is false', () => {
      new Passage({ apiKey: validTestKey, debug: false });

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not log by default', () => {
      new Passage({ apiKey: validTestKey });

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
