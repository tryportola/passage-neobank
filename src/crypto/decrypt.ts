import crypto from 'crypto';
import type {
  HybridEncryptedPayload,
  DecryptedOfferDetails,
  DecryptionResult,
  OfferFees,
} from './types';

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
export function hybridDecrypt(
  encryptedPayloadJson: string,
  privateKeyPem: string
): string {
  // Parse and validate the encrypted payload
  let payload: HybridEncryptedPayload;
  try {
    payload = JSON.parse(encryptedPayloadJson);
  } catch {
    throw new Error('Invalid encrypted payload: malformed JSON');
  }

  // Validate required fields
  if (
    typeof payload.encryptedData !== 'string' ||
    typeof payload.encryptedKey !== 'string' ||
    typeof payload.iv !== 'string' ||
    typeof payload.authTag !== 'string'
  ) {
    throw new Error(
      'Invalid encrypted payload: missing required fields (encryptedData, encryptedKey, iv, authTag)'
    );
  }

  // Decode base64 components
  const encryptedKey = Buffer.from(payload.encryptedKey, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const encryptedData = Buffer.from(payload.encryptedData, 'base64');

  // Decrypt AES key with RSA-OAEP
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedKey
  );

  // Decrypt data with AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}

/**
 * Decrypt and verify offer details
 *
 * Decrypts the encrypted offer details and verifies integrity using the checksum.
 *
 * @param encryptedPayload - The encrypted payload from offer.encryptedOfferDetailsNeobank
 * @param expectedChecksum - The checksum from offer.checksumSha256
 * @param privateKeyPem - Your neobank's private key in PEM format
 * @returns DecryptionResult with data, checksum, and verification status
 *
 * @example
 * ```typescript
 * import { decryptOfferDetails } from '@portola/passage-neobank/crypto';
 *
 * const offers = await passage.offers.getPrequalified(applicationId);
 *
 * for (const lenderGroup of offers.lenders) {
 *   for (const offer of lenderGroup.offers) {
 *     const result = decryptOfferDetails(
 *       offer.encryptedOfferDetailsNeobank,
 *       offer.checksumSha256,
 *       process.env.NEOBANK_PRIVATE_KEY!
 *     );
 *
 *     if (!result.verified) {
 *       console.warn(`Offer ${offer.offerId} failed integrity check`);
 *       continue;
 *     }
 *
 *     console.log(`APR: ${result.data.apr}`);
 *     console.log(`Monthly Payment: ${result.data.monthlyPayment}`);
 *   }
 * }
 * ```
 */
/** Known fields in DecryptedOfferDetails (used to separate additionalFields) */
const KNOWN_OFFER_FIELDS = new Set([
  'apr',
  'interestRate',
  'term',
  'monthlyPayment',
  'totalRepayment',
  'originationFee',
  'originationFeePercent',
  'prepaymentPenalty',
  'latePaymentFee',
  'fees',
  'offerDetails',
]);

export function decryptOfferDetails(
  encryptedPayload: string,
  expectedChecksum: string,
  privateKeyPem: string
): DecryptionResult<DecryptedOfferDetails> {
  // Calculate checksum of the ENCRYPTED payload (before decryption)
  // This matches how lenders compute checksums when submitting offers:
  // - Lender encrypts offer details with neobank's public key
  // - Lender computes SHA-256 of the encrypted blob
  // - Neobank verifies the encrypted blob wasn't tampered in transit
  const checksum = crypto
    .createHash('sha256')
    .update(encryptedPayload, 'utf8')
    .digest('hex');

  const decrypted = hybridDecrypt(encryptedPayload, privateKeyPem);
  const rawData = JSON.parse(decrypted) as Record<string, unknown>;

  // Separate known fields from lender-specific additional fields
  const additionalFields: Record<string, unknown> = {};
  for (const key of Object.keys(rawData)) {
    if (!KNOWN_OFFER_FIELDS.has(key)) {
      additionalFields[key] = rawData[key];
    }
  }

  // Extract fees - core API sends as OfferFees or null
  const fees = rawData.fees as OfferFees | null | undefined;

  // Extract offerDetails - lender-specific metadata
  const offerDetailsField = rawData.offerDetails as
    | Record<string, unknown>
    | undefined;

  const data: DecryptedOfferDetails = {
    apr: rawData.apr as string | undefined,
    interestRate: rawData.interestRate as string,
    term: rawData.term as number,
    monthlyPayment: rawData.monthlyPayment as string,
    totalRepayment: rawData.totalRepayment as string | undefined,
    // Include structured fees and offerDetails from core API
    fees: fees,
    offerDetails: offerDetailsField,
    // Keep deprecated flat fields for backwards compatibility
    originationFee: rawData.originationFee as string | undefined,
    originationFeePercent: rawData.originationFeePercent as string | undefined,
    prepaymentPenalty: rawData.prepaymentPenalty as boolean | undefined,
    latePaymentFee: rawData.latePaymentFee as string | undefined,
    ...(Object.keys(additionalFields).length > 0 && { additionalFields }),
  };

  return {
    data,
    checksum,
    verified: checksum === expectedChecksum,
  };
}

/**
 * Result of batch offer decryption
 */
export type BatchDecryptResult<T> =
  | {
      offer: T;
      details: DecryptedOfferDetails;
      verified: boolean;
      error?: undefined;
    }
  | { offer: T; details: null; verified: false; error: string };

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
export function decryptOffers<
  T extends { encryptedOfferDetailsNeobank: string; checksumSha256: string },
>(offers: T[], privateKeyPem: string): Array<BatchDecryptResult<T>> {
  return offers.map((offer) => {
    try {
      const result = decryptOfferDetails(
        offer.encryptedOfferDetailsNeobank,
        offer.checksumSha256,
        privateKeyPem
      );
      return {
        offer,
        details: result.data,
        verified: result.verified,
      };
    } catch (error) {
      // Return null details with error message on decryption failure
      return {
        offer,
        details: null,
        verified: false as const,
        error:
          error instanceof Error ? error.message : 'Unknown decryption error',
      };
    }
  });
}
