# Implementation plan

This is a forward plan, not completed execution.

1. Preserve and test the current Ethereum read-only baseline.
2. Revalidate the preferred Robinhood network and dependency matrix, using the dated feasibility observations only as discovery leads. Verify PONS identity and its actual protocol/pool before selecting it; retain WETH/USDG as a diagnostic reference. Freeze supported targets or request a decision, never silently substitute them.
3. Implement bounded screening, real position analysis and deterministic pool-specific scenarios, including price/liquidity paths, partial/full withdrawal versus conversion, itemized costs, negative outcomes and HOLD.
4. Discover/configure/query live Graph data through the actual adapter and UI with freshness and failure handling; disclose limited RPC-only fallback without claiming Graph completion. Add typed intent-to-calculator-to-comparison AI investigation and test reproducibility, missing evidence and permission boundaries.
5. Implement public LI.FI funding/ratio quotes and versioned approval plans. Validate route contracts, amounts, expiry and recipients.
6. Build isolated execution and durable recovery for entry, increase, decrease, reposition and exit; demonstrate normal and partial-failure cases.
7. Add observation, alerts and policy rejection; keep capital actions approval-gated.
8. Review the implemented evidence, finalize the demonstration environment, record a human-narrated demo and complete release/disclosure gates.

Full product coverage is the target. Each step must have real evidence before it is advertised. API feasibility, execution environment and disclosure completeness remain gates; document handoff does not finish them.
