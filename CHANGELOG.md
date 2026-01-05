# Changelog

All notable changes to `@portola/passage-neobank` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

This release updates the SDK to use the new Zod-based auto-generated `@portola/passage` SDK. The following breaking changes require updates to consumer code.

#### Type Renames

The underlying SDK now uses consistent, semantic type names instead of auto-generated names like `ListApplications200ResponseData`.

| Old Type Name | New Type Name |
|---------------|---------------|
| `ListApplications200Response` | `ApplicationListResponse` |
| `ListApplications200ResponseData` | `ApplicationListResponseData` |
| `UpdateApplicationStatus200ResponseData` | `ApplicationStatusUpdateResponseData` |
| `AcceptPrequalOffer200ResponseData` | `OfferAcceptanceResponseData` |
| `GetAccountInfo200ResponseData` | `NeobankAccountData` |
| `GetWebhookConfig200ResponseData` | `WebhookConfigData` |
| `TestWebhook200ResponseData` | `WebhookTestData` |
| `RotateWebhookSecret200ResponseData` | `WebhookSecretRotateData` |
| `ListLenders200ResponseDataLendersInner` | `LenderListItem` |
| `ListLenders200ResponseData` | `LenderListData` |
| `GetLenderDetails200ResponseData` | `LenderDetailData` |
| `GetLenderDetails200ResponseDataLender` | `LenderDetail` |
| `GetLenderPublicKey200ResponseData` | `LenderPublicKeyData` |
| `GetKYCProviders200ResponseDataProvidersInner` | `KYCProvider` |
| `KYCStatusDataStatusEnum` | `KYCStatus` |
| `GetKYCStatus200ResponseDataAttestationsInner` | `KYCStatusAttestation` |
| `ListWallets200ResponseDataWalletsInner` | `WalletResponseData` |
| `ApplicationRequestEncryptedPayloadsInner` | `EncryptedPayload` |
| `ApplicationRequestProductTypeEnum` | `ProductType` |
| `EncryptedOfferResponseOfferTypeEnum` | `OfferType` |
| `SigningSessionStatusDataStatusEnum` | `SigningSessionStatus` |

**Migration Example:**

```typescript
// Before
import type {
  ListApplications200ResponseData,
  GetAccountInfo200ResponseData,
  ApplicationRequestProductTypeEnum,
} from '@portola/passage-neobank';

// After
import type {
  ApplicationListResponseData,
  NeobankAccountData,
  ProductType,
} from '@portola/passage-neobank';
```

#### Wallet Chain Type Change

The `CreateWalletParams.chain` property now uses `WalletChain` instead of `Chain`. The `WalletChain` type is a subset of `Chain` and does not include `avalanche`.

**Supported chains in `WalletChain`:**
- `base`
- `ethereum`
- `polygon`
- `arbitrum`
- `optimism`
- `solana`

```typescript
// Before
import type { Chain } from '@portola/passage-neobank';

const params: CreateWalletParams = {
  address: '0x...',
  chain: 'avalanche' as Chain, // This was allowed
};

// After
import type { WalletChain } from '@portola/passage-neobank';

const params: CreateWalletParams = {
  address: '0x...',
  chain: 'polygon', // Must be a valid WalletChain
};
```

### Added

- Export `WalletChain` type for wallet creation parameters
- Export `WebhookUrlUpdateData` type for webhook update responses

### Changed

- `ProductType` is now exported directly (previously was `ApplicationRequestProductTypeEnum`)
- `OfferType` is now exported directly (previously was `EncryptedOfferResponseOfferTypeEnum`)
- `EncryptedPayload` is now exported directly (previously was `ApplicationRequestEncryptedPayloadsInner`)
- Backwards compatibility alias `EncryptedPayloadInput` still works (maps to `EncryptedPayload`)

### Removed

- Removed redundant `OfferAcceptanceResponseData` type alias (now exported directly from SDK)
- Removed deprecated `ProductTypeAlias` (use `ProductType` directly)
- Removed deprecated `OfferTypeAlias` (use `OfferType` directly)

### Internal Changes

These changes are internal to the SDK implementation and should not affect consumers:

#### API Method Parameter Renames

The underlying SDK method signatures have changed. If you're using the raw SDK APIs directly (not through the `Passage` client), you'll need to update parameter names:

| Method | Old Parameter | New Parameter |
|--------|--------------|---------------|
| `submitApplication` | `submitApplicationRequest` | `applicationRequest` |
| `submitDraftApplication` | `submitDraftApplicationRequest` | `applicationSubmitRequest` |
| `updateApplicationStatus` | `updateApplicationStatusRequest` | `applicationStatusUpdateRequest` |
| `acceptPrequalOffer` | `acceptPrequalOfferRequest` | `offerAcceptanceRequest` |
| `acceptFinalOffer` | `acceptFinalOfferRequest` | `finalOfferAcceptanceRequest` |
| `updateWebhookUrl` | `updateWebhookUrlRequest` | `webhookUrlUpdateRequest` |
| `submitVerificationProof` | `submitVerificationProofRequest` | `submitProofRequest` |
| `generateSDXToken` | `generateSDXTokenRequest` | `sDXTokenRequest` |
| `storeKYCHandle` | `storeKYCHandleRequest` | `kYCHandleRequest` |

## [1.2.0] - Previous Release

- Initial stable release with full neobank SDK functionality
- Support for applications, offers, loans, wallets, signing, SDX, and webhooks
- Hybrid encryption/decryption utilities
- Webhook signature verification

---

## Migration Guide

### From v1.2.x to v1.3.x

1. **Update type imports** - Replace old type names with new semantic names (see table above)

2. **Update wallet chain usage** - If using `avalanche` chain, this is no longer supported for wallet creation

3. **Update direct SDK usage** - If calling SDK methods directly, update parameter names

4. **Test thoroughly** - Run your test suite to catch any remaining type mismatches

### Example Migration

```typescript
// === BEFORE (v1.2.x) ===
import { Passage } from '@portola/passage-neobank';
import type {
  ApplicationRequestProductTypeEnum,
  ListApplications200ResponseData,
  Chain,
} from '@portola/passage-neobank';

const passage = new Passage({ apiKey: 'nb_test_...' });

// Creating a wallet
const wallet = await passage.wallets.create({
  address: '0x...',
  chain: 'polygon' as Chain,
});

// Listing applications
const { applications } = await passage.applications.list({
  productType: 'personal' as ApplicationRequestProductTypeEnum,
});

// === AFTER (v1.3.x) ===
import { Passage } from '@portola/passage-neobank';
import type {
  ProductType,
  ApplicationListResponseData,
  WalletChain,
} from '@portola/passage-neobank';

const passage = new Passage({ apiKey: 'nb_test_...' });

// Creating a wallet
const wallet = await passage.wallets.create({
  address: '0x...',
  chain: 'polygon', // WalletChain type is inferred
});

// Listing applications
const { applications } = await passage.applications.list({
  productType: 'personal', // ProductType is inferred
});
```
