import type { EntityDiscoveryApi } from '@portola/passage';
import type { LenderListResponse } from '@portola/passage';
import type { ResolvedConfig } from '../config';
import type { Lender, LenderListParams } from '../types';
import { BaseResource, unwrapResponse } from './base';

/**
 * Resource for discovering available lenders
 */
export class LendersResource extends BaseResource {
  private api: EntityDiscoveryApi;

  constructor(api: EntityDiscoveryApi, config: ResolvedConfig) {
    super(config);
    this.api = api;
  }

  /**
   * List available lenders with optional filtering
   *
   * Returns lenders that support the specified product type and state.
   * Each lender includes their public key needed for PII encryption.
   *
   * @example
   * ```typescript
   * // Get lenders for personal loans in California
   * const lenders = await passage.lenders.list({
   *   productType: 'personal',
   *   stateCode: 'CA',
   * });
   *
   * // Use lender public keys for encryption
   * for (const lender of lenders) {
   *   console.log(`${lender.name}: supports ${lender.supportedProducts.join(', ')}`);
   * }
   * ```
   */
  async list(params?: LenderListParams): Promise<Lender[]> {
    return this.execute(async () => {
      this.debug('lenders.list', params);

      const response = await this.api.listLenders({
        productType: params?.productType,
        stateCode: params?.stateCode,
      });

      // Response is AxiosResponse<LenderListResponse>
      // LenderListResponse = { success: boolean, data: { lenders: LenderListItem[], total: number, ... } }
      const data = unwrapResponse(response);
      return data.lenders;
    }, 'lenders.list');
  }
}
