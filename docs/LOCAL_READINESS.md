# Local research readiness — 2026-09-12

This checkout supports a research demonstration, not the full managed LP MVP.

## Implemented in this local increment

- Graph credentials are sent in an Authorization header rather than the URL. Live seven-day pool history was read successfully.
- Require an exact matching RPC/Graph block number plus pool identity, fee, tick and sqrt-price. Reject mismatches, indexing errors and stale/invalid history. When Graph returns a null hash, disclose the weaker verification explicitly and set `executionEligible: false`; do not claim block-hash verification or allow it to authorize execution.
- AI chooses a bounded set of research focus/follow-up codes. Financial facts, inventory direction, fee, ranges and scenario values are rendered by server-side rules and deterministic calculations. No model prose is shown. Some provider responses append prose even in JSON mode; it is discarded, while the initial selection object is strictly validated. Unsupported selections fail closed.
- Simulation actions are hidden unless simulation mode is explicitly enabled.
- Legacy prose reports are hidden with a rerun notice. New reports carry `reportVersion: 1`.
- Local first-login allowlist guidance shows the user's ID. Missing allowlist still denies private APIs; no authentication bypass was added.
- Allow the SDK's WalletConnect explorer fetch and Privy RPC resources in CSP, keeping other restrictions. External wallets/signing remain disabled.
- Local RPC switched from 1rpc to PublicNode after an intermittent public page failure; full pool read verified. Provider availability is still external.

## Dependency remediation

Final production audit: 39 advisories, 0 critical, 0 high, 28 moderate, 11 low. This is not a clean security audit or production approval.

Pinned overrides patch axios, ws 8, adm-zip, serialize-javascript, tmp and undici 5's vulnerable dependency chain. Native SQLite rebuild, application tests and frontend build were exercised. Overrides involving the transitive Hardhat/compiler tools were not acceptance of a Hardhat compiler/fork workflow. The application does not use these tools to execute transactions. Remaining older wallet tooling and ethers/elliptic dependencies require a separate SDK migration/compatibility review; do not force npm's proposed SDK downgrade.

## Actual account acceptance

- User completed real Privy email login after adding local allowed origins.
- The signed-in operator DID was added to local `PRIVY_ALLOWED_USER_IDS`; backend account lookup passed. No other account was added.
- Actual authenticated browser research request completed with real DeepSeek/RPC/Graph and three comparison cards. The completed report survived a browser reload; no horizontal overflow was detected in the current viewport. A transient Privy user lookup error was observed; the read-only SDK client now has one bounded retry.
- User created a Privy wallet. The authenticated wallet view displayed live zero ETH, USDC and WETH balances. No real funds were added.

## English workspace and isolated execution rehearsal

- Redesigned the workspace with Research, Wallet and Funding tabs, comparison cards, readable sources and responsive layouts. Legacy non-English question titles receive an English display label; stored questions remain intact.
- Desktop and 390px mobile layouts were inspected. Research drafts survive tab switching. Live authenticated research completed after fixing explicit first-tool selection and bounded structured-output recovery. Invalid model prose is never used as a financial report.
- Anvil mainnet fork on localhost, chain 31337: 19 successful test transactions covered entry, partial decrease, collection, increase, full exit, re-entry and allowance revocation. NFT ownership and final zero liquidity/owed balances were asserted. Artifact: `artifacts/fork-lifecycle.json`.
- This used disposable local accounts and fork-only funding. Zero mainnet transactions. Privy signing, public testnet deployment and browser-driven execution were not tested.

## Demo boundary

Ordinary `npm run dev`: live public RPC and live Graph research, no execution.
`npm run dev:mock`: explicitly synthetic Graph history and simulation lab; all simulated funding/execution must remain visibly labelled.

Real liquidity entry, funding settlement, constrained authority, automatic management, transaction recovery and deployed acceptance remain unfinished. See BRUCE_HANDOFF.md and PRD.md for the full target.
