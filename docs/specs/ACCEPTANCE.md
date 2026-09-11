# Managed MVP acceptance gates

Updated 2026-09-11. These are requirements, not passed results.

1. Curated pools: factory/token/fee/decimals cross-checks, real liquidity, Graph coverage and timestamp; stablecoin depeg and ETH exposure disclosures.
2. Graph: real gateway success, same-block RPC identity/price cross-check, historic rows; invalid key, wrong chain/pool/schema, indexing errors, missing history, stale block, 429 and timeout fail honestly.
3. DeepSeek: real deepseek-flash tool-call interaction uses Graph evidence and deterministic calculations; bounded calls, prompt-injection data cannot change policies; no fabricated tool results, empty/invalid replies fail safely.
4. Privy: actual login, app-audience auth, user-owned wallet selection; IDOR negatives for strategy, wallet, plan and journal. Missing credentials visibly block the relevant feature.
5. Approval: exact plan/version and mandate displayed. Delegated signer must carry a restrictive policy. Wrong user/chain/recipient/spender, changed amount, expiry, nested multicall escapes and arbitrary calldata rejected.
6. LP lifecycle: entry and receipt/tokenId ownership, partial withdrawal, collect, same-pool reposition, exit and residual balances. Cost basis/fee data limitations preserved.
7. Automation: browser closed, scheduled durable run, bounded AI investigation, supported trigger and HOLD, cooldown/cost/operation caps, pause/revoke, restart and duplicate-click tests.
8. Recovery: partial transaction failure leaves correct asset state; unknown timeout never blindly resends; process crash before/after signing remains recoverable; approval changes invalidate execution.
9. LI.FI: real route and unsigned transaction, correct source/target and min-out, user-approved source funding; destination reconciliation before mint. No unnecessary bridge.
10. Isolated Docker/fork execution with disposable wallets and no personal signing credentials; explicit mainnet approval before real funds.
11. Browser vertical flow and production image startup. Private APIs reject unauthenticated access. Build-time secret absence, dependency gate, single-replica volume persistence.
12. Actual mainnet entry and authorized management receipt versus explicitly labelled replay. Real provider success and wallet tests cannot be replaced by fixtures.
13. Public deployment HTTPS, runtime revision and private API protection; sponsor README/source evidence, LICENSE, feedback form, human demo and truthful AI disclosure separately.
