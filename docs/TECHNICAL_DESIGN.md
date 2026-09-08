# LP Copilot — technical design

Status: target architecture, 2026-09-08. This repository is the canonical development specification; translated copies are reading projections. Current runtime remains the read-only Ethereum learning workbench.

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
See the [PRD](PRD.md) and [acceptance cases](specs/ACCEPTANCE.md) for the user-facing comparison contract.

DRAFT -> AWAITING_APPROVAL -> VALIDATING -> FUNDING -> REMOVING_LIQUIDITY -> COLLECTING -> SWAPPING -> ADDING_LIQUIDITY -> RECONCILING -> COMPLETE.
Skip steps that are not needed by the approved action. A funded entry need not remove an existing position; HOLD has no transaction steps.

Each step is NOT_STARTED, SUBMITTED, CONFIRMED, FAILED or UNKNOWN. UNKNOWN is reconciled by transaction hash/nonce and chain state before retry. Cross-chain source confirmation is not destination settlement; wait for finality, bridge status and destination balance before spending. Failed swaps leave an explicit token inventory, not a fictional rollback. Resume from durable state without repeating confirmed actions. A changed recovery plan requires approval.

## Network feasibility gate
Validate Robinhood against official network documentation and actual RPC, Uniswap, Graph and LI.FI responses. Freeze chainId, network environment, contracts, pool, fee tier, sample position and freshness limits only after evidence. If unsupported, record Adjust/Stop and obtain a network decision; do not relabel Ethereum results.

## Security and operating boundaries
Use only public APIs and public contract interfaces. Never ingest production private keys. Check destination, spender, calldata target, amounts, fee limits, quote expiry, allowance scope and chain identity. Block stale data, insufficient funds, unexpected contracts, invalid approval and excessive costs. Isolate fork execution and test wallets. Mainnet activity needs explicit authorization.

## Implementation status
Existing source: src/config.mjs, src/data.mjs and src/math.mjs; deterministic explanations and a read-only HTTP/UI surface. AI, LI.FI funding, approval/execution journal and live monitoring are not implemented by this documentation change. Retain the current no-signing surface until the relevant tested slice lands.

## AI investigation and comparison contract
These are target contracts, not implemented method names.
1. Intent: extract goal, chain/position identity, horizon, allowed comparison actions, budget, risk constraints and unresolved questions. Ask about materially missing preferences; conversation is not trading consent.
2. Evidence snapshot: allowlisted reads return provenance, block/time, freshness and missing fields. Pin a block where supported; identify cross-block observations rather than presenting an atomic snapshot. Failed/stale/unknown reads must not be completed with model guesses.
3. Scenario request: record starting inventory, price path, active/competing liquidity, volume, horizon, action timing, withdrawal disposition and cost assumptions. Compare HOLD, half/full withdrawal, conversion and supported range changes under identical conditions.
4. Calculator response: return token amounts, range state, estimated fees, itemized costs, scenario PnL, drawdown, executable exit value, assumptions and calculation version. Record unavailable metrics explicitly. Separate hypothetical, replayed and realized results; do not subtract impermanent loss twice.
5. Explanation/UI: explanations must agree with tool values. Show evidence, assumptions, action outcomes, HOLD, unknowns and conditions that change the conclusion. Position details, comparison and approval/execution state are distinct UI surfaces; prose does not replace approval controls.
6. Execution handoff: a selected action becomes a versioned plan, then passes policy checks, explicit approval and user-wallet signing. The explanation layer has no signing authority. Reconcile each result through the durable execution journal.

## Robinhood / PONS / Graph integration gates
- Revalidate the network, contract identities and runtime code against official sources and live RPC before registry activation. Historical candidate observations are discovery inputs, not a permanent allowlist. Public RPC rate limits require bounded retry/backoff, throttling, caching and visible errors; prefer suitable free hosted capacity initially, with provider credentials held server-side only.
- Verify PONS official identity, token ordering/decimals, actual DEX/version, fee tier, permissions and sell/exit route. Record unsupported protocols rather than applying an incorrect ABI. WETH/USDG is a reference candidate; neither a symbol nor a quote proves the intended pool identity.
- Graph adapter: pin chain, deployment, schema, query and provider; return indexedBlock, observedAt and hasIndexingErrors. Query actual target-pool/history fields. When supported, cross-check price/tick/liquidity through RPC at the same block tag. Configure freshness limits explicitly; absent history is not zero.
- Discovery/authentication failure, timeout, HTTP 429, schema drift, wrong chain, missing pool and index lag must have visible recoverable errors and bounded fallback. Never silently switch chains or substitute fixtures. RPC-only mode must show Graph as unconnected/incomplete and identify unavailable history/discovery features.
- Practice entry: isolate rehearsal; bind plan fingerprint, budget, token, ticks, spender, allowance, costs and expiry before signing. Verify receipt, actual position identifier (NFT tokenId only where applicable), pool and balances after execution; reconcile unknown outcomes before retry. Private keys never enter the app or agent.
- Exercise the real API -> adapter -> UI path and deterministic/negative tests. Use the newly read position for in/out-of-range, decline, liquidity-withdrawal and exit-cost scenarios with HOLD. Fork success is not mainnet entry; label each environment and obtain separate authorization for real funds.
