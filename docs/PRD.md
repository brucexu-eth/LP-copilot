# LP Copilot — iteration 1

## Goal
Help a learner understand one concentrated-liquidity position before deciding whether to act.

## Smallest useful loop
1. Read Ethereum's USDC/WETH Uniswap v3 0.3% pool at a single block.
2. Import a public NFT position from that pool, or explicitly create a hypothetical learning position.
3. Show price, range, token amounts, source block and freshness.
4. Compare HOLD, WIDEN and EXIT under the same price scenarios.
5. Explain inventory exposure and missing evidence. Never offer a signing action.

HOLD is a first-class baseline. WIDEN uses the same current token inventory with no swap: unallocated amounts stay in the wallet. EXIT means holding the withdrawn USDC and WETH, not selling everything to USDC. Results exclude fees, gas and execution costs and are not profit forecasts.

## Scope
One chain (1), one pool (0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8), one fee tier (3000), one position at a time. Live RPC is required for live mode. The Graph history is optional in this learning iteration, but required before claiming Graph prize readiness. Fixtures exist only for automated tests; the UI never silently falls back to them.

## Non-goals
No wallet connection, signatures, approvals, transaction builder, rebalancing, database, accounts, multi-chain discovery, autonomous trading or yield predictions. No LLM integration in iteration 1; explanations are deterministic and labeled as such. LI.FI and an evidence-grounded AI investigation are subsequent vertical slices, not placeholder integrations.

## Acceptance
- Live pool identity verified via factory, chain, tokens, fee and decimals.
- Pool and NFT state read at one block; stale/future blocks rejected.
- Wrong-pool NFTs rejected; zero-liquidity positions explained rather than invented.
- Integer LP amounts independently tested against SDK calculations.
- Scenario math uses the same initial inventory and keeps unused tokens.
- Graph absence, provider errors, stale indexing and missing history explicit.
- Invalid input cannot reuse earlier successful results.
- Browser works at desktop and mobile widths; no signing or sending API exists.

## Next increments
1. Verify live Graph history with a configured key and make it load-bearing in bounded AI investigation.
2. Add a real LI.FI ratio quote only when an actual comparison needs a swap.
3. Isolated-fork transaction planning, approval invalidation and partial-failure recovery.
4. Human-reviewed public release and hackathon submission.
