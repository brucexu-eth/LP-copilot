# LP Copilot — maintainer handoff

## Current baseline

Implementation: `fd41af7`. This is a locally verified research + mock-management rehearsal, NOT a live automated LP manager. Bruce takes over the remaining implementation and acceptance. No continuing development worker is implied.

Implemented and exercised:
- DeepSeek tool calls and real Ethereum RPC; Graph history explicitly synthetic.
- Account-scoped durable conversations and structured HOLD/WIDEN/EXIT calculation candidates. These are not personalized strategy selections.
- Privy login/wallet entry points; real user login/allowlist/wallet acceptance still outstanding.
- Live read-only LI.FI USDC quotes from Arbitrum/Base to Ethereum, same linked recipient; transaction payload stripped. Quote tests use a public fixture address, not a funded account.
- Same research page can copy a comparison range into a new mock entry, confirm policy and exact draft version, execute, inspect and exit. This is not a real WIDEN operation. The lab cookie is shared within a browser; private research text and auth tokens are not copied.
- Synthetic worker lifecycle, failure injection, retry, cancellation, pause/revoke, database restart recovery. Local atomicity is not proof of safe external transaction submission.

Latest local baseline: 45 tests + build passed; clean-checkout desktop/mobile research-to-mock-entry/exit and saved conversation recovery passed. Original mock lifecycle regression passed. Bounded review of fd41af7 found no confirmed P0/P1 in its scope. No production acceptance or real funds operation performed.

## First walkthrough

Use the existing server checkout and `.env`; never commit or share secret values. `npm run dev:mock` builds and starts the loopback-only app; open `http://127.0.0.1:3400` via an appropriate local/SSH forwarding setup. Existing Privy origins and operator allowlist may need explicit approval/configuration before a real login works; do not bypass authentication to make the demo pass.

1. Login and verify wallet identity/balance. Record missing account configuration separately from code defects.
2. Ask a NEW research question; old persisted answers are not backfilled with new candidate cards. Check provenance and mock history warning.
3. Inspect HOLD/WIDEN/EXIT; under WIDEN choose the inline mock rehearsal.
4. Restore lab → synthetic funding → explicitly approve mock policy → choose capital → save range → confirm displayed version → execute mock entry → inspect position → exit.
5. Read-only funding quote is separately available alongside wallet/research. Refresh stale quotes; no real bridge button exists.
6. For partial failure and restart recovery, use `/lab`. Pausing does not withdraw; current simulator may require cancellation and a new explicit policy to exit after pause.

Do not record synthetic funding, fees or execution as real results. A mixed demo must label each boundary visibly.

## Remaining work — ordered acceptance checklist

- [ ] **Account acceptance:** real Privy login, exact operator allowlist, user-controlled create/select wallet and balances checked against RPC. App secret alone grants no transaction authority.
- [ ] **Data:** provision/verify Graph access, indexed history freshness and same-block consistency. Resolve isolated fork RPC availability; do not replace failed real tests with synthetic evidence.
- [ ] **Strategy:** collect capital/risk/horizon objectives; distinguish comparison from recommended action. Persist trusted evidence-to-proposal association and full historical versions; invalidate confirmation after material changes. Existing client range copy stays mock/unverified.
- [ ] **Contract lifecycle:** exercise mint/increase/decrease/collect/reposition/exit against actual contracts on an isolated fork; check NFT/liquidity/token deltas and leftovers. Unsigned builders are not execution acceptance.
- [ ] **Authority:** implement/test provider-enforced constrained signer: wallet, pool/actions, principal/allowance, recipient, slippage/fee/count/expiry, pause/revoke. Explicit approval required before granting permissions.
- [ ] **Funding:** expand read-only quote into reviewable execution only after approval; itemize fees, refresh quotes, verify actual settlement and refund/failed routes. Current quote is not an allowance or arrival guarantee.
- [ ] **Real worker:** persist observations and execution phases; freshness/cost-benefit gates, nonce/transaction deduplication, UNKNOWN submission reconciliation, restart safety and pause/revoke. Never resend merely because a timeout occurred.
- [ ] **Dependencies:** production audit last reported 47 advisories, including 7 high. Ordinary `npm audit fix --ignore-scripts` made no changes. Assess major SDK replacements/removal of transitive tooling; rerun auth, math, build and browsers after changes. Do not blindly force upgrades/downgrades.
- [ ] **Release:** approve hosting/configuration and manually accept online behavior. Current server intentionally binds loopback; pushing main is not proof of deployment. No Coolify operations were performed in these iterations.
- [ ] **Real funds acceptance:** Bruce approves exact wallet, amount, pool/range, spender/allowance, recipient, slippage/fees and duration before small real tests; preserve receipts and reconciliation evidence.

## Reproduce checks

- `npm run check`
- `node scripts/verify-research-browser.mjs` — test login/AI fixtures, actual local UI/DB/mock engine.
- `npm run verify:simulation` — offline lifecycle, failures and restart.
- `node scripts/verify-funding-browser.mjs` — fixture identity, real LI.FI; external availability required.
- `GRAPH_MODE=mock node --env-file=.env scripts/verify-agent-live.mjs` — requires locally configured DeepSeek key and RPC; no key copied into docs. In the previous run the key was securely injected from host runtime, not assumed present in project .env.
- `scripts/verify-fork-lifecycle.mjs` remains unaccepted; inspect its local-fork-only prerequisites before use.

## Evidence references

[Connected rehearsal](CONNECTED_REHEARSAL.md) · [Funding](FUNDING_PROGRESS.md) · [Versioned proposals](PROPOSAL_PROGRESS.md) · [Mock semantics](MOCK_HANDOFF.md) · [Research](RESEARCH_PROGRESS.md) · [PRD](PRD.md).

Older progress docs describe their respective increment; this handoff supersedes stale statements that live quotes or same-page mock rehearsal have not been implemented. Their real-execution limitations still apply.
