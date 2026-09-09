# Intent-based LP buy/sell — signature feature candidate

Status: proposed product/design contract, 2026-09-09; not implemented or enabled by this document. This extends the LP lifecycle, not the authorization boundary. Range orders are an existing protocol primitive; the differentiation to validate is intent translation, transparent execution accounting and withdrawal-aware completion, not invention of a new order type.

## User promise and examples

“Buy or sell through LP at prices you already accept, with visible conversion progress, fees and withdrawal status.” This is passive execution, not APR chasing, autonomous timing, guaranteed execution or a stop-loss order. More precise alignment with inventory intent does not imply better execution price than other venues.

All prices below mean USDC per LAPTOP. LAPTOP is an illustrative symbol, not a verified token/pool or replacement for the PONS practice candidate.

- Buy the dip: choose a range entirely below the current price and supply only USDC. Downward traversal gradually converts principal into LAPTOP. Buying half the LAPTOP beforehand is unnecessary and must not be a default funding step.
- Sell into strength: choose a range entirely above the current price and supply only LAPTOP. Upward traversal gradually converts principal into USDC.
- Eligible swaps through active liquidity accrue the position's share of fees, potentially in both tokens. Waiting outside the range generates no new swap fees for that position; prior earned fees remain claimable.
- A partial traversal means partial conversion. A full traversal means principal is converted at that observation, not that proceeds have been secured in the wallet. Reversal before removal can convert principal back, even after a previous full traversal.
- A sustained decline can accumulate a falling token despite fee income. No entry into the range can mean indefinite waiting and no conversion. Ordinary range orders cannot implement stop-loss selling or buy-stop orders.

## Product entry and interaction

1. Offer three explicit intents: earn LP fees, buy at lower prices, sell at higher prices. Preserve ordinary LP management; do not force every user into an order metaphor.
2. Resolve chain, verified pool/protocol, token addresses, USDC denomination, fee tier, single-sided input amount, acceptable price band, waiting horizon, cost ceiling and desired withdrawal disposition. The user chooses prices; AI explains consequences and asks about material gaps.
3. Preview the tick-rounded range, expected inventory across the range, no-fill/partial/full/reversal paths, principal conversion average excluding fees, estimated all-in result with assumptions, entry/withdrawal costs and dust. Compare keeping the input asset and, where real quotes exist, an immediate swap. Do not claim future fees or execution superiority.
4. Show a prominent warning before approval: “Converted is not withdrawn. If price reverses before liquidity is removed, your assets may be converted back.” Explicitly show manual approval/signing for withdrawal; there is no unattended auto-withdraw guarantee.
5. Revalidate the single-sided range against live price before entry. If price has entered/crossed the proposed range or tick rounding changes the accepted band, stop and replan; never silently acquire half the other token or create a two-sided position.
6. After approved creation, show progress and actual inventory with block/time evidence. When fully converted, alert with a withdrawal proposal, not a success screen. Users may keep LP exposure, withdraw partially, or approve full removal and collection; explain residual exposure for each.
7. Only confirmed removal of all liquidity and reconciliation of collected assets to the approved recipient closes the order. Removing liquidity, collecting proceeds and any optional swap are distinct steps. Fees can leave both tokens in the wallet even when principal conversion is complete.

## Execution dashboard, not a yield leaderboard

Primary fields: intended side and accepted band; current principal inventory; current net conversion percentage; principal conversion average; net effective average in USDC with a visible fee/cost breakdown; accrued versus collected fees by token; elapsed waiting time and time to first/full observed conversion; estimated withdrawal cost versus actual paid cost; and a prominent “fully converted / not withdrawn” or “withdrawn and reconciled” badge. APR is secondary and never substitutes for execution quality.

- Net conversion percentage uses the original single-sided principal actually deposited, excluding fees, unused wallet funds and dust. For buy, measure the fraction of deposited USDC principal no longer held as USDC; for sell, the fraction of deposited LAPTOP principal no longer held as LAPTOP. Include withdrawn principal in the accounting. This is current net conversion, not cumulative turnover, and can decrease after reversal. Track the historical maximum separately, never as current fill.
- Keep this first slice to a fixed initial deposit. Adds, range changes or external position mutations invalidate simple progress accounting; show reconciliation required and create a separately approved new intent/version rather than silently changing the denominator.
- Principal average is net USDC principal exchanged divided by net LAPTOP principal acquired/disposed of, excluding fees and gas. At zero conversion or incomplete history, show unavailable. After reversal this is a net-inventory exchange ratio, not a reconstructed per-swap VWAP.
- Final effective buy average: net USDC spent after USDC fees plus attributable USDC-valued costs, divided by net LAPTOP received including LAPTOP fees. Final effective sell average: net USDC received including USDC fees minus attributable USDC-valued costs, divided by net LAPTOP disposed of after LAPTOP fees. Use reconciled wallet/position deltas and account for unspent or returned principal. Nonpositive denominator means unavailable, not a misleading average.
- Include attributable approval, funding, entry, removal and collection costs once. Record native-gas conversion source/time; do not silently treat USDC as exactly USD. Token fees must not be counted both as token inventory and separately as USDC revenue. Any optional post-withdrawal swap is a separately itemized operation, not fictitious LP execution.
- Before reconciliation, show only provisional inventory-based values or estimates, with assumptions and missing data. No realized net average with missing costs/history. Waiting horizon expiry triggers an alert/proposal, not automatic cancellation or withdrawal.

