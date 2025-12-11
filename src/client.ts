import {
  Configuration,
  ApplicationsApi,
  OffersApi,
  LoansApi,
  EntityDiscoveryApi,
  NeobankSelfServiceApi,
  SigningApi,
  SDXApi,
} from '@portola/passage';

import type { PassageClientConfig } from './config';
import { version } from '../package.json';
import { resolveConfig, type ResolvedConfig } from './config';
import { ApplicationsResource } from './resources/applications';
import { OffersResource } from './resources/offers';
import { LoansResource } from './resources/loans';
import { LendersResource } from './resources/lenders';
import { AccountResource } from './resources/account';
import { SigningResource } from './resources/signing';
import { SDXResource } from './resources/sdx';

/**
 * Main Passage SDK client
 *
 * @example
 * ```typescript
 * import { Passage } from '@portola/passage-neobank';
 *
 * const passage = new Passage({
 *   apiKey: process.env.NEOBANK_API_KEY!,
 *   environment: 'sandbox', // or 'production'
 * });
 *
 * // List applications
 * const { applications } = await passage.applications.list();
 *
 * // Get offers
 * const offers = await passage.offers.getPrequalified(applicationId);
 *
 * // Accept an offer
 * await passage.offers.acceptFinal(offerId, {
 *   borrowerWalletAddress: '0x...',
 * });
 * ```
 */
export class Passage {
  private readonly config: ResolvedConfig;
  private readonly sdkConfig: Configuration;

  /** Applications resource - create, list, and manage loan applications */
  public readonly applications: ApplicationsResource;

  /** Offers resource - view and accept loan offers */
  public readonly offers: OffersResource;

  /** Loans resource - view and manage funded loans */
  public readonly loans: LoansResource;

  /** Lenders resource - discover available lenders and their public keys */
  public readonly lenders: LendersResource;

  /** Account resource - manage neobank settings (webhooks, etc.) */
  public readonly account: AccountResource;

  /** Signing resource - manage document signing sessions */
  public readonly signing: SigningResource;

  /** SDX resource - secure document exchange (upload/download encrypted documents) */
  public readonly sdx: SDXResource;

  constructor(config: PassageClientConfig) {
    if (!config.apiKey) {
      throw new Error('Passage: apiKey is required');
    }

    // Validate API key format
    if (
      !config.apiKey.startsWith('nb_test_') &&
      !config.apiKey.startsWith('nb_live_')
    ) {
      throw new Error(
        'Passage: apiKey must start with "nb_test_" (sandbox) or "nb_live_" (production)'
      );
    }

    // Auto-detect environment from API key if not specified
    const environment =
      config.environment ??
      (config.apiKey.startsWith('nb_test_') ? 'sandbox' : 'production');

    this.config = resolveConfig({ ...config, environment });

    // Initialize underlying SDK configuration
    this.sdkConfig = new Configuration({
      basePath: this.config.baseUrl,
      apiKey: this.config.apiKey,
      baseOptions: {
        timeout: this.config.timeout,
        headers: {
          'User-Agent': `passage-neobank/${version}`,
        },
      },
    });

    // Initialize API clients
    const applicationsApi = new ApplicationsApi(this.sdkConfig);
    const offersApi = new OffersApi(this.sdkConfig);
    const loansApi = new LoansApi(this.sdkConfig);
    const entityDiscoveryApi = new EntityDiscoveryApi(this.sdkConfig);
    const selfServiceApi = new NeobankSelfServiceApi(this.sdkConfig);
    const signingApi = new SigningApi(this.sdkConfig);
    const sdxApi = new SDXApi(this.sdkConfig);

    // Initialize resource clients
    this.applications = new ApplicationsResource(applicationsApi, this.config);
    this.offers = new OffersResource(offersApi, this.config);
    this.loans = new LoansResource(loansApi, this.config);
    this.lenders = new LendersResource(entityDiscoveryApi, this.config);
    this.account = new AccountResource(selfServiceApi, this.config);
    this.signing = new SigningResource(signingApi, this.config);
    this.sdx = new SDXResource(sdxApi, this.config);

    if (this.config.debug) {
      console.log('[Passage] Initialized client', {
        environment: this.config.environment,
        baseUrl: this.config.baseUrl,
      });
    }
  }

  /**
   * Get the current configuration (read-only)
   */
  getConfig(): Readonly<ResolvedConfig> {
    return { ...this.config };
  }

  /**
   * Check if connected to sandbox environment
   */
  get isSandbox(): boolean {
    return this.config.environment === 'sandbox';
  }

  /**
   * Check if connected to production environment
   */
  get isProduction(): boolean {
    return this.config.environment === 'production';
  }
}

// Default export for convenience
export default Passage;
