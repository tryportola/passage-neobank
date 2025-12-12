import { P as PassageError } from '../errors-DgbLNkc1.js';

/**
 * Webhook event types
 *
 * These types match the actual events sent by the Passage API.
 * @see packages/shared/src/validators/webhook-payloads.ts for source of truth
 */
type WebhookEventType = 'application.created' | 'application.routed' | 'application.approved' | 'application.rejected' | 'application.declined' | 'offer.received' | 'offer.accepted' | 'offer.rejected' | 'prequal_offer.received' | 'prequal_offer.accepted' | 'final_offer.received' | 'final_offer.required' | 'final_offer.accepted' | 'esign.required' | 'esign.completed' | 'signing.ready' | 'signing.completed' | 'kyc.attestation_available' | 'funding.initiated' | 'funding.completed' | 'funding.failed' | 'funding.required' | 'funding.disbursing' | 'funding.disbursed' | 'funding.declined' | 'funding.insufficient_balance' | 'loan.created' | 'loan.creation_failed' | 'loan.repayment_address_ready' | 'loan.repayment_received' | 'loan.paid_off' | 'loan.status_changed' | 'loan.infrastructure_failed' | 'test';
/**
 * Base webhook event structure
 */
interface WebhookEvent<T = unknown> {
    /** Unique event ID */
    id: string;
    /** Event type */
    event: WebhookEventType;
    /** Event payload */
    data: T;
    /** ISO 8601 timestamp */
    timestamp: string;
    /** API version that generated this event */
    version?: string;
    /** Correlation ID for tracing */
    correlationId?: string;
}
/**
 * application.created - Application created and routed to lenders
 */
interface ApplicationCreatedData {
    applicationId: string;
    productType: string;
    routedAt: string;
    metadata?: Record<string, unknown>;
}
/**
 * application.routed - Application routed to specific lenders
 */
interface ApplicationRoutedData {
    applicationId: string;
    lenderIds: string[];
    routedAt: string;
}
/**
 * application.approved - Application approved for funding
 */
interface ApplicationApprovedData {
    applicationId: string;
    approvedAt: string;
    status: 'APPROVED';
    fundingAmount?: string;
}
/**
 * application.rejected - Application rejected by lender
 */
interface ApplicationRejectedData {
    applicationId: string;
    rejectedAt: string;
    reason?: string;
    status: 'REJECTED';
}
/**
 * application.declined - Lender declined after hard pull
 */
interface ApplicationDeclinedData {
    applicationId: string;
    lenderId: string;
    declinedAt: string;
}
/**
 * offer.received - Lender submitted an offer
 */
interface OfferReceivedData {
    applicationId: string;
    offerId: string;
    lenderId: string;
    loanAmount: string;
    interestRate: string;
    monthlyPayment: string;
    termMonths?: number;
    expiresAt: string;
}
/**
 * offer.accepted - Offer accepted by neobank
 */
interface OfferAcceptedData {
    applicationId: string;
    offerId: string;
    lenderId: string;
    acceptedAt: string;
}
/**
 * offer.rejected - Offer rejected (another offer accepted)
 */
interface OfferRejectedData {
    applicationId: string;
    offerId?: string;
    rejectedAt: string;
    reason?: string;
    status: 'REJECTED';
    timestamp: string;
}
/**
 * prequal_offer.received - Prequalified offers received from lender
 */
interface PrequalOfferReceivedData {
    applicationId: string;
    lenderId: string;
    offerCount: number;
    receivedAt: string;
}
/**
 * prequal_offer.accepted - Prequalified offer accepted
 */
interface PrequalOfferAcceptedData {
    applicationId: string;
    offerId: string;
    lenderId: string;
    acceptedAt: string;
}
/**
 * final_offer.received - Final offers received from lender
 */
interface FinalOfferReceivedData {
    applicationId: string;
    lenderId: string;
    offerCount: number;
    receivedAt: string;
}
/**
 * final_offer.required - Lender needs to submit final offer after hard pull
 */
interface FinalOfferRequiredData {
    applicationId: string;
    lenderId: string;
    acceptedPrequalOfferId: string;
    hardPullConsentAt: string;
}
/**
 * final_offer.accepted - Final offer accepted
 */
interface FinalOfferAcceptedData {
    applicationId: string;
    offerId: string;
    lenderId: string;
    acceptedAt: string;
}
/**
 * esign.required - Documents ready for borrower signature
 */
interface ESignRequiredData {
    applicationId: string;
    documentType: string;
    unsignedDocumentHandle: string;
    action: 'signature_required';
    timestamp: string;
}
/**
 * esign.completed - Documents signed successfully
 */
