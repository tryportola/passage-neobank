import type { WalletsApi } from '@portola/passage';
import type {
  WalletResponse,
  WalletListResponse,
  WalletData,
  VerificationChallengeResponse,
  VerificationChallengeData,
  VerificationStatusResponse,
  VerificationStatusData,
  VerificationProofResponse,
  VerificationProofData,
  VerificationListResponse,
  WalletType,
  WalletVerificationMethod,
  WalletVerificationStatus,
  Chain,
} from '@portola/passage';
import type { ResolvedConfig } from '../config';
import { BaseResource, unwrapResponse } from './base';

// Re-export types for convenience
export type { WalletVerificationMethod, WalletVerificationStatus, Chain };
// Note: WalletType is also exported but users can import from @portola/passage directly

/**
 * Wallet data returned from the API
 */
export interface Wallet {
  id: string;
  address: string;
  chain: Chain;
  type: WalletType;
  verified: boolean;
  verifiedByThisNeobank: boolean;
  verifiedAt: string | null;
  verificationMethod: WalletVerificationMethod | null;
  externalId: string | null;
  label: string | null;
  createdAt: string;
}

/**
 * Parameters for creating/registering a wallet
 */
export interface CreateWalletParams {
  address: string;
  chain?: Chain;
  type?: WalletType;
  externalId?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for updating wallet metadata
 */
export interface UpdateWalletParams {
  externalId?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for listing wallets
 */
export interface ListWalletsParams {
  verified?: boolean;
  chain?: Chain;
  externalId?: string;
  address?: string;
  limit?: number;
  offset?: number;
}

/**
 * MESSAGE_SIGN challenge structure
 */
export interface MessageSignChallenge {
  message: string;
  nonce: string;
  signingStandard: 'personal_sign' | 'eth_signTypedData_v4';
  typedData?: Record<string, unknown>;
}

/**
 * AOPP challenge structure
 */
export interface AOPPChallenge {
  callback: string;
  message: string;
  asset: string;
  format?: string;
  aoppUri: string;
}

/**
 * Verification challenge data
 */
export interface VerificationChallenge {
  verificationId: string;
  walletId: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
  challenge: MessageSignChallenge | AOPPChallenge;
  expiresAt: string;
}

/**
 * Type guard to check if challenge is AOPP
 */
export function isAOPPChallenge(
  challenge: MessageSignChallenge | AOPPChallenge
): challenge is AOPPChallenge {
  return 'aoppUri' in challenge;
}

/**
 * Type guard to check if challenge is MESSAGE_SIGN
 */
export function isMessageSignChallenge(
  challenge: MessageSignChallenge | AOPPChallenge
): challenge is MessageSignChallenge {
  return 'nonce' in challenge && 'signingStandard' in challenge;
}

/**
 * Verification status data
 */
export interface Verification {
  id: string;
  walletId: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
  expiresAt: string;
  completedAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
}

/**
 * Verification list item
 */
export interface VerificationSummary {
  id: string;
  method: WalletVerificationMethod;
  status: WalletVerificationStatus;
  initiatedAt: string;
  completedAt: string | null;
  expiresAt: string;
}

/**
 * Result of submitting verification proof
 */
export interface VerificationResult {
  verificationId: string;
  status: WalletVerificationStatus;
  verifiedAt: string | null;
  wallet: {
    id: string;
    verified: boolean;
    verificationMethod: WalletVerificationMethod | null;
  };
}

/**
 * Resource for wallet ownership verification
 *
 * @example
 * ```typescript
 * // Register a wallet
 * const wallet = await passage.wallets.create({
 *   address: '0x1234...',
 *   chain: 'base',
 * });
 *
 * // Initiate verification
 * const challenge = await passage.wallets.initiateVerification(wallet.id, {
 *   method: 'MESSAGE_SIGN',
 * });
 *
 * // User signs the message with their wallet
 * const signature = await userWallet.signMessage(challenge.challenge.message);
 *
 * // Submit the proof
 * const result = await passage.wallets.submitProof(challenge.verificationId, {
 *   signature,
 * });
 *
 * console.log(result.status); // 'VERIFIED'
 * ```
 */
export class WalletsResource extends BaseResource {
  private api: WalletsApi;

