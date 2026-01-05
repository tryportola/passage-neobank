'use strict';

// src/resources/wallets.ts
function isAOPPChallenge(challenge) {
  return "aoppUri" in challenge;
}
function isMessageSignChallenge(challenge) {
  return "nonce" in challenge && "signingStandard" in challenge;
}

exports.isAOPPChallenge = isAOPPChallenge;
exports.isMessageSignChallenge = isMessageSignChallenge;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map