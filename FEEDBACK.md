# Uniswap developer feedback — iteration 1

Status: local development observations; feedback form not submitted.

## Integration
Ethereum Uniswap v3 USDC/WETH 0.3% pool and NonfungiblePositionManager, read at a pinned block. The pool is checked against the factory, fee, token addresses and decimals. Deterministic BigInt inventory math is cross-checked against the SDK. See `src/data.mjs`, `src/config.mjs`, `src/math.mjs` and `test/math.test.mjs`.

## Observations from implementation
- The official Ethereum deployments page includes the selected example pool and manager address, making identity verification straightforward.
- The current SDK package exposes an ESM entry that does not load directly with Node 20.11 in this setup. Using Node `createRequire` loads the package's CommonJS export without patching upstream code.
- The SDK dependency tree brings in unrelated contract tooling and security advisories. A minimal math-only distribution would reduce the footprint of a read-only educational app.
- The distinction between stored `tokensOwed` and total currently claimable fees is important for new LP integrators; the UI explicitly excludes fees rather than mislabeling the stored values.
- The subgraph overview documents example deployments and warns that schema, indexing and maintenance must be verified. The adapter consequently fails closed on inconsistent metadata.

No claims are made about transaction execution UX because this iteration does not execute transactions. Submit the official feedback form only after human review and public release.
