/**
 * Cryptographic utilities for the Passage SDK
 *
 * All functions in this module are server-side only (Node.js).
 * Do NOT use these in browser/client-side code.
 *
 * @module crypto
 */

export type {
  HybridEncryptedPayload,
  EncryptedPIIPayload,
  DecryptedOfferDetails,
  DecryptionResult,
} from './types';

export {
  hybridEncrypt,
  checksum,
  encryptPII,
  encryptPIIForLenders,
  encryptDocumentForSDX,
} from './encrypt';

export { hybridDecrypt, decryptOfferDetails, decryptOffers } from './decrypt';
export type { BatchDecryptResult } from './decrypt';
