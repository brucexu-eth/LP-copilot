# LP Copilot

An English liquidity terminal with a floating Copilot, live position monitoring and scoped Uniswap v3 execution on **Base Sepolia**.

## Current flow

Connect with Privy → select the verified USDC/WETH 0.05% pool → set an amount and range → preview exact token amounts → confirm each transaction → manage the owned NFT → remove liquidity and collect tokens.

The right-hand panel owns the operation draft. Copilot can update its amount and range or open position actions; it cannot sign. Every manual transaction is simulated, checked against the authenticated wallet and fixed testnet, and confirmed through Privy. The position manager adds persisted one-minute checks, real-position HOLD/WIDEN/EXIT scenarios and bounded AI evaluations. Transaction intents and hashes persist in SQLite. A wallet timeout can be reconciled using a transaction hash, with the sender and full call checked before it is accepted.

Public testnet acceptance completed on 2026-09-12: 15 successful transactions covered wrapping, entry, increase, partial decrease/collection and full exit. NFT 82157 ended with zero liquidity and zero tokens owed; both token allowances were zero. See [testnet acceptance](docs/TESTNET_ACCEPTANCE.md).

## Run locally

Node.js 20.11+ and npm are required. Preserve the existing `.env`.

```sh
npm ci --ignore-scripts
npm rebuild better-sqlite3
npm run dev
```

Open http://127.0.0.1:3400. Privy app credentials and the operator DID allowlist are required. Allow the local origin in Privy. DeepSeek credentials enable chat. Do not put wallet keys in `.env`. Manual operations use the user-owned Privy wallet. A temporary server authorization key is generated only for a reviewed delegated plan and is stored in ignored local data with mode 0600; wallet attachment is a separate owner operation.

The executable network is fixed to Base Sepolia (84532). It uses test USDC and WETH; retain test ETH for gas. Obtain test USDC from https://faucet.circle.com/ with Base Sepolia selected. Entry is limited to 20 test USDC per deposit, wrapping to 0.01 test ETH, and slippage to 0.5%.

## Verification

```sh
npm run check
node scripts/verify-testnet-acceptance.mjs
```

The acceptance script is read-only and checks this checkout's recorded test run and NFT 82157. It requires the local test-run database. `artifacts/testnet-acceptance.json` contains transaction hashes and balances. It is not a generic deployment test.

## Boundaries

- No mainnet execution or cross-chain settlement.
- The automatic worker accepts a reviewed one-time same-pool plan, a separately attached bounded Privy policy, verified same-chain Graph data, a ten-minute signing window and gas/token caps. It may run immediately or wait for an AI WIDEN decision; it never renews access unattended. A seven-transaction public Base Sepolia run completed entirely through server signing and was independently verified. Privy enforces tokens, amounts, recipient, chain and expiry; the server additionally pins full calldata, including fee and range, because Privy's uint24/int24 policy matching failed live tests. See [management readiness](docs/MANAGEMENT_READINESS.md).
- Testnet pool prices are genuine test-chain state, not market prices or evidence of investment returns. No fabricated historical chart or APR is displayed.
- Ethereum RPC/Graph research and LI.FI read-only quote endpoints remain available as separate integrations. Their mainnet evidence is not mixed with testnet execution. Historical reports are retained in their existing database.
- The opt-in `/lab` remains a separate, clearly synthetic simulation. Start it with `npm run dev:mock`; it does not prove real execution.
- [PRD](docs/PRD.md) describes the larger managed LP target. Earlier handoff documents are historical; [testnet acceptance](docs/TESTNET_ACCEPTANCE.md) describes the current terminal.

The local server defaults to loopback. An explicitly enabled, operator-restricted Docker deployment is documented in [Coolify deployment](docs/DEPLOYMENT.md). This is a testnet build; remaining dependency advisories and production security review are separate work.
