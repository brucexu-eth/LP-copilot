# Historical contract — superseded 2026-09-11

This file is retained for detailed provenance only. The current PRD and technical design control; prior mandatory per-action approval and range-order inclusion no longer apply.

# Specification: LP lifecycle

## Inputs and outputs
Candidate screening takes a verified pool allowlist and user constraints; it returns sourced comparable candidates, rejection reasons and unknowns, never an unsupported global ranking.
Position analysis takes chainId/pool/tokenId or an explicitly hypothetical position and returns provenance, inventory and range state.
Scenario comparison takes identical starting inventory, price paths, active/competing liquidity and volume assumptions, horizon, action timing, withdrawal disposition and costs. It returns token composition, range state, estimated fees, scenario PnL, drawdown, executable exit value and unused wallet balances for each action plus HOLD; missing inputs make affected outputs unavailable rather than zero. Partial/full withdrawal with retained tokens is distinct from withdrawal followed by stablecoin conversion. See the [PRD](../PRD.md) for the complete pool-specific scenario and monitoring contract.
A proposed execution plan includes all material transaction parameters and a fingerprint; it is not an authorization.

## Mandatory invariants
1. Every capital-changing step belongs to an explicitly approved plan.
2. Alerts and policy blocking are automatic; adding/reducing liquidity is not.
3. AI can propose and explain, but cannot expand an allowlist or loosen hard limits.
4. Source and destination settlement are separately verified for cross-chain funding.
5. A public sample NFT is not presented as the user's position.
6. Historical pool volume/TVL is not predicted personal income.
7. Actual runtime capabilities and future specifications are labeled separately.
8. Every integration error is visible; no silent fixture fallback.
9. Actual signatures and funds remain outside this documentation task.
10. Natural-language intent and monitoring consent are not capital authorization; materially unclear risk preferences require clarification.
11. Same inputs and calculator version reproduce the same numeric results; AI explanations cannot replace or alter those results.
12. Graph network support, queryable deployment, fresh data and actual UI integration are separate gates. RPC fallback cannot mark Graph integration complete.

## Configuration still requiring evidence or approval
Network and pool identities; monitoring cadence/thresholds/channel; exact bounded screening universe; execution demonstration environment; real API coverage and costs. These are implementation gates, not claims that validation is complete.