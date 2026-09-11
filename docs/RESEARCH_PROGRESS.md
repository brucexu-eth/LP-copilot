# Development progress — research, mock provenance and unsigned LP foundation

This is **partial delivery**, not completion of the managed LP MVP. Graph mocks were explicitly authorized for development; they are not live evidence.

## Implemented and exercised
- Explicit `GRAPH_MODE=mock` fixture, stable invented historical values, source labels on rows and the main result status. Live mode never silently falls back. Mock/unavailable evidence cannot pass `requireLiveEvidence`; application signing remains disabled regardless of mode.
- DeepSeek `deepseek-flash` bounded tool loop, one registered public read/calculation tool, strict argument validation, four model rounds/four tool calls maximum, per-investigation timeouts. No secret, write, arbitrary URL or signing tool is supplied to the model.
- Real DeepSeek interaction invoked the actual RPC/math tool and returned a source-grounded answer. Evidence recorded in local ignored `artifacts/agent-live.json`: Ethereum RPC block 25954783, one tool call, history status `mock`, execution disabled. The existing operator DeepSeek credential was injected only into the verification process; no secret was printed, committed, or copied into project config.
- Authenticated `/api/chat`, `/api/conversations` and `/api/wallets` endpoints. Identity derives from verified Privy token, never query/body user IDs. Missing allowlist fails closed.
- Durable per-subject conversation requests in SQLite, versioned migration `001_workspace.sql`, WAL/FULL synchronous writes, bounded hourly calls, same-account in-flight exclusion, request-ID idempotency and changed-payload rejection. Failed/interrupted calls are not completed answers. This database is application-local, not shared PostgreSQL.
- React research UI restores saved conversations, displays mock warning and raw tool evidence, and hides private state on account changes. Desktop/mobile browser tests used an explicitly locally signed authentication fixture and fixture AI answer: submitted, persisted, reloaded, and recovered after server restart. This is not real Privy user-login evidence.
- User-click-only Privy embedded wallet creation using SDK defaults for user ownership, explicit `createAdditional:false` and empty signer list; no automatic creation or app signer. RPC wallet balance reader preserves raw units, pins block and rejects failures/wrong chain. Real create-wallet/user acceptance is still pending.
- Typed **unsigned** Uniswap mint/increase/decrease/collect construction, integer amounts, exact token approvals, fixed manager/recipient, chain/pool/owner checks, fresh state and bounded slippage/deadline. New one-sided range-order entries are rejected. These builders are not exposed as executable HTTP endpoints.

## Verification
- Secret scan: both substantive configured Privy/DeepSeek secrets were checked against tracked files and built frontend assets; zero matches. An initial match was the literal three-character placeholder in `.env`, not the effective Privy credential. Node's effective credential is non-placeholder; no credential was printed. `.env` is owner-only (`0600`).
- Final source wiring is included in commit `1fbe350`. A clean checkout initially caught omitted staging of `server.mjs`; it was committed before delivery, then clean-checkout tests/build and browser restart tests were rerun successfully. Working-tree-only success was not accepted as release evidence.
- Fresh worktree: `npm ci --ignore-scripts`, `npm rebuild better-sqlite3`, `npm run check` all passed on the final code. Installed SDKs emit Node engine warnings on the host's Node 20.11; CI uses Node 22. Public-hosting dependency review remains open.
- Existing real-RPC learning/public NFT/invalid NFT browser checks passed at desktop/mobile with mock mode enabled. Explicit mock labels were asserted in the status and history rows.
- Final real Privy login-modal smoke passed at desktop/mobile with no page errors or upstream failures. No user login/code submission was performed.
- One read-only review found no confirmed P0/P1 in the changed source. It inspected the then-working-tree HTTP wiring, which is now committed unchanged in `1fbe350`; this is not a live execution security certification.
- `npm test`: 29 tests passed before final release check.
- `npm run check`: tests, syntax checks and production frontend build passed.
- `node scripts/verify-research-browser.mjs`: desktop 1280 and mobile 390, no page errors or overflow; persistence/restart checks passed. Authentication/model were explicit test fixtures.
- `scripts/verify-agent-live.mjs`: actual DeepSeek + RPC + calculator, explicitly mock Graph history. Requires server-side DeepSeek key.
- SQLite native dependency installed and exercised; CI and README now explicitly rebuild only `better-sqlite3` after `npm ci --ignore-scripts`.

## Fork execution blocker — NOT a successful rehearsal
A pinned official Foundry image was pulled: `ghcr.io/foundry-rs/foundry@sha256:043752653d5be351c71709091b3db97c4421c907eb40ea294195e7f532aadf46`.
Disposable containers used chain 31337, loopback-only port, dropped capabilities, resource limits and no host mounts or personal signing credentials.
- `https://1rpc.io/eth`: Anvil failed creating genesis; upstream account read returned HTTP/RPC 503.
- `https://ethereum-rpc.publicnode.com` and `https://eth.llamarpc.com`: Anvil failed fetching fork block with TLS `InvalidContentType`.
No fork became ready. Therefore `scripts/verify-fork-lifecycle.mjs` could not execute its transaction path. It is a prepared local-only rehearsal, not verified LP lifecycle evidence. It fixes the RPC endpoint to loopback and checks Anvil/chain 31337 before sending any test transaction. A working archive-capable upstream in the isolated environment is still required.

## Still incomplete (not all credential blockers)
1. Real Privy account allowlist, user login, wallet creation and balance UI acceptance.
2. Project runtime DeepSeek credential provisioning (the successful verification used process-local credential injection), real Graph key/index coverage and same-indexed-block workflow.
3. Versioned entry/management approvals, matching restricted Privy signer policy and actual signing/revocation tests.
4. Integrated LP lifecycle executor/reconciliation, unknown-outcome recovery and failure/restart rehearsal.
5. LI.FI funding/ratio exchange and destination-funds reconciliation.
6. Durable monitor/scheduler, strategy journal, pause/revoke and bounded automatic same-pool management.
7. Remaining dependency advisories and public deployment/security acceptance. Non-forced `npm audit fix --ignore-scripts` did not clear the previously reported high advisories. No forced SDK downgrade or broad override was applied.
8. Separately authorized small mainnet funding/entry/management, online acceptance and hackathon release materials.

No live funds, wallet creation, signer installation, actual trade or production deployment was performed in this development run.
