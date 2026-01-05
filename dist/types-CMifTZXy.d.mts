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
 * Structured fee information from lender
 */
interface OfferFees {
    /** One-time origination fee ($) */
    originationFee?: number;
    /** Processing/application fee ($) */
    processingFee?: number;
    /** Late payment fee ($) */
    lateFee?: number;
    /** Prepayment penalty ($) */
    prepaymentPenalty?: number;
    /** Origination fee as % of loan */
    originationFeePercent?: number;
    /** Prepayment penalty as % */
    prepaymentPenaltyPercent?: number;
    /** Additional custom fees */
    other?: Array<{
        name: string;
        amount: number;
        description?: string;
        type: 'fixed' | 'percent';
    }>;
}
/**
 * Decrypted offer details from a lender
 *
 * Contains standard loan offer fields. Lender-specific fields
 * are available in `additionalFields`.
 */
interface DecryptedOfferDetails {
    apr?: string;
    interestRate: string;
    term: number;
    monthlyPayment: string;
    totalRepayment?: string;
    /** Structured fee breakdown from lender */
    fees?: OfferFees | null;
    /** Lender-specific offer metadata */
    offerDetails?: Record<string, unknown>;
    /**
     * @deprecated Use `fees.originationFee` instead. Kept for backwards compatibility.
     */
    originationFee?: string;
    /**
     * @deprecated Use `fees.originationFeePercent` instead. Kept for backwards compatibility.
     */
    originationFeePercent?: string;
    /**
     * @deprecated Use `fees.prepaymentPenalty` instead. Kept for backwards compatibility.
     */
    prepaymentPenalty?: boolean;
    /**
     * @deprecated Use `fees.lateFee` instead. Kept for backwards compatibility.
     */
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

export type { DecryptionResult as D, EncryptedPIIPayload as E, HybridEncryptedPayload as H, OfferFees as O, DecryptedOfferDetails as a };
