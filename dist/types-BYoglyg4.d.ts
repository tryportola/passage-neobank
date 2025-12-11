/**
 * Hybrid encryption payload structure
 */
interface HybridEncryptedPayload {
    /** Base64-encoded AES-encrypted ciphertext */
    encryptedData: string;
    /** Base64-encoded RSA-encrypted AES key */
    encryptedKey: string;
    /** Base64-encoded 12-byte IV */
    iv: string;
    /** Base64-encoded 16-byte GCM auth tag */
    authTag: string;
}
/**
 * Encrypted PII payload for a single lender
 */
interface EncryptedPIIPayload {
    /** Target lender ID */
    lenderId: string;
    /** JSON-stringified HybridEncryptedPayload */
    encryptedData: string;
}
/**
 * Decrypted offer details from a lender
 *
 * Contains standard loan offer fields. Lender-specific fields
 * are available in `additionalFields`.
 */
interface DecryptedOfferDetails {
    apr: string;
    interestRate: string;
    termMonths: number;
    monthlyPayment: string;
    totalRepayment: string;
    originationFee?: string;
    originationFeePercent?: string;
    prepaymentPenalty?: boolean;
    latePaymentFee?: string;
    /**
     * Lender-specific fields that vary by lender.
     * Access via `offer.additionalFields?.customField`
     */
    additionalFields?: Record<string, unknown>;
}
/**
 * Result of decryption with integrity verification
 */
interface DecryptionResult<T = unknown> {
    /** The decrypted data */
    data: T;
    /** Calculated checksum of decrypted data */
    checksum: string;
    /** Whether checksum matches expected value */
    verified: boolean;
}

export type { DecryptedOfferDetails as D, EncryptedPIIPayload as E, HybridEncryptedPayload as H, DecryptionResult as a };
