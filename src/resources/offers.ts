import type { OffersApi, FinalOfferAcceptanceResponseData } from '@portola/passage';
import type {
  EncryptedOffersResponse,
  OfferAcceptanceResponse,
} from '@portola/passage';
import type { ResolvedConfig } from '../config';
import type {
  OffersResponse,
  PrequalAcceptParams,
  FinalOfferAcceptParams,
  OfferAcceptanceResponseData,
} from '../types';
import { BaseResource, unwrapResponse } from './base';

/**
 * Resource for managing loan offers
 */
export class OffersResource extends BaseResource {
  private api: OffersApi;

  constructor(api: OffersApi, config: ResolvedConfig) {
    super(config);
    this.api = api;
  }

  /**
   * Get prequalified offers for an application
   *
   * @example
   * ```typescript
   * import { decryptOfferDetails } from '@portola/passage-neobank/crypto';
   *
   * const offers = await passage.offers.getPrequalified(applicationId);
   *
   * for (const lenderGroup of offers.lenders) {
   *   for (const offer of lenderGroup.offers) {
   *     const { data, verified } = decryptOfferDetails(
   *       offer.encryptedOfferDetailsNeobank,
   *       offer.checksumSha256,
   *       process.env.NEOBANK_PRIVATE_KEY!
   *     );
   *
   *     if (verified) {
   *       console.log(`${lenderGroup.lenderName}: ${data.apr} APR`);
   *     }
   *   }
   * }
   * ```
   */
  async getPrequalified(applicationId: string): Promise<OffersResponse> {
    return this.execute(async () => {
      this.debug('offers.getPrequalified', applicationId);

      const response = await this.api.getPrequalOffers({ applicationId });
      // Response is AxiosResponse<EncryptedOffersResponse>
      // EncryptedOffersResponse = { success: boolean, data: EncryptedOffersResponseData }
      return unwrapResponse(response);
    }, 'offers.getPrequalified');
  }

  /**
   * Accept a prequalified offer to proceed to final underwriting
   *
   * Requires hard pull consent from the borrower. This triggers the lender
   * to perform a hard credit pull and submit final offers.
   *
   * @example
   * ```typescript
   * const result = await passage.offers.acceptPrequal(offerId, {
   *   hardPullConsent: {
   *     consented: true,
   *     consentedAt: new Date().toISOString(),
   *     ipAddress: req.ip,
   *     userAgent: req.headers['user-agent'],
   *   },
   *   // Optional: provide wallet for disbursement if not set at application creation
   *   borrowerWallet: {
   *     address: '0x1234...',
   *     chain: 'base',
   *   },
   * });
   * // Application moves to final underwriting
   * ```
   */
  async acceptPrequal(
    offerId: string,
    params: PrequalAcceptParams
  ): Promise<OfferAcceptanceResponseData> {
    return this.execute(async () => {
      this.debug('offers.acceptPrequal', offerId);

      const response = await this.api.acceptPrequalOffer({
        offerId,
        offerAcceptanceRequest: {
          hardPullConsent: params.hardPullConsent,
          communicationPreferences: params.communicationPreferences,
          borrowerWallet: params.borrowerWallet,
          borrowerEmail: params.borrowerEmail,
          borrowerName: params.borrowerName,
          requestedDisbursement: params.requestedDisbursement,
        },
      });

      // Response is AxiosResponse<OfferAcceptanceResponse>
      return unwrapResponse(response);
    }, 'offers.acceptPrequal');
  }

  /**
   * Get final offers for an application (after accepting prequal)
   *
   * @example
   * ```typescript
   * const finalOffers = await passage.offers.getFinal(applicationId);
   * ```
   */
  async getFinal(applicationId: string): Promise<OffersResponse> {
    return this.execute(async () => {
      this.debug('offers.getFinal', applicationId);

      const response = await this.api.getFinalOffers({ applicationId });
      // Response is AxiosResponse<EncryptedOffersResponse>
      return unwrapResponse(response);
    }, 'offers.getFinal');
  }

  /**
   * Accept a final offer to proceed to signing
   *
   * This is the point of no return - the borrower commits to the loan terms.
   * Returns signing session details including the URL to redirect the borrower.
   *
   * Note: hardPullConsent and borrowerWallet should have been provided when
   * accepting the prequalified offer via acceptPrequal().
   *
   * @example
   * ```typescript
   * const result = await passage.offers.acceptFinal(offerId, {
   *   borrowerEmail: 'borrower@example.com',
   *   borrowerName: 'John Doe',
   * });
   *
   * // Redirect borrower to sign documents
   * if (result.signingUrl) {
   *   console.log('Sign at:', result.signingUrl);
   * }
   * ```
   */
  async acceptFinal(
    offerId: string,
    params: FinalOfferAcceptParams = {}
  ): Promise<FinalOfferAcceptanceResponseData> {
    return this.execute(async () => {
      this.debug('offers.acceptFinal', offerId);

      const response = await this.api.acceptFinalOffer({
        offerId,
        finalOfferAcceptanceRequest: {
          borrowerEmail: params.borrowerEmail,
          borrowerName: params.borrowerName,
        },
      });

      // Response is AxiosResponse<FinalOfferAcceptanceResponse>
      return unwrapResponse(response);
    }, 'offers.acceptFinal');
  }
}
