# LP Copilot — technical design

Status: target architecture, 2026-09-07. Current runtime remains the read-only Ethereum learning workbench.

## Components
- Registry: verified chainId, contracts, token identities, fee tiers, supported pools and supported LI.FI funding paths. Fail closed on unknown identities.
- Data adapters: RPC current state and receipts; Graph indexed history with freshness evidence; public LI.FI quotes/routes/unsigned transactions. Record provider, block, observedAt and errors.
- Deterministic calculators: integer token amounts, token ordering, decimals, tick spacing, liquidity, residual inventory and cost-aware scenarios. Display floats must never construct transactions.
- Agent tools: typed read/calculate/compare/propose methods. External responses and token metadata are untrusted data, never instructions. All mutations pass through the policy gate.
- Planner: versioned plans with chain, pool, assets, amounts, ticks, recipient, spender, min-out, cost/slippage limits, expiry and ordered steps.
- Approval gate: bind explicit user approval to a plan fingerprint. Revalidate live preconditions before each step. Any material drift invalidates approval.
- Executor and journal: persist plan/step identifiers, approval reference, transaction hashes, source/destination chain, receipts and reconciliation status. No embedded private keys.
- Monitor: refresh state and evaluate alerts/rejection rules. Proposals do not mutate capital. Monitoring frequency, thresholds and notification channel must be configured before enabling a live monitor.

## Non-atomic execution
DRAFT -> AWAITING_APPROVAL -> VALIDATING -> FUNDING -> REMOVING_LIQUIDITY -> COLLECTING -> SWAPPING -> ADDING_LIQUIDITY -> RECONCILING -> COMPLETE.
Skip steps that are not needed by the approved action. A funded entry need not remove an existing position; HOLD has no transaction steps.

Each step is NOT_STARTED, SUBMITTED, CONFIRMED, FAILED or UNKNOWN. UNKNOWN is reconciled by transaction hash/nonce and chain state before retry. Cross-chain source confirmation is not destination settlement; wait for finality, bridge status and destination balance before spending. Failed swaps leave an explicit token inventory, not a fictional rollback. Resume from durable state without repeating confirmed actions. A changed recovery plan requires approval.

## Network feasibility gate
Validate Robinhood against official network documentation and actual RPC, Uniswap, Graph and LI.FI responses. Freeze chainId, network environment, contracts, pool, fee tier, sample position and freshness limits only after evidence. If unsupported, record Adjust/Stop and obtain a network decision; do not relabel Ethereum results.

## Security and operating boundaries
Use only public APIs and public contract interfaces. Never ingest production private keys. Check destination, spender, calldata target, amounts, fee limits, quote expiry, allowance scope and chain identity. Block stale data, insufficient funds, unexpected contracts, invalid approval and excessive costs. Isolate fork execution and test wallets. Mainnet activity needs explicit authorization.

## Implementation status
Existing source: src/config.mjs, src/data.mjs and src/math.mjs; deterministic explanations and a read-only HTTP/UI surface. AI, LI.FI funding, approval/execution journal and live monitoring are not implemented by this documentation change. Retain the current no-signing surface until the relevant tested slice lands.
