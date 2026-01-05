// src/resources/wallets.ts
function isAOPPChallenge(challenge) {
  return "aoppUri" in challenge;
}
function isMessageSignChallenge(challenge) {
  return "nonce" in challenge && "signingStandard" in challenge;
}

export { isAOPPChallenge, isMessageSignChallenge };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map