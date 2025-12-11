import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { hybridEncrypt } from '../../src/crypto/encrypt';
import {
  hybridDecrypt,
  decryptOfferDetails,
  decryptOffers,
} from '../../src/crypto/decrypt';
import type { HybridEncryptedPayload } from '../../src/crypto/types';

describe('crypto/decrypt', () => {
  let testKeyPair: { publicKey: string; privateKey: string };

  beforeAll(() => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    testKeyPair = { publicKey, privateKey };
  });

  describe('hybridDecrypt', () => {
    it('should decrypt data encrypted with hybridEncrypt', () => {
      const plaintext = 'Hello, World!';
      const encrypted = hybridEncrypt(plaintext, testKeyPair.publicKey);
      const decrypted = hybridDecrypt(
        JSON.stringify(encrypted),
        testKeyPair.privateKey
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle UTF-8 characters', () => {
      const plaintext = 'Hello, 世界! 🌍 Émojis & spëcial çharacters';
      const encrypted = hybridEncrypt(plaintext, testKeyPair.publicKey);
      const decrypted = hybridDecrypt(
        JSON.stringify(encrypted),
        testKeyPair.privateKey
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = hybridEncrypt(plaintext, testKeyPair.publicKey);
      const decrypted = hybridDecrypt(
        JSON.stringify(encrypted),
        testKeyPair.privateKey
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', () => {
      const plaintext = 'x'.repeat(100000);
      const encrypted = hybridEncrypt(plaintext, testKeyPair.publicKey);
      const decrypted = hybridDecrypt(
        JSON.stringify(encrypted),
        testKeyPair.privateKey
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON data roundtrip', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        ssn: '123-45-6789',
        address: { street: '123 Main St', city: 'SF' },
      };
      const plaintext = JSON.stringify(data);
      const encrypted = hybridEncrypt(plaintext, testKeyPair.publicKey);
      const decrypted = hybridDecrypt(
        JSON.stringify(encrypted),
        testKeyPair.privateKey
      );

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should throw with wrong private key', () => {
      const { privateKey: wrongKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const encrypted = hybridEncrypt('secret', testKeyPair.publicKey);

      expect(() =>
        hybridDecrypt(JSON.stringify(encrypted), wrongKey)
      ).toThrow();
    });

    it('should throw with tampered ciphertext', () => {
      const encrypted = hybridEncrypt('secret', testKeyPair.publicKey);

      // Tamper with the encrypted data
      const tamperedData = Buffer.from(encrypted.encryptedData, 'base64');
      tamperedData[0] ^= 0xff;
      encrypted.encryptedData = tamperedData.toString('base64');

      expect(() =>
        hybridDecrypt(JSON.stringify(encrypted), testKeyPair.privateKey)
      ).toThrow();
    });

    it('should throw with tampered auth tag', () => {
      const encrypted = hybridEncrypt('secret', testKeyPair.publicKey);

      // Tamper with the auth tag
      const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedTag[0] ^= 0xff;
      encrypted.authTag = tamperedTag.toString('base64');

      expect(() =>
        hybridDecrypt(JSON.stringify(encrypted), testKeyPair.privateKey)
      ).toThrow();
    });

    it('should throw with invalid JSON payload', () => {
      expect(() =>
        hybridDecrypt('not valid json', testKeyPair.privateKey)
      ).toThrow();
    });

    it('should throw with missing payload fields', () => {
      const incompletePayload = { encryptedData: 'abc', encryptedKey: 'def' };
      expect(() =>
        hybridDecrypt(JSON.stringify(incompletePayload), testKeyPair.privateKey)
      ).toThrow();
    });
  });

  describe('decryptOfferDetails', () => {
    const createEncryptedOffer = (offerData: object) => {
      const plaintext = JSON.stringify(offerData);
      const encrypted = hybridEncrypt(plaintext, testKeyPair.publicKey);
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(plaintext)
        .digest('hex');
      return {
        encryptedPayload: JSON.stringify(encrypted),
        expectedChecksum,
      };
    };

    it('should decrypt and verify offer details with matching checksum', () => {
      const offerData = {
        apr: '12.99%',
        interestRate: '10.5%',
        termMonths: 36,
        monthlyPayment: '$325.00',
        totalRepayment: '$11,700.00',
      };

      const { encryptedPayload, expectedChecksum } =
        createEncryptedOffer(offerData);
      const result = decryptOfferDetails(
        encryptedPayload,
        expectedChecksum,
        testKeyPair.privateKey
      );

      expect(result.verified).toBe(true);
      expect(result.data.apr).toBe('12.99%');
      expect(result.data.interestRate).toBe('10.5%');
      expect(result.data.termMonths).toBe(36);
      expect(result.data.monthlyPayment).toBe('$325.00');
      expect(result.checksum).toBe(expectedChecksum);
    });

    it('should return verified=false when checksum does not match', () => {
      const offerData = { apr: '12.99%', termMonths: 36 };
      const { encryptedPayload } = createEncryptedOffer(offerData);

      const wrongChecksum = 'a'.repeat(64);
      const result = decryptOfferDetails(
        encryptedPayload,
        wrongChecksum,
        testKeyPair.privateKey
      );

      expect(result.verified).toBe(false);
      expect(result.data.apr).toBe('12.99%'); // Data still decrypted
      expect(result.checksum).not.toBe(wrongChecksum);
    });

    it('should handle offer with optional fields', () => {
      const offerData = {
        apr: '15.00%',
        interestRate: '12.0%',
        termMonths: 24,
        monthlyPayment: '$450.00',
        totalRepayment: '$10,800.00',
        originationFee: '$200.00',
        originationFeePercent: '2%',
        prepaymentPenalty: false,
        latePaymentFee: '$25.00',
        customField: 'some lender-specific data',
      };

      const { encryptedPayload, expectedChecksum } =
        createEncryptedOffer(offerData);
      const result = decryptOfferDetails(
        encryptedPayload,
        expectedChecksum,
        testKeyPair.privateKey
      );

      expect(result.verified).toBe(true);
      expect(result.data.originationFee).toBe('$200.00');
      expect(result.data.prepaymentPenalty).toBe(false);
      // Lender-specific fields are now in additionalFields
      expect(result.data.additionalFields?.customField).toBe(
        'some lender-specific data'
      );
    });
  });

  describe('decryptOffers', () => {
    const createMockOffer = (id: string, apr: string) => {
      const offerData = { apr, termMonths: 36, monthlyPayment: '$300' };
      const plaintext = JSON.stringify(offerData);
      const encrypted = hybridEncrypt(plaintext, testKeyPair.publicKey);
      return {
        offerId: id,
        encryptedOfferDetailsNeobank: JSON.stringify(encrypted),
        checksumSha256: crypto
          .createHash('sha256')
          .update(plaintext)
          .digest('hex'),
      };
    };

    it('should decrypt multiple offers', () => {
      const offers = [
        createMockOffer('offer_1', '10.00%'),
        createMockOffer('offer_2', '12.50%'),
        createMockOffer('offer_3', '15.00%'),
      ];

      const results = decryptOffers(offers, testKeyPair.privateKey);

      expect(results).toHaveLength(3);
      expect(results[0].verified).toBe(true);
      expect(results[0].details?.apr).toBe('10.00%');
      expect(results[1].details?.apr).toBe('12.50%');
      expect(results[2].details?.apr).toBe('15.00%');
    });

    it('should preserve original offer reference', () => {
      const offers = [createMockOffer('offer_123', '11.00%')];

      const results = decryptOffers(offers, testKeyPair.privateKey);

      expect(results[0].offer).toBe(offers[0]);
      expect(results[0].offer.offerId).toBe('offer_123');
    });

    it('should handle decryption failures gracefully', () => {
      const validOffer = createMockOffer('valid', '10.00%');
      const invalidOffer = {
        offerId: 'invalid',
        encryptedOfferDetailsNeobank: 'not valid encrypted data',
        checksumSha256: 'abc123',
      };

      const results = decryptOffers(
        [validOffer, invalidOffer],
        testKeyPair.privateKey
      );

      expect(results).toHaveLength(2);

      // Valid offer should succeed
      expect(results[0].verified).toBe(true);
      expect(results[0].details?.apr).toBe('10.00%');
      expect(results[0].error).toBeUndefined();

      // Invalid offer should fail gracefully
      expect(results[1].verified).toBe(false);
      expect(results[1].details).toBeNull();
      expect(results[1].error).toBeDefined();
      expect(typeof results[1].error).toBe('string');
    });

    it('should return empty array for empty offers list', () => {
      const results = decryptOffers([], testKeyPair.privateKey);
      expect(results).toEqual([]);
    });

    it('should mark offers with wrong checksum as unverified', () => {
      const offer = createMockOffer('offer_1', '10.00%');
      offer.checksumSha256 = 'wrong_checksum_' + '0'.repeat(50);

      const results = decryptOffers([offer], testKeyPair.privateKey);

      expect(results[0].verified).toBe(false);
      expect(results[0].details?.apr).toBe('10.00%'); // Still decrypted
      expect(results[0].error).toBeUndefined(); // Not an error, just unverified
    });
  });
});