  constructor(api: WalletsApi, config: ResolvedConfig) {
    super(config);
    this.api = api;
  }

  /**
   * Create or link a wallet
   *
   * Registers a wallet address for ownership verification.
   * Idempotent - returns existing wallet if address+chain already exists.
   *
   * @example
   * ```typescript
   * const wallet = await passage.wallets.create({
   *   address: '0x1234567890abcdef...',
   *   chain: 'base',
   *   externalId: 'user_123', // Your internal user ID
   *   label: "John's wallet",
   * });
   * ```
   */
  async create(params: CreateWalletParams): Promise<Wallet> {
    return this.execute(async () => {
      this.debug('wallets.create', params.address);

      const response = await this.api.createWallet({
        createWalletRequest: {
          address: params.address,
          chain: params.chain,
          type: params.type,
          externalId: params.externalId,
          label: params.label,
          metadata: params.metadata,
        },
      });

      const data = unwrapResponse(response);
      return this.mapWallet(data);
    }, 'wallets.create');
  }

  /**
   * Get a wallet by ID
   *
   * @example
   * ```typescript
   * const wallet = await passage.wallets.get('wal_123');
   * console.log(wallet.verified, wallet.verifiedByThisNeobank);
   * ```
   */
  async get(walletId: string): Promise<Wallet> {
    return this.execute(async () => {
      this.debug('wallets.get', walletId);

      const response = await this.api.getWallet({ id: walletId });
      const data = unwrapResponse(response);
      return this.mapWallet(data);
    }, 'wallets.get');
  }

