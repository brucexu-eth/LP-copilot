# LP Copilot: demo readiness

Verified on 2026-09-12 against public Base Sepolia.

## Completed acceptance

- 34 genuine testnet transactions independently checked against sender, destination, value, calldata and successful receipts.
- The latest seven-step reposition ran entirely through server signing: remove liquidity, collect to the owner, exact USDC/WETH approvals, mint a wider position, clear both allowances. No owner-wallet recovery or per-transaction popup was needed.
- New active NFT: **82171**. Previous NFT 82170 is closed. The new range is approximately 1,632.7692–2,525.0369 test USDC per WETH.
- Total gas for the automatic run: **0.000005403425999319 test ETH**, below the 0.0003 test ETH budget.
- Both token allowances are zero. Temporary wallet signers were removed and local temporary signing keys deleted; provider and chain readbacks independently verified cleanup.
- A separate live AI-trigger test attached a limited signer, requested a fresh real AI assessment, and remained ARMED on HOLD with zero submitted transactions. Latest and pending wallet nonces both remained 34. That test's signer was then removed.
- Graph Studio data passed same-chain block-hash, freshness, pool price and liquidity checks against RPC; a real Swap event is indexed.
- 68 automated tests passed, including rejection of altered fee, range, recipient and amount. Production frontend build passed.

Mint receipt: https://sepolia.basescan.org/tx/0x65f2f22f68c2bc5ad27eb6b9e0161aa4b3a5189465a7c603097caf35c49e9f85

## Permission boundaries

Live diagnostics identified a Privy mismatch for uint24/int24 conditions used by mint's fee and ticks. The working policy independently enforces token identities, token amounts, recipient, chain and expiry. The server additionally checks the reviewed full-calldata hash before every signature and enforces fee, ticks, step order, operation count and gas budget. Range restrictions therefore depend on the server, not independent Privy enforcement. This limitation is disclosed in the interface.

Nine unfunded diagnostic wallets performed sign-only tests; no diagnostic transaction was broadcast. Eight diagnostic policies were explicitly denied after use, and the first expired. All ephemeral diagnostic owner keys were discarded.

The completed real reposition was operator-triggered, then executed automatically. The separate live AI run returned HOLD and correctly did nothing. A naturally occurring live AI WIDEN-triggered trade has not been demonstrated; its decision-to-queue behavior is covered by isolated tests. No fabricated AI decision or market event is presented as real.

## Recording path

1. Show My position, active NFT 82171 and live balances.
2. Open the floating Copilot and ask `Simulate my position`.
3. Show the on-page inventory scenarios; explain that these are hypothetical values excluding fees and trading costs.
4. Ask `Check my position` and show the real recommendation. Advice-only monitoring is left running for one hour while the local server is available.
5. Expand Transaction activity and open the most recent completed reposition (7/7 confirmed). Show the wider range and mint receipt.
6. Explain the two modes: `Approve & adjust once` runs the reviewed plan; `Approve & let AI decide` waits for a qualifying AI recommendation within the limited window.

Core testnet demo flow is ready for manual testing and recording. Repository publication/license review, human narration, submission metadata and actual hackathon submission remain separate work.
