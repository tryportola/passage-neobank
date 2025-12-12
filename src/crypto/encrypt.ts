import crypto from 'crypto';
import type { HybridEncryptedPayload, EncryptedPIIPayload } from './types';

/**
 * Encrypt data using hybrid encryption (AES-256-GCM + RSA-OAEP)
 *
 * @param data - Data to encrypt (string or Buffer)
 * @param publicKeyPem - RSA public key in PEM format
 * @returns HybridEncryptedPayload with base64-encoded components
 */
export function hybridEncrypt(
  data: string | Buffer,
  publicKeyPem: string
): HybridEncryptedPayload {
  const dataBuffer =
    typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;

  // Generate AES-256 key and 12-byte IV
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // Encrypt with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const encryptedData = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Encrypt AES key with RSA-OAEP
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  return {
    encryptedData: encryptedData.toString('base64'),
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Calculate SHA-256 checksum of data
 *
 * @param data - Data to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function checksum(data: string | Buffer): string {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Create encrypted PII payload for a single lender
 *
 * @param lenderId - The lender's ID
 * @param lenderPublicKey - The lender's RSA public key in PEM format
 * @param piiData - The PII data to encrypt
 * @returns EncryptedPIIPayload ready for API submission
 *
 * @example
 * ```typescript
 * import { encryptPII } from '@portola/passage-neobank/crypto';
 *
 * const lenders = await passage.lenders.list({ productType: 'personal', stateCode: 'CA' });
 *
 * const encryptedPayloads = lenders.map(lender =>
 *   encryptPII(lender.lenderId, lender.publicKey, {
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     ssn: '123-45-6789',
 *     dateOfBirth: '1990-01-15',
 *     address: {
 *       street: '123 Main St',
 *       city: 'San Francisco',
 *       state: 'CA',
 *       zip: '94102',
 *     },
 *   })
 * );
 * ```
 */
export function encryptPII(
  lenderId: string,
  lenderPublicKey: string,
  piiData: Record<string, unknown>
): EncryptedPIIPayload {
  const payload = hybridEncrypt(JSON.stringify(piiData), lenderPublicKey);

  return {
    lenderId,
    // Note: encryptedData is JSON-stringified here because EncryptedPIIPayload.encryptedData
    // is typed as string (for API transport). When parsed, it yields a HybridEncryptedPayload.
    // This double-serialization is intentional to match the API contract.
    encryptedData: JSON.stringify(payload),
  };
}

/**
 * Encrypt PII for multiple lenders at once
 *
 * Convenience function to encrypt the same PII data for multiple lenders.
 *
 * @param lenders - Array of lender info with IDs and public keys
 * @param piiData - The PII data to encrypt
 * @returns Array of EncryptedPIIPayload, one per lender
 *
 * @example
 * ```typescript
 * import { encryptPIIForLenders } from '@portola/passage-neobank/crypto';
 *
 * const lenders = await passage.lenders.list({ productType: 'personal', stateCode: 'CA' });
 *
 * const encryptedPayloads = encryptPIIForLenders(
 *   lenders.map(l => ({ lenderId: l.lenderId, publicKey: l.publicKey })),
 *   borrowerPII
 * );
 *
 * await passage.applications.create({
 *   productType: 'personal',
 *   encryptedPayloads,
 * });
 * ```
 */
export function encryptPIIForLenders(
  lenders: Array<{ lenderId: string; publicKey: string }>,
  piiData: Record<string, unknown>
): EncryptedPIIPayload[] {
  return lenders.map((lender) =>
    encryptPII(lender.lenderId, lender.publicKey, piiData)
  );
}

/**
 * Encrypt a document for SDX upload
 *
 * Returns a binary payload in the format: [4-byte length][metadata JSON][encrypted data]
 *
 * @param document - The document buffer to encrypt
 * @param publicKey - RSA public key in PEM format
 * @returns Buffer ready for SDX upload
 *
 * @example
 * ```typescript
 * import { encryptDocumentForSDX } from '@portola/passage-neobank/crypto';
 * import fs from 'fs';
 *
 * const document = fs.readFileSync('./drivers_license.pdf');
 * const encrypted = encryptDocumentForSDX(document, lender.publicKey);
 *
 * const result = await passage.sdx.upload({
 *   token: uploadToken,
 *   encryptedDocument: encrypted,
 *   filename: 'drivers_license.pdf',
 * });
 * ```
 */
export function encryptDocumentForSDX(
  document: Buffer,
  publicKey: string
): Buffer {
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const encryptedData = Buffer.concat([
    cipher.update(document),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  const metadata = {
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
  const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf-8');

  // Assemble: [4-byte length][metadata][encrypted data]
  const result = Buffer.alloc(4 + metadataBuffer.length + encryptedData.length);
  result.writeUInt32BE(metadataBuffer.length, 0);
  metadataBuffer.copy(result, 4);
  encryptedData.copy(result, 4 + metadataBuffer.length);

  return result;
}
