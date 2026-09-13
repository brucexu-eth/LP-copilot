# Uniswap integration feedback

## Integration exercised

LP Copilot uses Uniswap v3 on Base Sepolia (84532), the deployed nonfungible position manager and the SDK for position amounts and range scenarios. The public testnet flow covers minting, increasing liquidity, decreasing liquidity, collecting tokens and clearing exact ERC-20 allowances. The terminal verifies factory, pool, tokens, fee tier and tick spacing before preparing calls.

## Observed developer experience

- SDK position calculations made it practical to derive the paired-token amount and compare inventory across hypothetical prices without presenting fabricated APR.
- Separating decreaseLiquidity from collect needs explicit UI treatment. Removing liquidity does not itself deliver all tokens to the wallet.
- Integer rounding and checkpointed tokens owed need clear labels; neither should be advertised as profit or complete claimable fees.
- Receipt reconciliation should validate the full transaction, since a wallet can time out after a transaction has mined. This happened in our public testnet run.
- A realistic testnet pool and documented test-token addresses improve onboarding substantially. Thin testnet liquidity and test-chain prices must remain visibly distinct from market data.

## Suggested documentation additions

A frontend example that covers exact approvals, residual approval cleanup, interrupted wallet sessions and multi-step receipt recovery would help builders move beyond a single successful mint demo. A testnet troubleshooting guide should distinguish factory/pool deployment, token funding, range selection and wallet-session failures.

The wallet authentication interruption observed during testing came from Privy; it is not attributed to a Uniswap contract failure. This feedback file is prepared for review. The external hackathon feedback form has not been submitted.
