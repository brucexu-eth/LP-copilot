# LP Copilot — product requirements

Updated: 2026-09-07. This specification supersedes the earlier product-wide read-only restriction. The shipped iteration remains read-only; documentation does not enable trading.

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
Robinhood is the preferred network to investigate, not a verified deployment target. Official network identity, chainId, mainnet/testnet availability, Uniswap deployment, Graph coverage, LI.FI routes, fee tier and pool remain pending evidence. Never replace it silently with another chain.

The existing implementation uses Ethereum chain 1 and one USDC/WETH v3 pool. Keep this truthful baseline until a network decision is backed by evidence. Cross-chain funding is in the target scope; a bounded end-to-end demonstration is preferred over unrestricted multi-chain discovery.

## AI role and simulation
The agent extracts constraints, identifies missing evidence, chooses allowlisted queries, compares bounded candidates and explains trade-offs. It cannot generate arbitrary calls, access keys, override risk policies or authorize capital movements.

An AI-assisted simulation is an explicit scenario passed to deterministic LP/inventory/cost calculations, not a model-generated profit number. Distinguish current inventory valuation, accrued fees, estimated future fees, gas, slippage, bridge costs and assumptions. Do not double-count impermanent loss. If cost basis is incomplete, do not show cumulative net profit. Compare every proposed action with doing nothing.

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
