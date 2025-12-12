import { H as HybridEncryptedPayload, E as EncryptedPIIPayload, a as DecryptionResult, D as DecryptedOfferDetails } from '../types-BYrBoKhR.mjs';
export { O as OfferFees } from '../types-BYrBoKhR.mjs';

/**
 * Encrypt data using hybrid encryption (AES-256-GCM + RSA-OAEP)
 *
 * @param data - Data to encrypt (string or Buffer)
 * @param publicKeyPem - RSA public key in PEM format
 * @returns HybridEncryptedPayload with base64-encoded components
 */
declare function hybridEncrypt(data: string | Buffer, publicKeyPem: string): HybridEncryptedPayload;
/**
 * Calculate SHA-256 checksum of data
 *
 * @param data - Data to hash
 * @returns Hex-encoded SHA-256 hash
 */
declare function checksum(data: string | Buffer): string;
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
declare function encryptPII(lenderId: string, lenderPublicKey: string, piiData: Record<string, unknown>): EncryptedPIIPayload;
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
declare function encryptPIIForLenders(lenders: Array<{
    lenderId: string;
    publicKey: string;
}>, piiData: Record<string, unknown>): EncryptedPIIPayload[];
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
declare function encryptDocumentForSDX(document: Buffer, publicKey: string): Buffer;

/**
 * Decrypt data encrypted with hybrid encryption (AES-256-GCM + RSA-OAEP)
 *
 * @param encryptedPayloadJson - JSON string containing the HybridEncryptedPayload
 * @param privateKeyPem - Your neobank's private key in PEM format
 * @returns Decrypted string data
 *
 * @example
 * ```typescript
 * import { hybridDecrypt } from '@portola/passage-neobank/crypto';
 *
 * const decrypted = hybridDecrypt(
 *   offer.encryptedOfferDetailsNeobank,
 *   process.env.NEOBANK_PRIVATE_KEY!
 * );
 * const offerDetails = JSON.parse(decrypted);
 * console.log(offerDetails.apr); // '12.99%'
 * ```
 */
declare function hybridDecrypt(encryptedPayloadJson: string, privateKeyPem: string): string;
declare function decryptOfferDetails(encryptedPayload: string, expectedChecksum: string, privateKeyPem: string): DecryptionResult<DecryptedOfferDetails>;
/**
 * Result of batch offer decryption
 */
type BatchDecryptResult<T> = {
    offer: T;
    details: DecryptedOfferDetails;
    verified: boolean;
    error?: undefined;
} | {
    offer: T;
    details: null;
    verified: false;
    error: string;
};
/**
 * Batch decrypt multiple offers
 *
 * Convenience function to decrypt all offers at once.
 *
 * @param offers - Array of offers with encryptedOfferDetailsNeobank and checksumSha256
 * @param privateKeyPem - Your neobank's private key in PEM format
 * @returns Array of decryption results with original offer reference
 *
 * @example
 * ```typescript
 * import { decryptOffers } from '@portola/passage-neobank/crypto';
 *
 * const offersResponse = await passage.offers.getPrequalified(applicationId);
 * const allOffers = offersResponse.lenders.flatMap(l => l.offers);
 *
 * const decryptedOffers = decryptOffers(allOffers, process.env.NEOBANK_PRIVATE_KEY!);
 *
 * // Filter to only successfully decrypted offers and sort by APR
 * const validOffers = decryptedOffers
 *   .filter((o): o is typeof o & { details: DecryptedOfferDetails } => o.details !== null && o.verified)
 *   .sort((a, b) => parseFloat(a.details.apr) - parseFloat(b.details.apr));
 *
 * // Log any decryption errors
 * decryptedOffers
 *   .filter(o => o.error)
 *   .forEach(o => console.warn(`Failed to decrypt offer: ${o.error}`));
 *
 * console.log(`Best APR: ${validOffers[0]?.details.apr}`);
 * ```
 */
declare function decryptOffers<T extends {
    encryptedOfferDetailsNeobank: string;
    checksumSha256: string;
}>(offers: T[], privateKeyPem: string): Array<BatchDecryptResult<T>>;

export { type BatchDecryptResult, DecryptedOfferDetails, DecryptionResult, EncryptedPIIPayload, HybridEncryptedPayload, checksum, decryptOfferDetails, decryptOffers, encryptDocumentForSDX, encryptPII, encryptPIIForLenders, hybridDecrypt, hybridEncrypt };