## State and implementation contract

Separate three dimensions rather than overloading the existing transaction journal's COMPLETE state:

- Intent lifecycle: DRAFT, AWAITING_ENTRY_APPROVAL, OPEN, WITHDRAWAL_PENDING, CLOSED, RECONCILIATION_REQUIRED.
- Observable principal conversion while liquidity remains: WAITING, PARTIAL, FULLY_CONVERTED. These states can reverse; store last observation and first/full-crossing history. A price snapshot does not prove historical crossing times.
- Withdrawal steps: NOT_STARTED, AWAITING_APPROVAL, SUBMITTED, REMOVED_NOT_COLLECTED, RECONCILED, FAILED, UNKNOWN. A failed withdrawal can leave live exposure; successful removal with failed collection cannot reconvert principal but is not wallet settlement. Partial removal leaves residual LP exposure and is not CLOSED.

Store intent/version, side, chain/pool/protocol, token addresses/ordering/decimals, price convention, requested and tick-rounded bounds, deposited principal/dust, position identity, creation receipt/block, expiry preference, approval fingerprints, source snapshots, current and historical conversion observations, principal/fee collection ledger, cost items and withdrawal receipts. Use integer/reference LP math; derive direction from canonical token order and inverse-price mapping, not symbol ordering.

Reuse allowlisted adapters, calculators, policy gate and durable execution journal. Monitor staleness and reorg/finality; unknown or stale observations cannot claim completion. Entry completion only opens the range-order lifecycle. Alerts never authorize removal. Fresh withdrawal approval binds recipient, amounts, minimum receipts, expiry and maximum cost; price drift/reversal may require a revised plan. Reconcile unknown outcomes before retrying.

## Required acceptance fixtures (not test results)

- LAPTOP/USDC buy below spot uses USDC only; sell above spot uses LAPTOP only; no unnecessary ratio swap. Repeat with reversed token0/token1, differing decimals and tick rounding.
- Price never enters: zero conversion/new fees, growing wait, no invented completion deadline. Prior fees do not disappear.
- Partial and full traversal: tool-derived amounts and current percentage match reference math; principal, fees and dust remain separate.
- Full traversal then reversal before removal: current conversion decreases and “converted, not withdrawn” cannot become settled; historical maximum remains labeled historical.
- Sustained decline: increased LAPTOP exposure and loss can coexist with positive fees; no stop-loss claim. Reject unsupported buy-stop/stop-loss intents.
- Preview-to-sign price drift or invalid tick-rounded range blocks entry/requires approval again; no silent two-sided funding.
- Full/partial removal, failed collection, timeout, duplicate click and restart: accurate residual exposure and receipt-backed settlement; no duplicated transaction or premature CLOSED state.
- Zero conversion, reversal, fees in both tokens, gas, missing history/costs, outside mutations and stale/reorg observations exercise metric guards. Provisional and reconciled values are distinct; fee amounts and costs are not double-counted.
- End-to-end isolated rehearsal: intent -> preview -> approval -> single-sided position -> conversion/reversal -> withdrawal approval -> removal/collection -> reconciled UI. A fork result is not mainnet proof. No real funds or live monitor enabled by accepting this specification.

## Bounded delivery

First deliver deterministic previews and the withdrawal-aware read-only dashboard for verified supported pools. Then add approved single-sided entry and manual approved removal/collection using the execution journal, exercised in isolation. Unattended third-party managers, custom hooks and automatic withdrawal are outside this slice and require separate product/security/authority review. Signature-feature positioning remains a hypothesis until users can correctly explain remaining inventory risk and complete the workflow.

Source verified 2026-09-09: [Uniswap — Understanding Range Orders](https://docs.uniswap.org/concepts/protocol/range-orders), including reversal before withdrawal, supported order types and fees in both assets. Protocol mechanics do not validate LAPTOP identity, a live pool or this product's implementation.
