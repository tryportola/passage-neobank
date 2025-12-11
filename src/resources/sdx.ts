import type { SDXApi } from '@portola/passage';
import type { SDXTokenResponse } from '@portola/passage';
import type { ResolvedConfig } from '../config';
import { BaseResource, unwrapResponse } from './base';
import axios from 'axios';

/**
 * SDX upload token returned from the API
 */
export interface SDXUploadToken {
  /** JWT token for SDX API access */
  sdxToken: string;
  /** Token expiration in seconds (typically 600 = 10 minutes) */
  expiresIn: number;
  /** Base URL of the SDX service for document operations */
  sdxUrl: string;
}

/**
 * Result of uploading a document to SDX
 *
 * Note: Field names match the SDX service response (documentHandle, expiresAt, blobSize)
 * rather than using different names to avoid confusion.
 */
export interface SDXUploadResult {
  /** Unique document handle for retrieval (96 hex characters) */
  documentHandle: string;
  /** ISO 8601 timestamp when document handle expires */
  expiresAt: string;
  /** Size of uploaded blob in bytes */
  blobSize?: number;
  /** True if an identical blob was previously uploaded (deduplication) */
  duplicate?: boolean;
}

/**
 * Document type for SDX uploads
 * Matches SDXTokenRequestDocumentTypeEnum from the generated SDK
 */
export type SDXDocumentType = 'kyc' | 'contract' | 'signed_contract';

/**
 * Parameters for getting an SDX upload token
 */
export interface SDXTokenParams {
  applicationId: string;
  action: 'upload' | 'download';
  documentType?: SDXDocumentType;
}

/**
 * Parameters for uploading to SDX
 */
export interface SDXUploadParams {
  /** The SDX token obtained from getToken() */
  token: SDXUploadToken;
  /** The encrypted document data */
  encryptedDocument: Buffer | ArrayBuffer | Uint8Array;
  /** Document type header */
  documentType?: SDXDocumentType;
  /** Optional idempotency key */
  idempotencyKey?: string;
}

/**
 * Parameters for downloading from SDX
 */
export interface SDXDownloadParams {
  /** The SDX token obtained from getToken() with action: 'download' */
  token: SDXUploadToken;
  /** The document handle to download */
  documentHandle: string;
}

/**
 * Parameters for storing a KYC handle
 */
export interface StoreKYCHandleParams {
  applicationId: string;
  /** The SDX handle from the upload */
  kycDocumentHandle: string;
  /** Document type (e.g., 'drivers_license', 'passport', 'ssn_card') */
  documentType: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Resource for managing SDX (Secure Document Exchange) operations
 *
 * SDX is used for secure, encrypted document storage and transfer.
 * Documents are encrypted client-side before upload.
 */
export class SDXResource extends BaseResource {
  private sdxApi: SDXApi;

  constructor(sdxApi: SDXApi, config: ResolvedConfig) {
    super(config);
    this.sdxApi = sdxApi;
  }

  /**
   * Get an SDX access token for document operations
   *
   * Tokens are short-lived (10 minutes) and should be used immediately.
   *
   * @example
   * ```typescript
   * const token = await passage.sdx.getToken({
   *   applicationId: 'app_123',
   *   action: 'upload',
   *   documentType: 'kyc',
   * });
   *
   * console.log('SDX URL:', token.sdxUrl);
   * console.log('Expires in:', token.expiresIn, 'seconds');
   * ```
   */
  async getToken(params: SDXTokenParams): Promise<SDXUploadToken> {
    return this.execute(async () => {
      this.debug('sdx.getToken', params);

      const response = await this.sdxApi.generateSDXToken({
        sDXTokenRequest: {
          applicationId: params.applicationId,
          action: params.action,
          documentType: params.documentType,
        },
      });

      // Response is AxiosResponse<SDXTokenResponse>
      const data = unwrapResponse(response);

      return {
        sdxToken: data.sdxToken,
        expiresIn: data.expiresIn,
        sdxUrl: data.sdxUrl,
      };
    }, 'sdx.getToken');
  }

  /**
   * Upload an encrypted document to SDX
   *
   * The document should be encrypted using `encryptDocumentForSDX()` from the crypto module.
   *
   * @example
   * ```typescript
   * import { encryptDocumentForSDX } from '@portola/passage-neobank/crypto';
   * import fs from 'fs';
   *
   * // Read and encrypt the document
   * const document = fs.readFileSync('./drivers_license.pdf');
   * const encryptedDoc = encryptDocumentForSDX(document, lenderPublicKey);
   *
   * // Get upload token
   * const token = await passage.sdx.getToken({
   *   applicationId: 'app_123',
   *   action: 'upload',
   *   documentType: 'kyc',
   * });
   *
   * // Upload encrypted document
   * const result = await passage.sdx.upload({
   *   token,
   *   encryptedDocument: encryptedDoc,
   *   documentType: 'kyc',
   * });
   *
   * console.log('Document handle:', result.documentHandle);
   * ```
   */
  async upload(params: SDXUploadParams): Promise<SDXUploadResult> {
    return this.execute(async () => {
      this.debug('sdx.upload', { documentType: params.documentType });

      // Convert to Buffer/Uint8Array if needed
      const documentBuffer =
        params.encryptedDocument instanceof Buffer
          ? params.encryptedDocument
          : params.encryptedDocument instanceof Uint8Array
            ? params.encryptedDocument
            : new Uint8Array(params.encryptedDocument);

      // Upload directly to SDX service using the token
      // Note: We use axios directly here because SDX is a separate service
      // with a dynamic base URL (obtained from the token response)
      const response = await axios.post<{
        documentHandle: string;
        expiresAt: string;
        blobSize?: number;
        duplicate?: boolean;
      }>(
        `${params.token.sdxUrl}/sdx/blobs`,
        documentBuffer,
        {
          headers: {
            Authorization: `Bearer ${params.token.sdxToken}`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': documentBuffer.length.toString(),
            'X-Document-Type': params.documentType ?? 'other',
            ...(params.idempotencyKey && {
              'Idempotency-Key': params.idempotencyKey,
            }),
          },
          timeout: this.config.timeout,
        }
      );

      return {
        documentHandle: response.data.documentHandle,
        expiresAt: response.data.expiresAt,
        blobSize: response.data.blobSize,
        duplicate: response.data.duplicate,
      };
    }, 'sdx.upload');
  }

