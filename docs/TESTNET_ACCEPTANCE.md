# Base Sepolia terminal acceptance — 2026-09-12

## Product

English, compact terminal inspired by LP Terminal: Pools and Positions navigation, live pool state, a range diagram and a single operation panel. Copilot is a floating lower-right chat. Validated model actions edit the same draft used by the form, highlight the change and offer Undo. Chat cannot sign or submit transactions. Testnet prices are not financial-market evidence; no APR or invented history is displayed.

## Real public testnet run

- Network: Base Sepolia, chain 84532.
- Pool: `0x94bfc0574FF48E92cE43d495376C477B1d0EEeC0`, official Uniswap v3 USDC/WETH, fee 500 (0.05%). Factory, token addresses, decimals and tick spacing are checked through RPC.
- Wallet: `0xEB22BD75B27F1Ae0557EC67F8b3f064955079102`, backend-verified Privy account. All signing occurred through its browser wallet confirmation flow.
- Wrapped 0.004 test ETH. Entered with 5 test USDC and 0.002476432937093498 test WETH. Created NFT 82157. Increased with 1 test USDC and the matching WETH amount; removed half, collected, removed the remainder and collected again.
- 15 successful transactions, including exact approvals and clearing residual allowances. Zero mainnet transactions.
- Final NFT liquidity: zero. Stored USDC/WETH owed: zero. Both allowances to the position manager: zero.
- Final balances at verification: 0.105990349230934773 test ETH, 19.999998 test USDC and 0.003999999999999998 test WETH. Small token differences are integer rounding, not an asserted profit or loss calculation. The empty NFT remains owned by the wallet.

## Recovery exercised

The browser was reloaded between partial removal and collection. The persisted operation resumed at collection without repeating removal.

Privy timed out during the full-removal transaction although it was mined successfully. RPC event/transaction/receipt checks found `0xd90508e9902fd2287041ec85558a7b42f83e5124097462492092a91d03305706`. The UI recovery form accepted that exact hash only after validating sender, recipient, value and calldata. Collection then completed; no duplicate exit was sent.

The revised sender persists an awaiting-wallet intent before asking Privy to broadcast. An unresolved intent blocks another submission. Explicit rejection can clear the intent only if the wallet nonce is unchanged. Unknown responses require reconciliation. A reload and a server restart preserve the operation records.

## Automated and UI checks

54 tests passed, including amount/range bounds, linked-wallet isolation, no approval skipping, uncertain-send blocking, mismatched recovery rejection and expired previews. Frontend builds passed. Desktop and 390px mobile layouts were inspected with no horizontal overflow or visible Chinese. Live chat changed the draft from a 10% to 15% range, and a second request edited amount/range together. The UI exposes exact approval amounts in new previews.

## Reproduce manually

1. Sign in, verify Base Sepolia and live balances.
2. Use a small USDC amount. Preview to see required WETH; wrap test ETH if needed, retaining ETH for gas.
3. Review the exact amount and range. For each step, check the transaction, confirm in Privy, dismiss its completion screen and inspect the receipt.
4. Open Positions, select the NFT and exercise Increase, Remove 50%, Collect and Exit. Removing liquidity and collecting are separate transactions.
5. Use Transaction activity to resume an operation. After a wallet timeout, inspect the explorer and recover the submitted hash; do not blindly resend.
6. Check zero liquidity/owed balances after full exit. Exiting retains both tokens; WETH is not automatically unwrapped or sold.

Full receipt evidence is in `artifacts/testnet-acceptance.json`. `scripts/verify-testnet-acceptance.mjs` independently reads and checks it against the chain.

## Remaining scope

No delegated/automatic management, mainnet activation, cross-chain settlement, market-history-backed testnet advice or production deployment is claimed. Claimable fees beyond checkpointed tokens owed and cost-basis PnL are not implemented. This completes the assisted public-testnet lifecycle, not the entire managed LP PRD.
