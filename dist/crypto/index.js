'use strict';

var crypto = require('crypto');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var crypto__default = /*#__PURE__*/_interopDefault(crypto);

// src/crypto/encrypt.ts
function hybridEncrypt(data, publicKeyPem) {
  const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  const aesKey = crypto__default.default.randomBytes(32);
  const iv = crypto__default.default.randomBytes(12);
  const cipher = crypto__default.default.createCipheriv("aes-256-gcm", aesKey, iv);
  const encryptedData = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  const encryptedKey = crypto__default.default.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto__default.default.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    aesKey
  );
  return {
    encryptedData: encryptedData.toString("base64"),
    encryptedKey: encryptedKey.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}
function checksum(data) {
  const buffer = typeof data === "string" ? Buffer.from(data) : data;
  return crypto__default.default.createHash("sha256").update(buffer).digest("hex");
}
function encryptPII(lenderId, lenderPublicKey, piiData) {
  const payload = hybridEncrypt(JSON.stringify(piiData), lenderPublicKey);
  return {
    lenderId,
    // Note: encryptedData is JSON-stringified here because EncryptedPIIPayload.encryptedData
    // is typed as string (for API transport). When parsed, it yields a HybridEncryptedPayload.
    // This double-serialization is intentional to match the API contract.
    encryptedData: JSON.stringify(payload)
  };
}
function encryptPIIForLenders(lenders, piiData) {
  return lenders.map(
    (lender) => encryptPII(lender.lenderId, lender.publicKey, piiData)
  );
}
function encryptDocumentForSDX(document, publicKey) {
  const aesKey = crypto__default.default.randomBytes(32);
  const iv = crypto__default.default.randomBytes(12);
  const cipher = crypto__default.default.createCipheriv("aes-256-gcm", aesKey, iv);
  const encryptedData = Buffer.concat([
    cipher.update(document),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  const encryptedKey = crypto__default.default.publicEncrypt(
    {
      key: publicKey,
      padding: crypto__default.default.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    aesKey
  );
  const metadata = {
    encryptedKey: encryptedKey.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
  const metadataBuffer = Buffer.from(JSON.stringify(metadata), "utf-8");
  const result = Buffer.alloc(4 + metadataBuffer.length + encryptedData.length);
  result.writeUInt32BE(metadataBuffer.length, 0);
  metadataBuffer.copy(result, 4);
  encryptedData.copy(result, 4 + metadataBuffer.length);
  return result;
}
function hybridDecrypt(encryptedPayloadJson, privateKeyPem) {
  let payload;
  try {
    payload = JSON.parse(encryptedPayloadJson);
  } catch {
    throw new Error("Invalid encrypted payload: malformed JSON");
  }
  if (typeof payload.encryptedData !== "string" || typeof payload.encryptedKey !== "string" || typeof payload.iv !== "string" || typeof payload.authTag !== "string") {
    throw new Error(
      "Invalid encrypted payload: missing required fields (encryptedData, encryptedKey, iv, authTag)"
    );
  }
  const encryptedKey = Buffer.from(payload.encryptedKey, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const encryptedData = Buffer.from(payload.encryptedData, "base64");
  const aesKey = crypto__default.default.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto__default.default.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    encryptedKey
  );
  const decipher = crypto__default.default.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);
  return decrypted.toString("utf-8");
}
var KNOWN_OFFER_FIELDS = /* @__PURE__ */ new Set([
  "apr",
  "interestRate",
  "termMonths",
  "monthlyPayment",
  "totalRepayment",
  "originationFee",
  "originationFeePercent",
  "prepaymentPenalty",
  "latePaymentFee"
]);
function decryptOfferDetails(encryptedPayload, expectedChecksum, privateKeyPem) {
  const decrypted = hybridDecrypt(encryptedPayload, privateKeyPem);
  const rawData = JSON.parse(decrypted);
  const additionalFields = {};
  for (const key of Object.keys(rawData)) {
    if (!KNOWN_OFFER_FIELDS.has(key)) {
      additionalFields[key] = rawData[key];
    }
  }
  const data = {
    apr: rawData.apr,
    interestRate: rawData.interestRate,
    termMonths: rawData.termMonths,
    monthlyPayment: rawData.monthlyPayment,
    totalRepayment: rawData.totalRepayment,
    originationFee: rawData.originationFee,
    originationFeePercent: rawData.originationFeePercent,
    prepaymentPenalty: rawData.prepaymentPenalty,
    latePaymentFee: rawData.latePaymentFee,
    ...Object.keys(additionalFields).length > 0 && { additionalFields }
  };
  const checksum2 = crypto__default.default.createHash("sha256").update(decrypted).digest("hex");
  return {
    data,
    checksum: checksum2,
    verified: checksum2 === expectedChecksum
  };
}
function decryptOffers(offers, privateKeyPem) {
  return offers.map((offer) => {
    try {
      const result = decryptOfferDetails(
        offer.encryptedOfferDetailsNeobank,
        offer.checksumSha256,
        privateKeyPem
      );
      return {
        offer,
        details: result.data,
        verified: result.verified
      };
    } catch (error) {
      return {
        offer,
        details: null,
        verified: false,
        error: error instanceof Error ? error.message : "Unknown decryption error"
      };
    }
  });
}

exports.checksum = checksum;
exports.decryptOfferDetails = decryptOfferDetails;
exports.decryptOffers = decryptOffers;
exports.encryptDocumentForSDX = encryptDocumentForSDX;
exports.encryptPII = encryptPII;
exports.encryptPIIForLenders = encryptPIIForLenders;
exports.hybridDecrypt = hybridDecrypt;
exports.hybridEncrypt = hybridEncrypt;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map