# @portola/passage-neobank

Official Passage SDK for Neobank integrations - the recommended way to integrate with Passage.

## Installation

```bash
npm install @portola/passage-neobank
# @portola/passage is automatically installed as a peer dependency
```

**Requirements:** Node.js 18+

## Quick Start

```typescript
import { Passage } from '@portola/passage-neobank';

const passage = new Passage({
  apiKey: process.env.NEOBANK_API_KEY!, // nb_test_* or nb_live_*
  environment: 'sandbox', // or 'production'
});

// List applications
const { applications } = await passage.applications.list();

// Get a specific application
const app = await passage.applications.get('app_123');
```

## Features

- **Type-safe API client** - Full TypeScript support with generated types
- **Hybrid encryption utilities** - Encrypt PII for lenders, decrypt offer details
- **Webhook handling** - Verify signatures and parse webhook events
- **Automatic retries** - Built-in retry logic for transient failures
- **Environment detection** - Auto-detects sandbox/production from API key

## Usage

### Creating Applications

```typescript
import { Passage } from '@portola/passage-neobank';
import { encryptPIIForLenders } from '@portola/passage-neobank/crypto';

const passage = new Passage({ apiKey: process.env.NEOBANK_API_KEY! });

// 1. Get available lenders
const lenders = await passage.lenders.list({
  productType: 'personal',
  stateCode: 'CA',
});

// 2. Encrypt PII for each lender
const encryptedPayloads = encryptPIIForLenders(
  lenders.map(l => ({ lenderId: l.id, publicKey: l.publicKey })),
  {
    firstName: 'John',
    lastName: 'Doe',
    ssn: '123-45-6789',
    dateOfBirth: '1990-01-15',
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
    },
  }
);

// 3. Create application
const application = await passage.applications.create({
  productType: 'personal',
  encryptedPayloads,
});
```

### Working with Offers

```typescript
import { decryptOfferDetails } from '@portola/passage-neobank/crypto';

// Get prequalified offers
const offers = await passage.offers.getPrequalified(applicationId);

// Decrypt and verify offer details
for (const lenderGroup of offers.lenders) {
  for (const offer of lenderGroup.offers) {
    const { data, verified } = decryptOfferDetails(
      offer.encryptedOfferDetailsNeobank,
      offer.checksumSha256,
      process.env.NEOBANK_PRIVATE_KEY!
    );

    if (verified) {
      console.log(`${lenderGroup.lenderName}: ${data.apr} APR`);
      console.log(`Monthly payment: ${data.monthlyPayment}`);
    }
  }
}

// Accept a prequalified offer
await passage.offers.acceptPrequal(offerId, {
  hardPullConsent: {
    consented: true,
    consentedAt: new Date().toISOString(),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
  },
});
```

### Handling Webhooks

```typescript
import { WebhookHandler } from '@portola/passage-neobank/webhooks';

const webhooks = new WebhookHandler({
  secret: process.env.WEBHOOK_SECRET!,
});

// In your webhook endpoint (e.g., Next.js API route)
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-passage-signature')!;

  try {
    const event = webhooks.constructEvent(body, signature);

    switch (event.event) {
      case 'application.status.changed':
        console.log('Status changed:', event.data);
        break;
      case 'loan.funded':
        console.log('Loan funded:', event.data);
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      return new Response('Invalid signature', { status: 401 });
    }
    throw error;
  }
}
```

### Document Upload (SDX)

```typescript
import { encryptDocumentForSDX } from '@portola/passage-neobank/crypto';
import fs from 'fs';

// Read and encrypt document
const document = fs.readFileSync('./drivers_license.pdf');
const encryptedDoc = encryptDocumentForSDX(document, lenderPublicKey);

// Upload to SDX
const result = await passage.sdx.uploadDocument({
  applicationId: 'app_123',
  documentType: 'kyc',
  encryptedDocument: encryptedDoc,
});

console.log('Document handle:', result.documentHandle);
```

## API Reference

### Client

```typescript
const passage = new Passage({
  apiKey: string;           // Required: nb_test_* or nb_live_*
  environment?: 'sandbox' | 'production';  // Auto-detected from key
  baseUrl?: string;         // Override API URL
  timeout?: number;         // Request timeout (default: 30000ms)
  maxRetries?: number;      // Retry attempts (default: 3)
  debug?: boolean;          // Enable debug logging
});
```

### Resources

| Resource | Methods |
|----------|---------|
| `passage.applications` | `list()`, `get()`, `create()`, `submitDraft()` |
| `passage.offers` | `getPrequalified()`, `acceptPrequal()`, `getFinal()`, `acceptFinal()` |
| `passage.loans` | `list()`, `get()`, `getPaymentSchedule()`, `getByApplication()` |
| `passage.lenders` | `list()` |
| `passage.account` | `getInfo()`, `getWebhook()`, `updateWebhook()`, `testWebhook()`, `rotateWebhookSecret()` |
| `passage.signing` | `create()`, `getStatus()`, `list()` |
| `passage.sdx` | `getToken()`, `upload()`, `uploadDocument()`, `storeKYCHandle()` |

### Crypto Utilities

```typescript
import {
  // Encryption
  hybridEncrypt,
  encryptPII,
  encryptPIIForLenders,
  encryptDocumentForSDX,
  checksum,

  // Decryption
  hybridDecrypt,
  decryptOfferDetails,
  decryptOffers,
} from '@portola/passage-neobank/crypto';
```

### Error Handling

```typescript
import {
  PassageError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
  NetworkError,
  TimeoutError,
} from '@portola/passage-neobank';

try {
  await passage.applications.get('invalid_id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Application not found');
  } else if (error instanceof ValidationError) {
    console.log('Validation errors:', error.fields);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  }
}
```

## Environments

The SDK auto-detects your environment from the API key prefix:

| API Key Prefix | Environment | Blockchain | Behavior |
|----------------|-------------|------------|----------|
| `nb_test_*` | Sandbox | Base Sepolia | Mock lenders, auto-signing, TestUSDC |
| `nb_live_*` | Production | Base Mainnet | Real lenders, HelloSign, real USDC |

```typescript
const passage = new Passage({
  apiKey: process.env.NEOBANK_API_KEY!, // Environment auto-detected
});

console.log(passage.isSandbox);    // true for nb_test_*
console.log(passage.isProduction); // true for nb_live_*
```

## Webhook Events

| Event | Description |
|-------|-------------|
| `application.status.changed` | Application status updated |
| `prequal_offer.received` | New prequalified offers available |
| `final_offer.received` | Final offer ready after hard pull |
| `signing.session_created` | Document signing session ready |
| `signing.completed` | Borrower completed signing |
| `funding.disbursed` | Loan funds sent to borrower wallet |
| `loan.status.changed` | Loan status updated |

## Documentation

For complete documentation, guides, and examples:

- **Documentation:** [docs.tryportola.com](https://docs.tryportola.com)
- **Quickstart:** [docs.tryportola.com/quickstart](https://docs.tryportola.com/quickstart)
- **API Reference:** [docs.tryportola.com/api-reference](https://docs.tryportola.com/api-reference)
- **Developer Portal:** [dashboard.tryportola.com](https://dashboard.tryportola.com)

## Related Packages

- [`@portola/passage`](https://www.npmjs.com/package/@portola/passage) - Low-level API client for advanced use cases

## License

MIT
