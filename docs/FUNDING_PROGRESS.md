# Read-only LI.FI funding quotes

Implemented `POST /api/funding-quote`, using existing verified Privy account/allowlist authorization. Supports native USDC on Arbitrum/Base to Ethereum USDC, same linked sender/recipient. The backend checks the returned chain, tokens, decimals, amount and addresses, and strips transactionRequest/approval payloads. No signing, broadcasting or balance assertions.

The account page now includes Funding beside wallet and research components. User clicks explicitly share address/amount with LI.FI. Amount or chain changes clear prior quotes; inputs lock during requests. A 30-second local freshness timer marks STALE, not a claim of provider-guaranteed expiry. Fees may be additional and are not yet itemized. Quote requests are not durable execution plans.

Live verification used the public dead-address fixture, never an owned wallet or funds: real Arbitrum → Ethereum 100 USDC quote returned through LI.FI. Actual Chromium Funding component → local HTTP route → real LI.FI passed at desktop/mobile widths, including stale timer and clearing changed input. Authentication is a test fixture in this harness, not real Privy login acceptance. Existing mock lifecycle browser regression also passed. Tests cover invalid/unlinked inputs, malformed provider envelopes and HTTP authentication/origin/method gates.

Official contract: https://docs.li.fi/api-reference/get-a-quote-for-a-token-transfer

Commands: `node scripts/verify-funding-live.mjs`, `node scripts/verify-funding-browser.mjs`, `npm run check`.

Dependency remediation attempt: `npm audit fix --ignore-scripts` made no dependency changes; audit still reports 47 production advisories, 7 high. No forced major SDK replacement performed. Real bridge execution, settlement/refunds, fork lifecycle, authenticated research-to-proposal integration and SDK remediation remain incomplete. No production probe or deployment performed.