  /**
   * Convenience method: Get token and upload in one call
   *
   * @example
   * ```typescript
   * const result = await passage.sdx.uploadDocument({
   *   applicationId: 'app_123',
   *   documentType: 'kyc',
   *   encryptedDocument: encryptedDoc,
   * });
   *
   * console.log('Document handle:', result.documentHandle);
   * ```
   */
  async uploadDocument(params: {
    applicationId: string;
    documentType?: SDXDocumentType;
    encryptedDocument: Buffer | ArrayBuffer | Uint8Array;
    idempotencyKey?: string;
  }): Promise<SDXUploadResult> {
    // Get upload token
    const token = await this.getToken({
      applicationId: params.applicationId,
      action: 'upload',
      documentType: params.documentType,
    });

    // Upload document
    return this.upload({
      token,
      encryptedDocument: params.encryptedDocument,
      documentType: params.documentType,
      idempotencyKey: params.idempotencyKey,
    });
  }

  /**
   * Download an encrypted document from SDX
   *
   * @example
   * ```typescript
   * const token = await passage.sdx.getToken({
   *   applicationId: 'app_123',
   *   action: 'download',
   * });
   *
   * const encryptedDoc = await passage.sdx.download({
   *   token,
   *   documentHandle: 'sdx_tok_abc123...',
   * });
   * ```
   */
  async download(params: SDXDownloadParams): Promise<Buffer> {
    return this.execute(async () => {
      this.debug('sdx.download', params.documentHandle);

      const response = await axios.get<ArrayBuffer>(
        `${params.token.sdxUrl}/sdx/blobs/${params.documentHandle}`,
        {
          headers: {
            Authorization: `Bearer ${params.token.sdxToken}`,
          },
          responseType: 'arraybuffer',
          timeout: this.config.timeout,
        }
      );

      return Buffer.from(response.data);
    }, 'sdx.download');
  }

  /**
   * Convenience method: Get token and download in one call
   *
   * @example
   * ```typescript
   * const encryptedDoc = await passage.sdx.downloadDocument({
   *   applicationId: 'app_123',
   *   documentHandle: 'sdx_tok_abc123...',
   * });
   *
   * // Decrypt with your private key
   * const plaintext = decryptDocument(encryptedDoc, privateKey);
   * ```
   */
  async downloadDocument(params: {
    applicationId: string;
    documentHandle: string;
  }): Promise<Buffer> {
    const token = await this.getToken({
      applicationId: params.applicationId,
      action: 'download',
    });

    return this.download({
      token,
      documentHandle: params.documentHandle,
    });
  }

  /**
   * Store a KYC document handle for an application
   *
   * After uploading a KYC document to SDX, store the handle so it can be
   * associated with the application and accessed by lenders.
   *
   * @example
   * ```typescript
   * // Upload KYC document
   * const uploadResult = await passage.sdx.uploadDocument({
   *   applicationId: 'app_123',
   *   documentType: 'kyc',
   *   encryptedDocument: encryptedDoc,
   * });
   *
   * // Store the handle
   * await passage.sdx.storeKYCHandle({
   *   applicationId: 'app_123',
   *   kycDocumentHandle: uploadResult.documentHandle,
   *   documentType: 'drivers_license',
   * });
   * ```
   */
  async storeKYCHandle(params: StoreKYCHandleParams): Promise<{
    applicationId: string;
    kycDocumentHandle: string;
    kycSubmittedAt?: string;
  }> {
    return this.execute(async () => {
      this.debug('sdx.storeKYCHandle', params.applicationId);

      const response = await this.sdxApi.storeKYCHandle({
        kYCHandleRequest: {
          applicationId: params.applicationId,
          kycDocumentHandle: params.kycDocumentHandle,
          documentType: params.documentType,
          metadata: params.metadata,
        },
      });

      // Response is AxiosResponse<KYCHandleResponse>
      const data = unwrapResponse(response);

      return {
        applicationId: data.applicationId,
        kycDocumentHandle: data.kycDocumentHandle,
        // Normalize null to undefined to match return type contract (?: string)
        kycSubmittedAt: data.kycSubmittedAt ?? undefined,
      };
    }, 'sdx.storeKYCHandle');
  }
}
