# LP Copilot — product requirements

Updated: 2026-09-08. This repository is the canonical development specification; translated reading copies are projections, not independent requirements. Product decisions must land here and in the corresponding design/acceptance files before implementation. This specification supersedes the earlier product-wide read-only restriction. The shipped iteration remains read-only; documentation does not enable trading.

## Purpose
Help liquidity providers evaluate opportunities, understand exposure and costs, and carry out explicitly approved LP operations. The intended value is better-informed LP participation, not guaranteed profit or autonomous market timing.

## Full product workflow
1. Screen a bounded, explicitly supported pool universe using sourced liquidity, volume, fees, price history and integration availability. Missing evidence is not a recommendation.
2. Select a chain and pool, explain alternatives, and specify fee tier, inventory, range, budget and constraints.
3. Investigate an actual public or user-selected position. Show block, source, timestamp, data freshness, token composition and limitations.
4. Compare HOLD, ENTER, INCREASE, DECREASE, REPOSITION and EXIT under explicit price scenarios. AI translates intent and investigates evidence; deterministic code computes outcomes. HOLD is always available.
5. Plan cross-chain funding through public LI.FI APIs when funds are on other supported chains, and ratio swaps when required. No unnecessary bridge or swap for demonstration.
6. Obtain approval for a versioned plan, execute permitted funding and Uniswap operations, and reconcile every step against chain evidence.
7. Monitor position state and risk conditions. Automatically issue alerts and block unsafe actions. Propose additions, reductions or repositioning; capital-changing actions require approval.

## Scope and network decision
Robinhood remains preferred, not a production-validated deployment target. A dated 2026-09-08 feasibility record reports network/RPC reads, V3 reference pools/a public position, and LI.FI quotes. These observations do not certify current availability, settlement or product integration. Revalidate identities and live preconditions before enabling a target. PONS identity/pool and a fresh, queryable Uniswap Graph deployment remain unresolved. Never silently replace the target chain.

The existing implementation uses Ethereum chain 1 and one USDC/WETH v3 pool. Keep this truthful baseline until a network decision is backed by evidence. Cross-chain funding is in the target scope; a bounded end-to-end demonstration is preferred over unrestricted multi-chain discovery.

## AI role and simulation
AI turns pool and position data into understandable, position-specific action comparisons. The problem is not a shortage of numbers, but knowing which numbers matter, what they mean and which choices are available. AI is neither a glossary-only interface nor an autonomous market predictor.

Example question: "For this position, if price keeps falling and other LPs withdraw liquidity, what happens if I do nothing, reduce by half, or exit into stablecoins? Which conditions are worth addressing now?"

1. Clarify intent and constraints. For "I want fees, but do not want to end up entirely holding this token after a decline," explain the position mechanism and ask whether long-term token ownership is acceptable when necessary. Do not invent a risk preference.
2. Read evidence and call deterministic tools. Compare HOLD, partial withdrawal, full withdrawal with retained tokens, withdrawal plus stablecoin conversion, and supported alternative ranges.
3. Explain resulting holdings, costs, residual risks, unknowns and conditions that would change the comparison. Convert the selected action into a reviewable plan; assist execution only after explicit approval and user-wallet signing, then reconcile the result.

The agent extracts constraints, identifies missing evidence, chooses allowlisted queries, compares bounded candidates and explains trade-offs. It cannot generate arbitrary calls, access keys, override risk policies or authorize capital movements.

An AI-assisted simulation is an explicit scenario passed to deterministic LP/inventory/cost calculations, not a model-generated profit number. Distinguish current inventory valuation, accrued fees, estimated future fees, gas, slippage, bridge costs and assumptions. Do not double-count impermanent loss. If cost basis is incomplete, do not show cumulative net profit. Compare every proposed action with doing nothing.