  /**
   * List wallets linked to this neobank
   *
   * @example
   * ```typescript
   * // List all verified wallets
   * const { wallets } = await passage.wallets.list({ verified: true });
   *
   * // Find wallets by external ID
   * const { wallets } = await passage.wallets.list({ externalId: 'user_123' });
   * ```
   */
  async list(params: ListWalletsParams = {}): Promise<{
    wallets: Wallet[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    return this.execute(async () => {
      this.debug('wallets.list', params);

      const response = await this.api.listWallets({
        verified: params.verified,
        chain: params.chain,
        externalId: params.externalId,
        address: params.address,
        limit: params.limit,
        offset: params.offset,
      });

      const data = unwrapResponse(response);
      return {
        wallets: data.wallets.map((w: WalletData) => this.mapWallet(w)),
        pagination: data.pagination,
      };
    }, 'wallets.list');
  }

  /**
   * Update wallet metadata
   *
   * Updates neobank-specific metadata (externalId, label, metadata).
   *
   * @example
   * ```typescript
   * await passage.wallets.update('wal_123', {
   *   label: 'Primary wallet',
   *   externalId: 'new_user_id',
   * });
   * ```
   */
  async update(walletId: string, params: UpdateWalletParams): Promise<Wallet> {
    return this.execute(async () => {
      this.debug('wallets.update', walletId);

      const response = await this.api.updateWallet({
        id: walletId,
        updateWalletRequest: {
          externalId: params.externalId,
          label: params.label,
          metadata: params.metadata,
        },
      });

      const data = unwrapResponse(response);
      return this.mapWallet(data);
    }, 'wallets.update');
  }

  /**
   * Initiate wallet verification
   *
   * Starts the verification process. For MESSAGE_SIGN, returns a message
   * that the user must sign with their wallet.
   *
   * @example
   * ```typescript
   * const challenge = await passage.wallets.initiateVerification('wal_123', {
   *   method: 'MESSAGE_SIGN',
   * });
   *
   * // Present message to user for signing
   * console.log(challenge.challenge.message);
   * ```
   */
  async initiateVerification(
    walletId: string,
    params: { method: WalletVerificationMethod }
  ): Promise<VerificationChallenge> {
    return this.execute(async () => {
      this.debug('wallets.initiateVerification', walletId, params.method);

      const response = await this.api.initiateWalletVerification({
        walletId,
        initiateVerificationRequest: { method: params.method },
      });

      const data = unwrapResponse(response);
      return {
        verificationId: data.verificationId,
        walletId: data.walletId,
        method: data.method,
        status: data.status,
        challenge: data.challenge,
        expiresAt: data.expiresAt,
      };
    }, 'wallets.initiateVerification');
  }

  /**
   * Submit verification proof
   *
   * Submits the signature to complete verification.
   *
   * @example
   * ```typescript
   * // After user signs the challenge message
   * const result = await passage.wallets.submitProof(verificationId, {
   *   signature: '0x...',
   * });
   *
   * if (result.status === 'VERIFIED') {
   *   console.log('Wallet verified!');
   * }
   * ```
   */
  async submitProof(
    verificationId: string,
    params: { signature: string }
  ): Promise<VerificationResult> {
    return this.execute(async () => {
      this.debug('wallets.submitProof', verificationId);

      const response = await this.api.submitVerificationProof({
        verificationId,
        submitProofRequest: { signature: params.signature },
      });

      const data = unwrapResponse(response);
      return {
        verificationId: data.verificationId,
        status: data.status,
        verifiedAt: data.verifiedAt ?? null,
        wallet: {
          id: data.wallet.id,
          verified: data.wallet.verified,
          verificationMethod: data.wallet.verificationMethod ?? null,
        },
      };
    }, 'wallets.submitProof');
  }

  /**
   * Get verification status
   *
   * @example
   * ```typescript
   * const verification = await passage.wallets.getVerification('ver_123');
   * console.log(verification.status);
   * ```
   */
  async getVerification(verificationId: string): Promise<Verification> {
    return this.execute(async () => {
      this.debug('wallets.getVerification', verificationId);

      const response = await this.api.getVerification({ verificationId });
      const data = unwrapResponse(response);

      return {
        id: data.id,
        walletId: data.walletId,
        method: data.method,
        status: data.status,
        expiresAt: data.expiresAt,
        completedAt: data.completedAt,
        failedAt: data.failedAt,
        failureReason: data.failureReason,
      };
    }, 'wallets.getVerification');
  }

  /**
   * List verifications for a wallet
   *
   * Returns all verification attempts for this wallet by this neobank.
   *
   * @example
   * ```typescript
   * const { verifications } = await passage.wallets.listVerifications('wal_123');
   * ```
   */
  async listVerifications(walletId: string): Promise<{
    verifications: VerificationSummary[];
  }> {
    return this.execute(async () => {
      this.debug('wallets.listVerifications', walletId);

      const response = await this.api.listWalletVerifications({ walletId });
      const data = unwrapResponse(response);

      return {
        verifications: data.verifications.map((v) => ({
          id: v.id,
          method: v.method,
          status: v.status,
          initiatedAt: v.initiatedAt,
          completedAt: v.completedAt ?? null,
          expiresAt: v.expiresAt,
        })),
      };
    }, 'wallets.listVerifications');
  }

  // =========================================================================
  // Convenience Methods
  // =========================================================================

  /**
   * Ensure a wallet is registered and check verification status
   *
   * This is a convenience method that:
   * 1. Creates/links the wallet if it doesn't exist
   * 2. Checks if already verified by this neobank
   * 3. Returns verification status and challenge if needed
   *
   * Use this when you want to check if a wallet needs verification
   * before showing the signing UI to the user.
   *
   * @example
   * ```typescript
   * const result = await passage.wallets.ensureVerified({
   *   address: userWalletAddress,
   *   chain: 'base',
   *   externalId: user.id,
   * });
   *
   * if (result.verified) {
   *   // Wallet already verified, proceed with application
   *   console.log('Wallet verified:', result.wallet.id);
   * } else {
   *   // Need user to sign - show signing UI
   *   const signature = await walletClient.signMessage({
   *     message: result.challenge.challenge.message,
   *   });
   *
   *   await passage.wallets.submitProof(result.challenge.verificationId, { signature });
   * }
   * ```
   */
  async ensureVerified(params: CreateWalletParams): Promise<
    | { verified: true; wallet: Wallet; challenge: null }
    | { verified: false; wallet: Wallet; challenge: VerificationChallenge }
  > {
    return this.execute(async () => {
      this.debug('wallets.ensureVerified', params.address);

      // 1. Create or get existing wallet
      const wallet = await this.create(params);

      // 2. If already verified by this neobank, return immediately
      if (wallet.verifiedByThisNeobank) {
        return { verified: true, wallet, challenge: null };
      }

      // 3. Not verified - initiate verification and return challenge
      const challenge = await this.initiateVerification(wallet.id, {
        method: 'MESSAGE_SIGN',
      });

      return { verified: false, wallet, challenge };
    }, 'wallets.ensureVerified');
  }

  /**
   * Register wallet and complete verification in a single atomic operation
   *
   * This method creates a NEW challenge internally and verifies the signature
   * against that challenge. It is designed for server-controlled signing
   * scenarios (custodial wallets, automated systems) where you can sign the
   * challenge message in the same execution context.
   *
   * **WARNING:** Do NOT use this after calling `ensureVerified()` or
   * `initiateVerification()`. Each call creates a new challenge with a unique
   * nonce, so signatures from previous challenges will fail verification.
   *
   * For browser-based user wallet verification, use the two-step flow:
   * 1. Call `ensureVerified()` to get the challenge
   * 2. User signs the challenge message in their wallet
   * 3. Call `submitProof(challenge.verificationId, { signature })`
   *
   * @example
   * ```typescript
   * // For custodial/server-controlled wallets only
   * const result = await passage.wallets.verifyWithSignature({
   *   address: custodialWalletAddress,
   *   chain: 'base',
   *   signature: await custodialSigner.signMessage(challengeMessage),
   * });
   *
   * console.log(result.wallet.verified); // true
   * ```
   *
   * @example
   * ```typescript
   * // For browser-based user wallets, use ensureVerified + submitProof instead:
   * const result = await passage.wallets.ensureVerified({ address: '0x...' });
   * if (!result.verified) {
   *   const signature = await userWallet.signMessage(result.challenge.challenge.message);
   *   await passage.wallets.submitProof(result.challenge.verificationId, { signature });
   * }
   * ```
   */
  async verifyWithSignature(
    params: CreateWalletParams & { signature: string }
  ): Promise<VerificationResult & { wallet: Wallet }> {
    return this.execute(async () => {
      this.debug('wallets.verifyWithSignature', params.address);

      const { signature, ...walletParams } = params;

      // 1. Create or get existing wallet
      const wallet = await this.create(walletParams);

      // 2. If already verified, return current state
      if (wallet.verifiedByThisNeobank) {
        return {
          verificationId: '', // No new verification created
          status: 'VERIFIED' as const,
          verifiedAt: wallet.verifiedAt,
          wallet,
        };
      }

      // 3. Initiate verification
      const challenge = await this.initiateVerification(wallet.id, {
        method: 'MESSAGE_SIGN',
      });

      // 4. Submit proof
      const result = await this.submitProof(challenge.verificationId, { signature });

      // 5. Return result with updated wallet
      const updatedWallet = await this.get(wallet.id);

      return {
        ...result,
        wallet: updatedWallet,
      };
    }, 'wallets.verifyWithSignature');
  }

  // =========================================================================
  // AOPP Methods
  // =========================================================================

  /**
   * Initiate AOPP verification
   *
   * Returns a challenge with an aoppUri that can be displayed as a QR code.
   * The user scans this with an AOPP-compatible wallet (Ledger Live, BitBox),
   * and the wallet POSTs the signature directly to our callback URL.
   *
   * After displaying the QR code, poll with `waitForAOPPVerification()` to
   * detect when the user completes verification.
   *
   * @example
   * ```typescript
   * import { isAOPPChallenge } from '@portola/passage-neobank';
   *
   * const challenge = await passage.wallets.initiateAOPPVerification('wal_123');
   *
   * if (isAOPPChallenge(challenge.challenge)) {
   *   // Display QR code with challenge.challenge.aoppUri
   *   showQRCode(challenge.challenge.aoppUri);
   *
   *   // Poll for completion (user signs in their wallet app)
   *   const result = await passage.wallets.waitForAOPPVerification(
   *     challenge.verificationId,
   *     { timeout: 600000 } // 10 minutes
   *   );
   *
   *   if (result.status === 'VERIFIED') {
   *     console.log('Wallet verified via AOPP!');
   *   }
   * }
   * ```
   */
  async initiateAOPPVerification(walletId: string): Promise<VerificationChallenge> {
    return this.execute(async () => {
      this.debug('wallets.initiateAOPPVerification', walletId);

      const response = await this.api.initiateWalletVerification({
        walletId,
        initiateVerificationRequest: { method: 'AOPP' },
      });

      const data = unwrapResponse(response);
      return {
        verificationId: data.verificationId,
        walletId: data.walletId,
        method: data.method,
        status: data.status,
        challenge: data.challenge,
        expiresAt: data.expiresAt,
      };
    }, 'wallets.initiateAOPPVerification');
  }

  /**
   * Poll for AOPP verification completion
   *
   * Since AOPP callbacks go directly to the server (not through the frontend),
   * this method polls the verification status until it completes, fails, or times out.
   *
   * @param verificationId - The verification ID from initiateAOPPVerification
   * @param options - Polling options
   * @param options.timeout - Max time to wait in ms (default: 600000 = 10 minutes)
   * @param options.interval - Poll interval in ms (default: 2000 = 2 seconds)
   * @param options.onPoll - Optional callback on each poll (for showing countdown)
   *
   * @example
   * ```typescript
   * const result = await passage.wallets.waitForAOPPVerification(verificationId, {
   *   timeout: 600000, // 10 minutes
   *   interval: 2000,  // Check every 2 seconds
   *   onPoll: (verification) => {
   *     console.log(`Status: ${verification.status}, expires: ${verification.expiresAt}`);
   *   },
   * });
   * ```
   */
  async waitForAOPPVerification(
    verificationId: string,
    options: {
      timeout?: number;
      interval?: number;
      onPoll?: (verification: Verification) => void;
    } = {}
  ): Promise<Verification> {
    const { timeout = 600000, interval = 2000, onPoll } = options;
    const startTime = Date.now();

    return this.execute(async () => {
      this.debug('wallets.waitForAOPPVerification', verificationId);

      while (Date.now() - startTime < timeout) {
        const verification = await this.getVerification(verificationId);

        if (onPoll) {
          onPoll(verification);
        }

        // Terminal states - return immediately
        if (
          verification.status === 'VERIFIED' ||
          verification.status === 'FAILED' ||
          verification.status === 'EXPIRED'
        ) {
          return verification;
        }

        // Still pending - wait and poll again
        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      // Timeout - fetch final status
      return this.getVerification(verificationId);
    }, 'wallets.waitForAOPPVerification');
  }

  /**
   * Map API wallet data to Wallet type
   */
  private mapWallet(data: {
    id: string;
    address: string;
    chain: Chain;
    type: WalletType;
    verified: boolean;
    verifiedByThisNeobank: boolean;
    verifiedAt?: string | null;
    verificationMethod?: WalletVerificationMethod | null;
    externalId?: string | null;
    label?: string | null;
    createdAt: string;
  }): Wallet {
    return {
      id: data.id,
      address: data.address,
      chain: data.chain,
      type: data.type,
      verified: data.verified,
      verifiedByThisNeobank: data.verifiedByThisNeobank,
      verifiedAt: data.verifiedAt ?? null,
      verificationMethod: data.verificationMethod ?? null,
      externalId: data.externalId ?? null,
      label: data.label ?? null,
      createdAt: data.createdAt,
    };
  }
}
