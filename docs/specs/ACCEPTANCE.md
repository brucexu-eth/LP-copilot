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

Evidence packet per implemented slice: commit, command, environment, source/block/transaction identifiers when applicable, expected versus actual results, and known limits. No credentials or private customer data.
