import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import {
  hybridEncrypt,
  checksum,
  encryptPII,
  encryptPIIForLenders,
  encryptDocumentForSDX,
} from '../../src/crypto/encrypt';
import type { HybridEncryptedPayload } from '../../src/crypto/types';

describe('crypto/encrypt', () => {
  let testKeyPair: { publicKey: string; privateKey: string };

  beforeAll(() => {
    // Generate a test RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    testKeyPair = { publicKey, privateKey };
  });

  describe('hybridEncrypt', () => {
    it('should encrypt string data and return base64-encoded components', () => {
      const plaintext = 'Hello, World!';
      const result = hybridEncrypt(plaintext, testKeyPair.publicKey);

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('encryptedKey');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');

      // Verify all components are valid base64
      expect(() => Buffer.from(result.encryptedData, 'base64')).not.toThrow();
      expect(() => Buffer.from(result.encryptedKey, 'base64')).not.toThrow();
      expect(() => Buffer.from(result.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(result.authTag, 'base64')).not.toThrow();
    });

    it('should encrypt Buffer data', () => {
      const plaintext = Buffer.from('Binary data here', 'utf-8');
      const result = hybridEncrypt(plaintext, testKeyPair.publicKey);

      expect(result.encryptedData).toBeDefined();
      expect(result.encryptedKey).toBeDefined();
    });

    it('should generate unique IVs for each encryption', () => {
      const plaintext = 'Same message';
      const result1 = hybridEncrypt(plaintext, testKeyPair.publicKey);
      const result2 = hybridEncrypt(plaintext, testKeyPair.publicKey);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encryptedData).not.toBe(result2.encryptedData);
    });

    it('should generate 12-byte IV (16 chars base64)', () => {
      const result = hybridEncrypt('test', testKeyPair.publicKey);
      const ivBuffer = Buffer.from(result.iv, 'base64');
      expect(ivBuffer.length).toBe(12);
    });

    it('should generate 16-byte auth tag (24 chars base64)', () => {
      const result = hybridEncrypt('test', testKeyPair.publicKey);
      const authTagBuffer = Buffer.from(result.authTag, 'base64');
      expect(authTagBuffer.length).toBe(16);
    });

    it('should handle empty string', () => {
      const result = hybridEncrypt('', testKeyPair.publicKey);
      expect(result.encryptedData).toBeDefined();
    });

    it('should handle large data', () => {
      const largeData = 'x'.repeat(100000);
      const result = hybridEncrypt(largeData, testKeyPair.publicKey);
      expect(result.encryptedData).toBeDefined();
    });

    it('should throw with invalid public key', () => {
      expect(() => hybridEncrypt('test', 'invalid-key')).toThrow();
    });
  });

  describe('checksum', () => {
    it('should return hex-encoded SHA-256 hash for string', () => {
      const result = checksum('hello');
      expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should return hex-encoded SHA-256 hash for Buffer', () => {
      const result = checksum(Buffer.from('hello'));
      expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should return 64-character hex string', () => {
      const result = checksum('any data');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = checksum('input1');
      const hash2 = checksum('input2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for same input', () => {
      const hash1 = checksum('same input');
      const hash2 = checksum('same input');
      expect(hash1).toBe(hash2);
    });
  });

  describe('encryptPII', () => {
    it('should return lenderId and JSON-stringified encrypted payload', () => {
      const piiData = {
        firstName: 'John',
        lastName: 'Doe',
        ssn: '123-45-6789',
      };

      const result = encryptPII('lender_123', testKeyPair.publicKey, piiData);

      expect(result.lenderId).toBe('lender_123');
      expect(typeof result.encryptedData).toBe('string');

      // encryptedData should be parseable JSON containing HybridEncryptedPayload
      const parsed = JSON.parse(result.encryptedData) as HybridEncryptedPayload;
      expect(parsed).toHaveProperty('encryptedData');
      expect(parsed).toHaveProperty('encryptedKey');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('authTag');
    });

    it('should handle complex nested PII data', () => {
      const piiData = {
        firstName: 'John',
        lastName: 'Doe',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
        },
        employment: {
          employer: 'Acme Corp',
          income: 75000,
        },
      };

      const result = encryptPII('lender_123', testKeyPair.publicKey, piiData);
      expect(result.lenderId).toBe('lender_123');
      expect(result.encryptedData).toBeDefined();
    });
  });

  describe('encryptPIIForLenders', () => {
    it('should encrypt PII for multiple lenders', () => {
      const lenders = [
        { lenderId: 'lender_1', publicKey: testKeyPair.publicKey },
        { lenderId: 'lender_2', publicKey: testKeyPair.publicKey },
        { lenderId: 'lender_3', publicKey: testKeyPair.publicKey },
      ];

      const piiData = { firstName: 'John', ssn: '123-45-6789' };
      const results = encryptPIIForLenders(lenders, piiData);

      expect(results).toHaveLength(3);
      expect(results[0].lenderId).toBe('lender_1');
      expect(results[1].lenderId).toBe('lender_2');
      expect(results[2].lenderId).toBe('lender_3');

      // Each should have unique encryption (different IVs)
      const payload0 = JSON.parse(results[0].encryptedData) as HybridEncryptedPayload;
      const payload1 = JSON.parse(results[1].encryptedData) as HybridEncryptedPayload;
      expect(payload0.iv).not.toBe(payload1.iv);
    });

    it('should return empty array for empty lenders list', () => {
      const results = encryptPIIForLenders([], { firstName: 'John' });
      expect(results).toEqual([]);
    });
  });

  describe('encryptDocumentForSDX', () => {
    it('should return buffer with correct format: [length][metadata][encrypted]', () => {
      const document = Buffer.from('PDF document content here');
      const result = encryptDocumentForSDX(document, testKeyPair.publicKey);

      expect(Buffer.isBuffer(result)).toBe(true);

      // Read the 4-byte metadata length
      const metadataLength = result.readUInt32BE(0);
      expect(metadataLength).toBeGreaterThan(0);

      // Extract and parse metadata
      const metadataBuffer = result.subarray(4, 4 + metadataLength);
      const metadata = JSON.parse(metadataBuffer.toString('utf-8'));

      expect(metadata).toHaveProperty('encryptedKey');
      expect(metadata).toHaveProperty('iv');
      expect(metadata).toHaveProperty('authTag');

      // Verify encrypted data exists after metadata
      const encryptedData = result.subarray(4 + metadataLength);
      expect(encryptedData.length).toBeGreaterThan(0);
    });

    it('should handle empty document', () => {
      const document = Buffer.from('');
      const result = encryptDocumentForSDX(document, testKeyPair.publicKey);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(4); // At least length + metadata
    });

    it('should handle large documents', () => {
      const document = Buffer.alloc(1024 * 1024, 'x'); // 1MB
      const result = encryptDocumentForSDX(document, testKeyPair.publicKey);

      expect(Buffer.isBuffer(result)).toBe(true);
      // Encrypted size should be similar to original (AES-GCM has minimal overhead)
      expect(result.length).toBeGreaterThan(document.length);
    });
  });
});