interface ESignCompletedData {
    applicationId: string;
    documentType: string;
    signedDocumentHandle: string;
    signatureStatus: 'completed';
    timestamp: string;
}
/**
 * signing.ready - Signing session created
 */
interface SigningReadyData {
    applicationId: string;
    sessionId: string;
    signingUrl: string;
    timestamp: string;
}
/**
 * signing.completed - Documents signed by borrower
 */
interface SigningCompletedData {
    applicationId: string;
    signedDocumentHandle: string;
    documentType: 'loan_agreement_signed';
    timestamp: string;
}
/**
 * kyc.attestation_available - KYC documents available for lender review
 */
interface KYCAttestationAvailableData {
    applicationId: string;
    documentType: 'kyc';
    kycDocumentHandle?: string;
    proofDocumentHandle?: string;
    documentsAvailable: true;
    timestamp: string;
}
/**
 * funding.initiated - Lender initiated funding
 */
interface FundingInitiatedData {
    applicationId: string;
    offerId?: string;
    fundingAmount: string;
    initiatedAt: string;
    estimatedCompletionDate?: string;
}
/**
 * funding.completed - Funding completed successfully
 */
interface FundingCompletedData {
    applicationId: string;
    offerId?: string;
    fundingAmount: string;
    completedAt: string;
    transactionReference?: string;
}
/**
 * funding.failed - Funding failed
 */
interface FundingFailedData {
    applicationId: string;
    offerId?: string;
    failedAt: string;
    reason: string;
    errorCode?: string;
}
/**
 * funding.required - Loan signed, funding consent required
 */
interface FundingRequiredData {
    applicationId: string;
    fundingId: string;
    amount: string;
    currency: string;
    signedAt?: string | null;
}
/**
 * funding.disbursing - Disbursement in progress
 */
interface FundingDisbursingData {
    fundingId: string;
    applicationId: string;
    amount: string;
    blockchain?: string | null;
    recipientAddress?: string | null;
    initiatedAt?: string | null;
    bridgeTransferId?: string | null;
}
/**
 * funding.disbursed - Funds sent to borrower wallet
 */
interface FundingDisbursedData {
    fundingId: string;
    applicationId: string;
    amount: string;
    txHash?: string | null;
    blockchain?: string | null;
    completedAt?: string | null;
}
/**
 * funding.declined - Lender declined to fund
 */
interface FundingDeclinedData {
    applicationId: string;
    fundingId: string;
    reason?: string;
}
/**
 * funding.insufficient_balance - Lender wallet insufficient balance
 */
interface FundingInsufficientBalanceData {
    fundingId: string;
    applicationId: string;
    requiredAmount: string;
    availableBalance: string;
    currency: string;
}
/**
 * loan.created - Loan record created after disbursement
 */
interface LoanCreatedData {
    loanId: string;
    fundingId: string;
    applicationId: string;
    principal: string;
    annualRate: string;
    termMonths: number;
    monthlyPayment: string;
    firstPaymentDue: string;
    maturityDate: string;
    repaymentAddress: string | null;
    createdAt: string;
}
/**
 * loan.creation_failed - Loan could not be created
 */
interface LoanCreationFailedData {
    fundingId: string;
    applicationId: string;
    reason: string;
    message: string;
}
/**
 * loan.repayment_address_ready - Repayment address created
 */
interface LoanRepaymentAddressReadyData {
    loanId: string;
    applicationId: string;
    repaymentAddress: string;
    repaymentChain: string;
    createdAt: string;
}
/**
 * loan.repayment_received - Payment received on loan
 */
interface LoanRepaymentReceivedData {
    loanId: string;
    repaymentId: string;
    applicationId: string;
    amount: string;
    currency?: string;
    principalPortion?: string | null;
    interestPortion?: string | null;
    balanceAfter?: string | null;
    depositTxHash: string | null;
    receivedAt: string;
}
/**
 * loan.paid_off - Loan fully repaid
 */
interface LoanPaidOffData {
    loanId: string;
    applicationId: string;
    totalPaid?: string;
    paidOffAt: string;
}
/**
 * loan.status_changed - Loan status changed
 */
interface LoanStatusChangedData {
    loanId: string;
    applicationId: string;
    previousStatus: 'ACTIVE' | 'PAID_OFF' | 'DELINQUENT' | 'DEFAULTED' | 'CLOSED';
    newStatus: 'ACTIVE' | 'PAID_OFF' | 'DELINQUENT' | 'DEFAULTED' | 'CLOSED';
    changedAt: string;
}
/**
 * loan.infrastructure_failed - Failed to create repayment infrastructure
 */
