# Privy authentication foundation — verification record

2026-09-11. This is an incremental authentication slice, **not completion of the managed LP MVP**.

## Implemented
- Runtime public config exposes only app ID and feature flags, never the app secret.
- Email login UI using Privy React SDK, with wallet creation and external connections disabled.
- Backend SDK verifies ES256 access token, issuer, audience, expiry and subject; empty operator DID allowlist denies private access.
- Wallet lookup derives user ID from the verified token and returns minimal linked Ethereum wallet fields. No client-supplied wallet/user identity is trusted.
- No signing, wallet creation, mandate, monitoring, funding or execution endpoints.
- Existing public read-only position analysis remains independent of login. Server still binds loopback only.

## Executed evidence
- Existing baseline: 12 tests passed before changes.
- New full suite: 17 tests passed, including locally signed synthetic JWTs, invalid/expired/wrong-app tokens, unauthorized subject, mismatched upstream user, provider error redaction, HTTP identity substitution and secret/path protection.
- Vite production build passed. Built assets scanned against the configured app secret: no match.
- Real Privy authenticated app-settings GET returned success. Configured app ID and production allowed domain matched; email authentication enabled. No settings were changed.
- Existing RPC-backed learning/import browser regression passed at desktop and mobile: live public NFT loaded, invalid NFT rejected, old results cleared, no page errors or overflow.
- Real SDK login modal rendered at desktop 1280px and mobile 390px, no uncaught page errors, no failed local asset requests and no horizontal overflow. One desktop Privy analytics request returned 403; mobile run had no upstream failures. No email or verification code was submitted.

## Not verified / blockers
- Actual user login and authenticated real-user wallet lookup await user participation; synthetic token tests are not real Privy sessions.
- Operator DID allowlist is not configured. It must not be inferred from the first account or client request; operator approval is separate from login.
- Graph API key is absent from the project environment. Real Graph coverage and Graph-to-AI flow remain unverified.
- No deployed-site checks, funding, signatures, mainnet transactions or autonomous management were performed.
- `npm audit --omit=dev` reports 47 advisories (7 high, 29 moderate, 11 low; no critical), including transitive Uniswap/Privy dependencies. Reachability/remediation is not certified in this slice; dependency/public-hosting security acceptance remains blocked. Do not expose this loopback development build as a completed production service. SDK build also emits upstream annotation and large-chunk warnings.

## Reproduce
`npm run check`

`node --env-file=.env scripts/verify-auth-browser.mjs`

The browser test starts and closes its own loopback server. It never submits email, creates accounts or moves funds.