### Pool-specific scenarios and monitoring
- Inputs: chain/pool/fee tier, position range and inventory, cost basis, block/time, price path, active/competing liquidity, volume, horizon, action timing and execution/cost assumptions.
- Cover range-bound paths, sustained declines, crash-and-rebound and liquidity withdrawal. Hold the starting inventory, path, horizon and assumptions constant across actions. Removing liquidity is not selling the returned tokens. Do not assume short hedges where no executable market exists.
- Outputs: token composition, in/out-of-range state, estimated fees, scenario net PnL, drawdown and executable exit value after gas/slippage. Missing cost basis prevents cumulative-profit claims; missing executable quotes prevent theoretical value being presented as available exit proceeds.
- Price paths alone cannot determine future fees. Disclose volume, competing liquidity, fee tier and execution assumptions, with sensitivity ranges rather than promised returns. Model reduced exit depth and failed execution. A pool snapshot cannot establish a crash probability.
- Monitor range proximity, inventory exposure, active liquidity withdrawals, exit depth/slippage, fee coverage and data staleness. Configured triggers refresh scenarios and alert; they do not approve capital movements.
- Acceptance: reproducible calculations, HOLD and negative outcomes retained, traceable numbers, and clear separation of hypothetical simulation, historical replay and realized PnL. Users should be able to explain what they would hold, pay and still risk under each action.

## Practice target: PONS and The Graph
PONS is the preferred meme-token learning/demo candidate, subject to authoritative token identity and actual DEX/protocol/pool verification; do not assume V3 or identify a token by symbol/popularity. WETH/USDG remains a reference/diagnostic candidate, not a silently substituted final target. Creating a position in an existing pool is not creating a new pool.

Target flow: verify PONS -> select an existing supported pool, fee, budget and range -> preview asset ratio, costs, risks and exit choices -> obtain explicit approval and wallet signing -> create the position -> read its actual inventory/range/fees in the product -> run scenarios on that same position. Rehearse in isolation first; any mainnet budget, wallet, pool, range, allowance and maximum cost require separate approval.

The Graph must be a real product integration: source discovery/configuration, actual queries, source/freshness display and RPC cross-checks. Official network support is not evidence of a usable Uniswap deployment. A bounded RPC fallback must disclose missing indexed/history capabilities and cannot count as Graph completion. Successful reads, wrong network, stale indexing, missing data and rate limiting must be visible in the product, not only a standalone script/report.

Public discovery sources, not proof of current integration: [network](https://docs.robinhood.com/chain/connecting), [Uniswap deployments](https://docs.uniswap.org/deployments.json), [Graph network support](https://thegraph.com/docs/en/supported-networks/robinhood/), [LI.FI chains](https://li.quest/v1/chains).

## Authorization
Automatic: observation, alerts, evidence gathering and hard-rule rejection.
Approval required: bridging, swapping, token approvals, entering/exiting, increasing/decreasing liquidity and repositioning. Monitoring consent is not trading consent. Changes to material plan parameters invalidate approval. No unattended capital-changing automation.

## Delivery and evidence
Analysis, scenarios, AI-assisted investigation and approved execution are all target deliverables, not optional storytelling. Implement in bounded vertical slices with explicit acceptance evidence. Do not describe planned integrations as implemented.

Execution environment is still a release decision: isolated fork, testnet and mainnet evidence must be labeled separately. Public-source reads require no private wallet access; mainnet signing and funds require separate approval. An isolated-fork test is not proof of mainnet execution or prize eligibility.

## Non-goals
Guaranteed yield, unrestricted yield chasing, model-only trading decisions, arbitrary contract execution, leverage, portfolio-wide autonomous rebalancing and fabricated live data.

## Acceptance and delivery contract
See [lifecycle specification](specs/LP_LIFECYCLE.md), [technical design](TECHNICAL_DESIGN.md), [acceptance cases](specs/ACCEPTANCE.md) and [implementation plan](IMPLEMENTATION_PLAN.md). All integrations use public APIs, public documentation and public contract interfaces; no non-public organizational systems or data are required.
