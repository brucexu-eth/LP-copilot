# Development security boundary

This iteration is a local, read-only learning tool. It has no wallet signing, transaction sending, token approvals, user accounts or database. It must not be used to construct financial transactions from floating-point display numbers.

- Bind to loopback only. No public deployment is configured.
- Browser clients cannot select RPC URLs, contracts, chains or Graph endpoints.
- Provider credentials remain server-side. Provider error text is not returned to clients.
- Remote text is rendered with textContent, never injected as HTML.
- Snapshot freshness, pool identity and NFT pool membership are verified; data absence is an error, not a fixture fallback.
- Browser input changes clear old results and cancel/ignore stale requests.
- Install dependencies with `--ignore-scripts`.

## Known dependency limitations

The initial npm audit reports advisories in the Uniswap SDK's transitive contract-tooling/signing dependency tree, including high-severity advisories. A non-forced `npm audit fix` did not resolve them. The application does not invoke compiler, ZIP extraction, filesystem helper, websocket, signer or contract-deployment paths from that tree. This is not a blanket claim that dependencies are secure. Do not expose this app publicly or add transaction execution until the dependency surface is reduced or reviewed. Avoid blindly applying `npm audit fix --force`, which proposes a materially older SDK.

Public release requires another secret/privacy review, an approved open-source license and resolution of relevant dependency risks. Do not put private keys, credential-bearing RPC URLs, private discussions or unrelated organizational material in issues or artifacts.
