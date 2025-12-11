/**
 * Configuration for the Passage SDK client
 */
export interface PassageClientConfig {
  /**
   * Your neobank API key (starts with nb_test_ or nb_live_)
   */
  apiKey: string;

  /**
   * Environment to connect to
   * @default 'production'
   */
  environment?: 'sandbox' | 'production';

  /**
   * Custom base URL (overrides environment setting)
   * Only use this for testing or special configurations
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Maximum number of retries for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Internal resolved configuration with all defaults applied
 */
export interface ResolvedConfig
  extends Required<Omit<PassageClientConfig, 'baseUrl'>> {
  baseUrl: string;
}

/**
 * Base API URL
 *
 * Note: The Passage API uses a single URL for both sandbox and production.
 * Environment routing is determined by the API key prefix:
 * - nb_test_* keys route to sandbox
 * - nb_live_* keys route to production
 *
 * The `environment` config option is primarily for documentation/clarity
 * and to auto-detect which key type is expected.
 */
const API_BASE_URL = 'https://api.tryportola.com/api/v1';

/**
 * Resolve the base URL from configuration
 */
export function resolveBaseUrl(config: PassageClientConfig): string {
  if (config.baseUrl) {
    return config.baseUrl;
  }
  return API_BASE_URL;
}

/**
 * Resolve configuration with defaults
 */
export function resolveConfig(config: PassageClientConfig): ResolvedConfig {
  return {
    apiKey: config.apiKey,
    environment: config.environment ?? 'production',
    baseUrl: resolveBaseUrl(config),
    timeout: config.timeout ?? 30000,
    maxRetries: config.maxRetries ?? 3,
    debug: config.debug ?? false,
  };
}
