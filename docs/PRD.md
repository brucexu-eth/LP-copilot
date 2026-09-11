# LP Copilot — managed LP MVP

Updated 2026-09-11. Canonical development contract; Notion is a Chinese reading projection. This revision supersedes the previous product-wide read-only and per-transaction-only authorization requirements. It does not enable live wallet authority by itself.

## Outcome
A conversational LP management agent: investigate real The Graph/Uniswap data, understand user objectives, build a Uniswap position through a user-owned Privy wallet, and monitor/manage it within an explicitly approved, revocable policy. LI.FI supplies cross-chain funding and required ratio swaps. DeepSeek Flash investigates and proposes; deterministic tools calculate and policy-bound execution signs. Explanation is observability, not the whole product.

## Bounded scope
- A curated set of established Uniswap v3 pools; one managed position per strategy. Stablecoin pairs have depeg/issuer risk; WETH pairs retain ETH price risk. No pool is described as safe or guaranteed profitable.
- Investigate Robinhood first. Ethereum mainnet fallback is explicitly authorized if the required Robinhood Graph path is unavailable. Never relabel one network's evidence as another's. No required PONS or meme exposure.
- Candidate Ethereum assets: USDC/USDT and USDC/WETH. Freeze addresses, fee tiers, token ordering, decimals and data coverage from live factory/RPC/Graph evidence before use.
- Entry, reduction, withdrawal, collection and same-pool repositioning. LI.FI funding/ratio exchange only where needed. No automatic cross-chain or cross-pool rotation.
- Excluded: single-sided range orders (separate product), arbitrary token discovery, leverage, perpetual hedges, social-signal platform, custom hooks, Arc integration.

## User flow
1. Create/use a user-owned Privy embedded wallet. An external funding wallet is not automatically delegated.
2. Select a verified pool, discuss objectives, inspect real evidence and deterministic inventory scenarios.
3. Review a versioned entry plan and management policy. Missing risk preferences require clarification.
4. Fund through a confirmed LI.FI route if needed; reconcile destination funds before entry.
5. Create the LP position; reconcile receipt, tokenId, ownership, pool, liquidity and residual inventory.
6. Opt into assisted or delegated management. A durable scheduler refreshes data; material changes trigger bounded AI investigation and deterministic policy evaluation.
7. Execute only within current authority; reconcile each step. Expose pause, revoke, manual recovery and withdrawal controls.

## Authorization contract
Assisted mode requires action-specific approval. Delegated mode permits capital-changing actions only within a user-approved versioned mandate and a matching Privy signer policy. The user remains owner; the application is a restricted signer. Never allow an unconstrained signer or give keys to the model.

Bind mandate to authenticated user, wallet, chain, pool, position, permitted actions, capital cap, max slippage, transaction/cumulative cost limits, cooldown, operation limit, expiry and fixed recipient. No automatic capital top-up, new pool, authority expansion or parameter relaxation. Proposals modifying risk limits require fresh approval. Revocation blocks future submissions, but cannot cancel already broadcast transactions or undo existing ERC20 allowances; show these separately.

Privy key-level controls restrict chain/target/method/decoded parameters/recipient/expiry where supported. Application controls enforce economic and stateful constraints. A router or multicall allowlist alone is insufficient. Unsupported enforceable policy is a blocker, never an allow-all fallback. User product approval is not approval to move actual funds: wallet, amount, pool, ranges, allowances and limits must be approved before live activation.

## Signals and calculations
Graph supplies indexed historical pool data; RPC supplies current state, ownership, balances and receipts. Verify Graph metadata, schema, chain/deployment and freshness; cross-check pool state at the Graph block. Unavailable data is not zero. Stale Graph cannot authorize a trade even if RPC is available.

Observe range proximity, token exposure, changes in volume/active liquidity, exit depth, fee coverage and stale sources. Always compare HOLD. Out-of-range does not imply reposition. Withdrawal does not imply selling. Separate inventory value, collected/accrued fees, future fee assumptions, execution costs, historical replay and realized PnL. Missing cost basis prevents cumulative profit claims. Graph Uniswap data is not full meme/project/social risk coverage.

## Acceptance
Complete means a real Graph-to-AI-to-calculator-to-UI flow, actual Privy authentication and wallet authority checks, reproducible isolated LP lifecycle/automatic trigger/recovery tests, and explicitly authorized live entry/management evidence. Fixtures, a generated plan, a wallet button, mock Graph or read-only pages cannot substitute. Record local, isolated, live-provider, mainnet and deployed evidence separately. If a natural trigger does not occur, label an isolated replay honestly.

## Release
Primary partner targets: The Graph AI Use Case, Uniswap and Privy financial flow. LI.FI is a functional integration, not a fourth prize selection. Official submission deadline: 2026-09-13 12:00 America/New_York = 2026-09-14 00:00 Asia/Shanghai. Event end September 16 is not the submission deadline. Human-narrated 2–4 minute video, license, Uniswap feedback form and AI artifact disclosure remain independent gates.