interface LoanInfrastructureFailedData {
    loanId: string;
    applicationId: string;
    error: string | null;
    message: string;
    retryCount?: number;
}
/**
 * test - Test webhook event
 */
interface TestWebhookData {
    message: string;
    timestamp: string;
}

/**
 * Configuration for the webhook handler
 */
interface WebhookHandlerConfig {
    /** Webhook signing secret (starts with whsec_) */
    secret: string;
    /** Tolerance for timestamp validation in seconds (default: 300 = 5 minutes) */
    tolerance?: number;
}
/**
 * Error thrown when webhook signature verification fails
 */
declare class WebhookSignatureError extends PassageError {
    constructor(message: string);
}
/**
 * Webhook handler for verifying and parsing Passage webhooks
 *
 * @example
 * ```typescript
 * import { WebhookHandler } from '@portola/passage-neobank/webhooks';
 *
 * const webhooks = new WebhookHandler({
 *   secret: process.env.WEBHOOK_SECRET!,
 * });
 *
 * // In your webhook endpoint (e.g., Next.js API route)
 * export async function POST(req: Request) {
 *   const body = await req.text();
 *   const signature = req.headers.get('x-passage-signature')!;
 *
 *   try {
 *     const event = webhooks.constructEvent(body, signature);
 *
 *     switch (event.event) {
 *       case 'application.status.changed':
 *         console.log('Application status changed:', event.data);
 *         break;
 *       case 'loan.funded':
 *         console.log('Loan funded:', event.data);
 *         break;
 *     }
 *
 *     return new Response('OK', { status: 200 });
 *   } catch (error) {
 *     if (error instanceof WebhookSignatureError) {
 *       return new Response('Invalid signature', { status: 401 });
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
declare class WebhookHandler {
    private secret;
    private tolerance;
    constructor(config: WebhookHandlerConfig);
    /**
     * Verify signature and construct webhook event
     *
     * @param payload - Raw request body as string
     * @param signature - Value of x-passage-signature header
     * @returns Parsed and verified webhook event
     * @throws WebhookSignatureError if signature is invalid
     */
    constructEvent<T = unknown>(payload: string, signature: string): WebhookEvent<T>;
    /**
     * Verify webhook signature
     *
     * @param payload - Raw request body as string
     * @param signature - Value of x-passage-signature header
     * @throws WebhookSignatureError if signature is invalid
     */
    verifySignature(payload: string, signature: string): void;
    /**
     * Generate test headers for webhook testing
     *
     * Useful for writing unit tests for your webhook handlers.
     *
     * @param payload - The webhook payload to sign
     * @returns Object with x-passage-signature header value
     *
     * @example
     * ```typescript
     * // In your tests
     * const webhooks = new WebhookHandler({ secret: 'test_secret' });
     *
     * const testPayload = JSON.stringify({
     *   id: 'evt_123',
     *   event: 'application.status.changed',
     *   data: { applicationId: 'app_123', newStatus: 'OFFERS_READY' },
     *   timestamp: new Date().toISOString(),
     *   version: '1.0',
     * });
     *
     * const headers = webhooks.generateTestHeaders(testPayload);
     *
     * // Use in your test
     * const response = await fetch('/api/webhooks', {
     *   method: 'POST',
     *   body: testPayload,
     *   headers: {
     *     'Content-Type': 'application/json',
     *     'x-passage-signature': headers['x-passage-signature'],
     *   },
     * });
     * ```
     */
    generateTestHeaders(payload: string): {
        'x-passage-signature': string;
    };
}

export { type ApplicationApprovedData, type ApplicationCreatedData, type ApplicationDeclinedData, type ApplicationRejectedData, type ApplicationRoutedData, type ESignCompletedData, type ESignRequiredData, type FinalOfferAcceptedData, type FinalOfferReceivedData, type FinalOfferRequiredData, type FundingCompletedData, type FundingDeclinedData, type FundingDisbursedData, type FundingDisbursingData, type FundingFailedData, type FundingInitiatedData, type FundingInsufficientBalanceData, type FundingRequiredData, type KYCAttestationAvailableData, type LoanCreatedData, type LoanCreationFailedData, type LoanInfrastructureFailedData, type LoanPaidOffData, type LoanRepaymentAddressReadyData, type LoanRepaymentReceivedData, type LoanStatusChangedData, type OfferAcceptedData, type OfferReceivedData, type OfferRejectedData, type PrequalOfferAcceptedData, type PrequalOfferReceivedData, type SigningCompletedData, type SigningReadyData, type TestWebhookData, type WebhookEvent, type WebhookEventType, WebhookHandler, type WebhookHandlerConfig, WebhookSignatureError };
