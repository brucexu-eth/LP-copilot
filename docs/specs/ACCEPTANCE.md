# Specification: acceptance cases

These are required tests, not test results.

- Import: valid supported public position reads at a pinned block; wrong-chain/wrong-pool input is rejected; hypothetical learning positions stay labeled.
- Screening: unknown or unsupported pools cannot enter an executable plan; stale/absent history is shown, not scored as zero risk.
- Math: token0/token1, decimals, tick boundaries, rounding and residual inventory cross-check against a reference implementation.
- Comparison: identical initial inventory across actions; HOLD included; EXIT states the resulting tokens; missing fees/costs prevent net-profit claims.
- AI: tool-grounded explanation cites actual data; scenario numbers match calculator output; injected instructions in tool data cannot change policy.
- Approval: no approval means no capital movement; changing amount, recipient, chain, ticks, spender, min-out or expiry invalidates prior approval.
- Cross-chain: no destination spending before confirmed arrival; unknown source status reconciled before retry; route drift requires a new plan.
- Execution: successful approved entry and adjustment reconcile position and wallet balances; remove-success/swap-failure exposes actual holdings.
- Recovery: duplicate clicks, timeout and restart cannot duplicate a confirmed operation; recovery plan changes require approval.
- Monitoring: thresholds trigger alerts or hard stops, not unattended trades.
- Evidence: live, fixture, hypothetical, fork, testnet and mainnet outputs cannot be interchanged; no claims of profitability from a demo.

## Position-specific AI and practice acceptance
- Intent-to-UI: use the actual-position question about further price declines and liquidity withdrawals; trace intent -> source snapshot -> calculator -> comparison UI. An unclear long-term holding preference prompts clarification, not an invented constraint or authorization.
- Reproducibility: same snapshot, path, horizon, volume/liquidity assumptions, action timing and calculator version yield identical numbers. Compare HOLD, half withdrawal, full withdrawal with retained tokens, stablecoin conversion and supported alternative ranges; keep negative outcomes and unused balances.
- Paths: exercise range-bound prices, sustained decline, crash-and-rebound, active liquidity removal, worsening exit depth and execution failure. Fees cannot be inferred from price alone. No fictitious short hedge in an unavailable market.
- Accounting: tool-derived inventory, fees, costs, scenario PnL and drawdown are separately visible. No cumulative profit without cost basis, no double-counted impermanent loss, no executable exit proceeds without supporting quotes. Hypothetical, historical replay and realized results remain distinct.
- Explanation: every number matches traceable tool output; stale/missing evidence produces an explicit limitation, not fabricated data. Users can identify resulting holdings, costs, remaining risks and what changes the comparison. Inquiry, alert and action selection cannot bypass approval.
- Graph: real endpoint discovery/configuration and target-pool query render through adapter and UI with indexedBlock, observedAt, indexing errors and configured freshness limits. Test wrong chain, absent deployment/pool/history, auth failure, timeout, 429, schema drift and lag; disclose bounded RPC-only capability without claiming Graph completion.
- PONS: verify official identity and actual pool/protocol before enabling the candidate. An unsupported version fails explicitly, never through a guessed V3 ABI. Entry into an existing pool is not pool creation.
- Practice execution: rehearse in isolation, then perform only separately approved wallet-signed activity. Confirm actual receipt, protocol-appropriate position identifier and balances before displaying a new position; run scenarios on that same position. No standalone script/report substitutes for the product UI flow, and no fork result substitutes for mainnet evidence.
- Monitoring: configured range/exposure/liquidity/exit-slippage/fee-coverage/staleness triggers refresh scenarios or alert, without unauthorized capital movement.

Evidence packet per implemented slice: commit, command, environment, source/block/transaction identifiers when applicable, expected versus actual results, and known limits. No credentials or private customer data.
