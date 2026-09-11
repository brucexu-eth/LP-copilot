# LP Copilot

**Evaluate LP opportunities, understand exposure, and plan explicitly approved operations.**

The current build adds authenticated, durable AI research and user-initiated Privy wallet creation to the read-only LP workbench. It uses live Ethereum pool state to compare keeping a range, widening it with the same inventory, and withdrawing into both tokens. Signing and automated management are not enabled. See [current development evidence and blockers](docs/RESEARCH_PROGRESS.md).

## Offline management rehearsal

An opt-in [Simulation Lab and real-integration TODO checklist](docs/MOCK_HANDOFF.md) now covers synthetic funding, policy confirmation, LP management, worker monitoring, partial failures and restart recovery. Start `npm run dev:mock` and open `http://127.0.0.1:3400/lab`, or use the secret-free startup command in that guide. All balances, authorization, bridges and execution there are **MOCK**; the original authenticated live-research routes are not bypassed. No real execution is enabled.

## Run locally

Node.js 20.11+ and npm are required. A maintained Node LTS is recommended.

```sh
npm ci --ignore-scripts
npm rebuild better-sqlite3
npm run build
npm start
# Open http://127.0.0.1:3400
```

Optional configuration (never overwrite an existing `.env`):

```sh
cp .env.example .env
# Edit ETH_RPC_URL and optionally GRAPH_API_KEY.
# Add PRIVY_APP_ID / PRIVY_APP_SECRET for login. Keep .env mode 600.
# Approve exact PRIVY_ALLOWED_USER_IDS separately before private wallet reads.
npm run dev
```

The default public RPC may be rate-limited. Use your own Ethereum RPC if necessary. The server binds to loopback only. No wallet keys are needed or accepted. Do not expose this development server publicly.

## Try the small loop

1. Select **Learning position at the live pool price** and click **Read & compare**. The pool is live; this position is hypothetical and labeled accordingly.
2. Compare HOLD, WIDEN and EXIT. All start with the same LP inventory. WIDEN keeps unused tokens idle; EXIT keeps USDC and WETH, not just stablecoins.
3. Read the price scenarios and provenance. These are inventory values, not net profit or future returns. No accrued/future fees or execution costs are included.
4. Select **Import a public NFT token ID**. Sample `1361432` was verified in this pool on 2026-09-05; it belongs to a public third-party position, not an application user. Its future liquidity/existence can change.
5. Try NFT `1`, which is not in the supported pool, to see an explicit rejection. Previous results are cleared when the input changes.

## Integration boundaries

- **Uniswap v3:** Ethereum USDC/WETH 0.3% pool [`0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8`](https://etherscan.io/address/0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8). [Contract reads and identity checks](src/data.mjs), [pinned addresses](src/config.mjs), [integer inventory/scenario math](src/math.mjs), [SDK cross-checks](test/math.test.mjs).
- **The Graph:** optional pinned-block pool history adapter in [src/data.mjs](src/data.mjs). Requires a Studio API key. Missing/invalid/stale data is never replaced by fixtures. Live Graph verification is still pending, so this iteration is **not Graph AI prize-ready**.
- **Privy authentication foundation:** runtime-configured email login and server-side ES256 access-token validation for the exact app. `/api/me` resolves linked Ethereum wallets from the verified subject; `PRIVY_ALLOWED_USER_IDS` must list the exact operator DID (empty denies private access). User-initiated embedded wallet creation is implemented; actual user acceptance is pending. External wallet connection, delegation and signing remain disabled.
- **AI:** bounded DeepSeek tool calls read real RPC evidence and deterministic comparisons; private questions/results persist in application-local SQLite. The public comparison view retains deterministic notes. `DEEPSEEK_API_KEY` is required for chat.
- **Graph development mode:** `npm run dev:mock` explicitly enables fixed, labelled synthetic history. It is never an automatic fallback and never evidence for trading.
- **LI.FI / execution:** not integrated into the application. Typed unsigned mint/increase/decrease/collect builders have unit coverage; fork lifecycle acceptance is blocked. No transaction broadcast endpoint exists.

Token amounts use integer arithmetic and SDK range sizing; display values and scenarios use floating-point arithmetic and are approximate. No approval or execution should consume these display values. Stored NFT `tokensOwed` does not include all accrued fees and is not presented as a total claimable balance.

## Verify

```sh
npm run check
npm run verify:live
SAMPLE_TOKEN_ID=1361432 npm run verify:live
# While npm start runs in another terminal:
npx playwright install chromium
node scripts/verify-browser.mjs
# Real Privy login-modal smoke test, no email/code submission:
node --env-file=.env scripts/verify-auth-browser.mjs
```

Unit/HTTP tests use explicitly synthetic fixtures; `verify:live` and `verify-browser` use real public RPC data and can fail when the provider is unavailable. Live artifacts are written to ignored `artifacts/` and must be reviewed before sharing. Tests do not send transactions.

## Small roadmap & submission

- [Simplified product scope](docs/PRD.md)
- [AI assistance disclosure and remaining artifact gate](docs/AI_DISCLOSURE.md)
- [ETHOnline checklist](docs/HACKATHON.md)
- [Uniswap integration feedback](FEEDBACK.md)
- [Security boundaries](SECURITY.md)

Target scope now includes bounded pool screening, LI.FI cross-chain funding, Uniswap entry and approved adjustments, AI-assisted scenarios and monitoring. Robinhood is the preferred network to investigate, not a supported runtime claim. See the [technical design](docs/TECHNICAL_DESIGN.md), [specifications](docs/specs/LP_LIFECYCLE.md), [acceptance cases](docs/specs/ACCEPTANCE.md), [implementation plan](docs/IMPLEMENTATION_PLAN.md) and [development report](docs/REPORT.md). The application includes the research foundation described above; no trading capability is enabled by these documents.

Private development precedes a reviewed open-source release. No hackathon form, public release, demo recording or license approval has been completed by this repository.
