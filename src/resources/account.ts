import type { NeobankSelfServiceApi } from '@portola/passage';
import type {
  NeobankAccountResponse,
  WebhookConfigResponse,
  WebhookUrlUpdateResponse,
  WebhookTestResponse,
  WebhookSecretRotateResponse,
} from '@portola/passage';
import type { ResolvedConfig } from '../config';
import type {
  AccountInfo,
  WebhookConfig,
  WebhookTestResponseData,
  WebhookSecretRotateResponseData,
  NeobankStats,
} from '../types';
import { BaseResource, unwrapResponse } from './base';

/**
 * Resource for neobank self-service operations
 */
export class AccountResource extends BaseResource {
  private api: NeobankSelfServiceApi;

  constructor(api: NeobankSelfServiceApi, config: ResolvedConfig) {
    super(config);
    this.api = api;
  }

  /**
   * Get current neobank account information
   *
   * @example
   * ```typescript
   * const info = await passage.account.getInfo();
   * console.log(info.name); // 'My Neobank'
   * console.log(info.environment); // 'sandbox' or 'production'
   * ```
   */
  async getInfo(): Promise<AccountInfo> {
    return this.execute(async () => {
      this.debug('account.getInfo');

      const response = await this.api.getAccountInfo();
      // Response is AxiosResponse<NeobankAccountResponse>
      // NeobankAccountResponse = { success: boolean, data: NeobankAccountResponseData }
      return unwrapResponse(response);
    }, 'account.getInfo');
  }

  /**
   * Get aggregated statistics for your neobank account
   *
   * Returns application counts by status, loan statistics, and borrower counts.
   *
   * @example
   * ```typescript
   * const stats = await passage.account.getStats();
   * console.log(`Total applications: ${stats.applications.total}`);
   * console.log(`Active loans: ${stats.loans.active}`);
   * console.log(`Total disbursed: ${stats.loans.totalDisbursed}`);
   * console.log(`Unique borrowers: ${stats.borrowers.total}`);
   * ```
   */
  async getStats(): Promise<NeobankStats> {
    return this.execute(async () => {
      this.debug('account.getStats');

      const response = await this.api.getAccountStats();
      // Response is AxiosResponse<GetAccountStats200Response>
      const data = unwrapResponse(response);
      return data as NeobankStats;
    }, 'account.getStats');
  }

  /**
   * Get webhook configuration
   *
   * @example
   * ```typescript
   * const webhook = await passage.account.getWebhook();
   * if (webhook.webhookUrl) {
   *   console.log(`Webhook configured: ${webhook.webhookUrl}`);
   * }
   * ```
   */
  async getWebhook(): Promise<WebhookConfig> {
    return this.execute(async () => {
      this.debug('account.getWebhook');

      const response = await this.api.getWebhookConfig();
      // Response is AxiosResponse<WebhookConfigResponse>
      return unwrapResponse(response);
    }, 'account.getWebhook');
  }

  /**
   * Update webhook URL
   *
   * URL must be HTTPS in production. HTTP is allowed in sandbox for testing.
   *
   * @example
   * ```typescript
   * const result = await passage.account.updateWebhook({
   *   url: 'https://api.myapp.com/webhooks/passage',
   * });
   * console.log(result.message); // 'Webhook URL updated successfully'
   * ```
   */
  async updateWebhook(params: { url: string }): Promise<{
    webhookUrl: string | null | undefined;
    message: string;
  }> {
    return this.execute(async () => {
      this.debug('account.updateWebhook', params.url);

      const response = await this.api.updateWebhookUrl({
        webhookUrlUpdateRequest: { webhookUrl: params.url },
      });

      // Response is AxiosResponse<WebhookUrlUpdateResponse>
      const data = unwrapResponse(response);
      return {
        webhookUrl: data.webhookUrl,
        message: data.message,
      };
    }, 'account.updateWebhook');
  }

  /**
   * Send a test webhook to verify endpoint configuration
   *
   * @example
   * ```typescript
   * const result = await passage.account.testWebhook();
   * if (result.delivered) {
   *   console.log('Webhook test successful');
   * } else {
   *   console.log(`Test failed: ${result.error}`);
   * }
   * ```
   */
  async testWebhook(): Promise<WebhookTestResponseData> {
    return this.execute(async () => {
      this.debug('account.testWebhook');

      const response = await this.api.testWebhook();
      // Response is AxiosResponse<WebhookTestResponse>
      return unwrapResponse(response);
    }, 'account.testWebhook');
  }

  /**
   * Rotate webhook secret
   *
   * IMPORTANT: The new secret is only returned once. Store it securely.
   *
   * @example
   * ```typescript
   * const result = await passage.account.rotateWebhookSecret();
   * // Store this securely - it won't be shown again!
   * await saveToSecretManager(result.webhookSecret);
   * ```
   */
  async rotateWebhookSecret(): Promise<WebhookSecretRotateResponseData> {
    return this.execute(async () => {
      this.debug('account.rotateWebhookSecret');

      const response = await this.api.rotateWebhookSecret();
      // Response is AxiosResponse<WebhookSecretRotateResponse>
      return unwrapResponse(response);
    }, 'account.rotateWebhookSecret');
  }
}
