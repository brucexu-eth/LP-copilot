# Simulation handoff and real-integration TODOs

## Delivered scope

An opt-in **offline Simulation Lab**, not a live trading release. The user approved explicit mocks to prepare a complete walkthrough before joint manual advancement. Existing real RPC / DeepSeek research stays on `/`; the separate `/lab` uses only synthetic state.

- Wallet: synthetic cash ledger; no wallet address, secret, Privy login or signature.
- Funding: mock QUOTE → BRIDGE phases; no real LI.FI API payload, transaction, quote or cross-chain settlement.
- Policy: explicit simulated confirmation, capital/fee/slippage/expiry/daily-action limits, pause/revoke. No remote permission is granted.
- LP lifecycle: entry, increase, partial decrease, fee collection, same-pool-style repositioning and exit. Amounts are **synthetic USD cents**, NOT token accounting, Uniswap math, PnL or real liquidity.
- Worker: persists the next uncommitted phase. While the local Node server runs, closing the browser does not stop mock jobs. Service restart resumes committed state. A synthetic out-of-range observer has a 60-second cooldown and action limits.
- Failure recovery: inject a failure before a selected phase; retry continues from that phase. Cancel preserves the current state, rather than pretending completed removal/collection never happened.
- Conservation: funded + injected fees = cash + deployed + unclaimed + mock costs. Fixed $2 costs and injected $3 fees are fixtures, not estimates or yield forecasts.
- Never emits a fake chain transaction hash. No switch or configuration value can turn this engine into a real signer.

## Start locally

```sh
npm ci --ignore-scripts
npm rebuild better-sqlite3
npm run dev:mock
# http://127.0.0.1:3400/lab
```

`dev:mock` expects the existing local `.env` (as does the original dev command). For a secret-free lab start without any `.env`:

```sh
ENABLE_SIMULATION_LAB=1 GRAPH_MODE=mock node server.mjs
```

The lab does not need frontend build artifacts or any provider key. It is **disabled by default** and rejects non-loopback connections, foreign Host headers and cross-origin requests. It does not bypass `/api/me`, `/api/wallets` or `/api/chat` authorization. Synthetic sessions use an HttpOnly SameSite cookie and a separate `data/simulation.sqlite` database. `SIMULATION_DB_PATH` optionally selects another local test database.

These commands are startup instructions, not a claim that a server has been left running. Browser verifiers stop their temporary servers and remove their temporary databases.

## Short manual walkthrough

1. Start workspace; fund $1,000; wait until mock bridge COMPLETE.
2. Confirm default mock policy; enter $800; inspect cash, LP and fixed cost.
3. Inject the explicit $3 fee fixture; select MINT failure; queue reposition and immediately inject failure before that phase.
4. Observe removal/collection already committed. Refresh or restart the local service: state remains BLOCKED, not falsely complete. Retry resumes MINT exactly once.
5. Exit and check the conserved synthetic ledger. Revoke; subsequent delegated simulated actions are rejected.
6. For observer behavior, open a position under an automatic policy, change synthetic price beyond its range, and leave the server running through the 60-second cooldown. Observe one queued reposition; no AI or market prediction is involved.
7. Inspect every real-integration TODO below. Passing this walkthrough is only mock-flow acceptance.

## Real-integration TODO registry

- [ ] **REAL-GRAPH** — replace synthetic history with authorized Graph access; test missing/stale/indexer lag and same-block RPC reconciliation. Existing live reads must not silently fall back to fixtures.
- [ ] **REAL-PRIVY** — manual login, exact user allowlist, create/select user-owned wallet, compare linked-wallet balances against real chain. Existing modal smoke is not login acceptance.
- [ ] **REAL-AUTHORITY** — configure a real constrained signer and provider-enforced restrictions; verify fixed recipient, allowed pool/actions, budget, expiry, revoke/pause. Mock policy is not a security enforcement substitute.
- [ ] **REAL-LIFI** — verified supported route, real quote refresh, expiry, actual target-chain receipt/token delta and refund paths. No generic swap/bridge JSON fixture is accepted as vendor-contract proof.
- [ ] **REAL-LP** — resolve isolated fork RPC connectivity; test existing unsigned mint/increase/decrease/collect builders against actual contracts, then full reposition/exit lifecycle and leftovers. Isolated fork is still unverified.
- [ ] **REAL-WORKER** — persistent real observations, data freshness, costs/benefit checks, provider nonce/transaction idempotency and UNKNOWN submission reconciliation, no repeat sends after restart. SQLite-only atomicity does not cover an external network side effect.
- [ ] **REAL-RESEARCH-PLAN** — connect authenticated evidence-backed dialogue to reviewable durable real-operation proposals; do not let a model mutate signer constraints or treat mock research as executable evidence.
- [ ] **REAL-RELEASE** — resolve inherited dependency advisories, approve public-hosting configuration, verify deployment manually. A fresh audit still reports 7 high advisories; no unsafe forced SDK downgrade or blind override was applied.
- [ ] **REAL-FUNDS** — Bruce approves exact test wallet, principal, spender/allowance, pool/range, fees/slippage, recipient and duration before any small real transaction. No funds authorization was given by approving mocks.

## Verification

Frozen implementation: `0203752` (relative to `f32b7b3`). Clean-checkout canonical check passed with **38 tests, zero failures**, plus production frontend build. Desktop 1280 and mobile 390 browser runs both passed lifecycle, partial-failure service restart/resume, exit/revoke and layout checks; **zero external requests and zero page errors**. A single bounded independent read-only review found no confirmed newly introduced P0/P1. This excludes real integrations and inherited SDK advisories.


- `npm run check` is the canonical syntax/test/build gate.
- `npm run verify:simulation`: real desktop/mobile Chromium clicks, offline request interception, persistent service restart, partial failure/retry, exit/revoke and overflow checks.
- Tests cover conservation, user-session isolation, idempotency/conflicts, capital/fee/expiry/slippage gates, pause/revoke, daily count/cooldown, two database handles, and a real child-process SIGKILL after a committed phase.
- Domain math/unsigned transaction tests from the previous iteration remain separate. No mock test is labelled an on-chain or real Privy/LI.FI acceptance result.
