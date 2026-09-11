# Technical design — managed LP MVP

Updated 2026-09-11. Normative scope: [PRD](PRD.md). Supersedes older read-only-only and per-transaction-only target designs. Implementation evidence belongs in REPORT.md, not this design.

## Architecture
Browser (React + Privy) -> authenticated same-origin API -> deterministic calculator / evidence adapters / agent tools / durable strategy store.
Durable monitor -> Graph + RPC snapshots -> bounded DeepSeek investigation -> mandate validator -> versioned transaction plan -> Privy restricted signer -> Uniswap / required LI.FI steps -> receipt/ownership/balance reconciliation -> user-visible journal.

- Server-only environment: DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL=deepseek-flash, GRAPH_API_KEY, ETH_RPC_URL, PRIVY_APP_SECRET, signer authorization key. Never expose secrets through Vite build variables, errors, logs or model context.
- Public runtime config: Privy app/client ID, curated pool metadata, feature availability. The browser retrieves it at runtime; secrets are not build arguments.
- Authenticate Privy access tokens for the exact app and resolve wallet ownership from Privy, never from client-supplied wallet IDs. Scope every strategy, conversation, plan and journal to the authenticated subject. Enforce an operator allowlist for initial release.
- Graph: discover a deployment, fetch indexing metadata, choose a recent indexed block and verify against RPC at that exact block (rather than requesting an unindexed RPC head). Preserve historical timestamps, partial intervals and source limits.
- AI: documented OpenAI-compatible DeepSeek tool calls. Allow only registered read/calculation/proposal tools; bounded turns, timeouts, validated arguments, no arbitrary network/transaction access. Model proposals never mutate mandates. Scheduled checks use the same evidence/policy path as chat.
- Persistence: private application-local state, single writer and exclusive process lock; durable versioned records, atomic writes, recovery on restart. No new shared PostgreSQL schema. Single replica until a transactional multi-worker store is implemented.
- Scheduler: survives browser closure, records next run and outcome. Deduplicate triggers, serialize by wallet, recheck authority immediately before signing. Pausing can leave already submitted transactions pending; reconcile them without submitting new actions.
- Executor: typed builders only, integer units, allowlisted contracts, ABI/calldata validation including nested calls. Simulate before submission; persist intent before signing and preserve unknown outcomes for reconciliation. Never blindly resubmit on timeout.
- Privy: user-owned wallet, app additional signer with mandatory matching restrictive policy. Read back signer/policy before live use, test revocation and scope violations. App caps cannot replace wallet-level authorization.
- LI.FI: validate actual returned route/transaction, source chain/asset/amount, destination recipient, min-out, allowance target, expiry and costs. Destination receipt/funds before use. No arbitrary quote-to-send passthrough.

## Execution states
DRAFT -> AWAITING_APPROVAL -> VALIDATING -> FUNDING -> REMOVING -> COLLECTING -> SWAPPING -> ADDING -> RECONCILING -> COMPLETE.
Each step: NOT_STARTED / SUBMITTED / CONFIRMED / FAILED / UNKNOWN. Skip irrelevant steps; HOLD has no transactions. Chain IDs, hashes, nonce and balances identify recovery. UNKNOWN blocks resubmission until reconciled. Never imply rollback of already confirmed external steps.

## Hosting
Dockerized single-replica application on the current host's Coolify. Public domain confirmed as lpcopilot.brucexu.xyz. Use the existing wildcard tunnel and http Coolify origin domain; verify public HTTPS separately. Persistent app volume, runtime-only secrets, auth before private/cost-bearing endpoints. No live signing enabled without credential/policy and isolated-execution acceptance.
