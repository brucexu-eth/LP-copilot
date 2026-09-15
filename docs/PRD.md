# LP Copilot vNext — AI-native Uniswap position intelligence

Updated 2026-09-15. Canonical product contract; Notion is the Chinese reading projection.

## Product decision

Restart the product around an **AI-native Uniswap experience**, rather than incrementally extending the hackathon terminal. The September hackathon implementation is legacy evidence and may be reused selectively, but its architecture, testnet flow, release constraints and UI do not define vNext.

LP Copilot vNext follows the familiar Uniswap mental model and information architecture, then adds the missing decision layer: historical analog replay, scenario simulation, range and action comparison, continuous monitoring, and policy-bounded execution. It must help a user decide what to do with a concrete LP position; it must not present uncertain forecasts as an “optimal” answer or promise profit.

This document authorizes product definition only. It does not authorize mainnet capital movement, signer-policy changes, deployment, or unattended trading.

## User problem

A concentrated-liquidity provider must repeatedly answer questions that the standard swap/liquidity interface does not resolve:

- Which range is appropriate for this asset, market regime, holding period and risk budget?
- If price approaches or crosses a boundary, should the user hold, widen, recenter, reduce, withdraw, or exit into a chosen asset?
- Does expected fee income compensate for inventory loss, adverse selection, gas, slippage, taxes and failed execution?
- Which historical situations are genuinely comparable, and what happened under each possible response?
- When conditions change, can the system detect the change and rerun the decision before the user notices it manually?

The real product is therefore not a price predictor. It is a **decision system under uncertainty**: forecast distributions and historical analogs feed deterministic LP accounting, strategy comparison and explicit action policies.

## Target product experience

Use Uniswap's core interaction model as the starting point—token/pool selection, liquidity positions, range charts, transactions and wallet state—but reconstruct the experience around the position lifecycle.

1. **Explore** — find and compare verified Uniswap pools using liquidity, volume, fee generation, volatility, active depth, token risk and data freshness.
2. **Position** — inspect an existing position or design a new one; show range, inventory, fees, cost basis, PnL decomposition and exit value.
3. **Forecast** — replay comparable periods, construct forward scenarios and estimate a distribution of future price/range states.
4. **Strategy** — compare no action, keep range, widen, recenter, reduce, withdraw, or exit under the same assumptions.
5. **Monitor** — let the AI watch market, pool and position state continuously, explain material changes and rerun analysis when triggers fire.
6. **Act** — prepare a transparent transaction plan; execute only with the user's current approval or inside a separately approved, revocable mandate.
7. **Review** — reconcile the actual on-chain result with the prediction and improve future recommendations without rewriting history.

The product may borrow interaction patterns from Uniswap, but must not imply affiliation, copy protected brand assets, or hide when a capability is supplied by a third party.

## Core feature: analog replay, forecast and response selection

### Inputs

Freeze every analysis to identified and timestamped evidence:

- chain, protocol version, pool, token addresses, fee tier and tick spacing;
- current price, ticks, active liquidity, depth, volume, fees and data freshness;
- position range, liquidity, token inventory, accrued/collected fees and cost basis when available;
- user objective, horizon, maximum acceptable loss/drawdown, action frequency, preferred terminal asset and execution limits;
- market context that can be reproduced, such as volatility, trend, liquidity change and volume regime.

Missing data is unknown, not zero. A stale or mismatched dataset cannot authorize an action.

### Comparable-case retrieval

Retrieve several historical windows that resemble the current state using explicit features and distance metrics. Show why each case was selected, its date range, data coverage and meaningful differences from the present. Avoid choosing only favorable examples.

Historical analogs are evidence about possible paths, not proof that the same outcome will repeat. Regime changes, token-specific events, changing liquidity and reflexive market behavior can invalidate similarity.

### Replay and forward scenarios

For each analog and generated scenario, replay the position under a shared set of candidate policies:

- no action / HOLD;
- keep the current range;
- widen the range;
- recenter the range;
- reduce liquidity;
- withdraw and retain the resulting assets;
- withdraw and, only when explicitly requested and executable, convert toward a target asset.

Evaluate inventory value, LP fees, impermanent loss relative to holding, gas, slippage, price impact, token taxes where applicable, execution delay/failure, maximum drawdown and realistic exit value. Do not double-count impermanent loss or treat displayed APR as net profit.

### Forecast output

Return a distribution and scenarios, not a single-point oracle:

- probability-weighted price/range states over the selected horizon;
- expected and downside outcomes for every candidate policy;
- confidence, evidence quality and the variables that dominate the result;
- a recommended range and response policy only when it beats the no-action baseline by a meaningful margin after costs;
- “insufficient evidence” or “do nothing” when the ranking is unstable.

“Best range” means best under the user's stated objective and the model's explicit assumptions. It is not universally optimal and must be recalculated when those assumptions change.

## Monitoring agent

The monitoring agent replaces repetitive human observation, not human ownership of risk.

It continuously watches:

- distance to range boundaries and time out of range;
- volatility/trend regime changes and forecast drift;
- active liquidity, volume, fee generation and exit depth;
- token/pool anomalies, depeg or contract-risk signals where supported;
- data-source freshness and disagreement;
- accumulated fees versus the cost and risk of taking action;
- wallet, allowance, transaction and mandate state.

Triggers should rerun the deterministic analysis and produce one of: **observe**, **alert**, **prepare action**, or **execute within mandate**. Out-of-range alone is not an automatic recenter signal. Cooldowns, minimum benefit thresholds and failure recovery must prevent churn and repeated transactions.

## AI and deterministic systems

- AI identifies relevant evidence, retrieves analogs, proposes scenarios, explains differences and turns the user's objectives into bounded candidate policies.
- Deterministic code performs Uniswap math, replay, accounting, cost estimates, policy checks and transaction construction.
- The policy engine controls allowed chains, pools, positions, actions, amounts, slippage, costs, frequency, expiry and recipients.
- The model never holds keys, approves its own authority, changes hard limits, or converts a weak forecast into permission to trade.

Every recommendation must be reproducible from a versioned snapshot: source data, feature set, analogs, scenarios, assumptions, model/version, calculator/version and policy/version.

## MVP

Build a narrow vertical slice before recreating all of Uniswap:

- one supported Uniswap concentrated-liquidity version and chain;
- a curated set of verified pools;
- import one existing position or create one draft position;
- current-state position accounting and no-action baseline;
- historical analog retrieval for a fixed set of reproducible features;
- replay of at least three response policies, including no action and withdrawal;
- range recommendation with downside, costs, confidence and failure-to-recommend state;
- durable monitoring that reruns analysis on schedule and on material triggers;
- alert and reviewable action plan; capital execution remains approval-gated until separately authorized and accepted.

Do not make v1 a universal DEX terminal, autonomous market timer, social-signal engine, leverage/hedging platform, arbitrary-token discovery system or guaranteed-yield product.

## Acceptance

A feature is complete only when:

1. real Uniswap/chain data is identified, fresh and reproducible;
2. historical windows and similarity scores can be independently replayed;
3. LP accounting reconciles inventory, fees, holding baseline and all modeled costs;
4. changing one decisive assumption changes the ranking in the expected direction;
5. no-action can win and insufficient evidence can block a recommendation;
6. monitoring survives restart, deduplicates triggers and records every state transition;
7. proposed actions expose asset outcomes, costs, permissions and recovery paths;
8. any executed test is reconciled to on-chain receipts and wallet state;
9. backtest, paper, testnet, mainnet and deployed evidence are reported separately.

The strongest failure mode is false confidence: a polished AI answer overfits a few analogs, ignores a regime change and causes costly churn or one-sided inventory loss. The product must prefer calibrated uncertainty and inaction over a precise but weakly supported recommendation.

## Legacy baseline

The existing hackathon code, Base Sepolia runs and September 2026 release documents are retained as historical evidence. They may supply validated components or test cases after review, but vNext may start in a new package or repository architecture. No legacy component is assumed reusable until its data model, security boundary and product fit are revalidated.
