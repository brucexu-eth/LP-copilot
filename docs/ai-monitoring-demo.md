# AI monitoring and execution demo

Base Sepolia only. All balances and transactions use test tokens.

## Verified result — September 13, 2026

A bounded AI session moved position **#82180 → #82186**. A labeled hypothetical out-of-range signal was sent to the real model. The model selected WIDEN with a 15% width. The server generated a fresh range around the unchanged live price and executed it using the previously attached session signer. No operator execution override or per-transaction confirmations were used.

- New range: **1,768.7507–2,340.2540 USDC/WETH**.
- Reinvested: 2.651732 test USDC and 0.001312081330926223 test WETH, including the authorized wallet reserve.
- Seven confirmed transactions: withdraw, collect, approve USDC, approve WETH, mint, clear USDC allowance, clear WETH allowance.
- Recorded gas: 0.000005472171965556 test ETH.
- Owner verified; both allowances zero; Privy additional signers zero; local temporary key removed.
- A new read-only monitoring session follows #82186. Signing access is not renewed.
- Evidence: `outputs/ai-session-verification.json`.

This verifies **AI decisions from simulated evidence followed by real testnet execution**. It does not demonstrate an actual market price crossing. The earlier #82179 → #82184 example was operator-triggered and remains separately labeled.

## Three-minute recording

1. **0:00–0:25 — Position.** Open My position and select #82186. Show the current range, inventory and earned fees. Explain that this is a real Uniswap v3 position on a public testnet.
2. **0:25–0:55 — Ask the AI.** Open Copilot and ask: “Is my position in range? What happens if WETH rises past my upper price?” Show the contextual answer. Follow up: “Why would I choose a wider range?” Questions now receive model-generated answers instead of a fixed EXPLAIN response.
3. **0:55–1:20 — Monitor.** Show the AI sidebar's checked price, range, timestamp and reason. HOLD means no transaction. The background worker checks each minute and skips a new model request when evidence is unchanged.
4. **1:20–1:45 — Explain authorization.** One bounded session allows one fresh same-pool range, at most 5 USDC and 0.004 WETH allocated from the source position plus the wallet reserve, a 0.5% slippage limit and a 0.0003 test ETH gas budget. Signing expires after 10 minutes; it never silently renews.
5. **1:45–2:30 — Show the verified execution.** Open Current task → History. Expand **Reposition liquidity · #82180 → #82186 · Complete · 7/7**. Show its AI demo provenance, new range and receipts. Label this as previously recorded execution, not a live transaction.
6. **2:30–3:00 — Close the loop.** Return to #82186. Explain that the system follows the new position, clears token approvals and retires temporary signing access. Simulation is an optional explanation tool, not the main feature.

Suggested English narration: “We authorize a limited management session once. For this demonstration, we feed the AI a clearly labeled out-of-range scenario. The AI chooses a new range width; the server rebuilds the transaction plan using the real current price, validates the session limits, and completes all seven transactions. The resulting position is monitored automatically.”

## Record a fresh execution

1. Select an active position and start monitoring. Ensure the wallet has both test USDC and test WETH available; test ETH is only for gas. The application does not automatically wrap ETH or swap tokens.
2. Enable automatic execution. Review the session limits and authorize AI management once. The initially shown amounts are an example, not a promise that the later live plan will use identical amounts.
3. Wait for the initial live assessment to finish. Open **Testnet demo → Evaluate demo & execute if AI recommends**.
4. The hypothetical signal never changes the actual pool. The AI can return HOLD. If WIDEN is returned and the fresh plan passes all checks, Current task shows automatic progress. Do not click the separate operator execution demo button to represent an AI decision.
5. Wait for completion and access cleanup. The new position ID appears in history; its monitoring session is read-only.

## Implementation and current limits

- Chat receives bounded conversation history plus server-read selected-position facts. It generates English answers and validated draft/monitoring actions. Chat cannot grant signing authority or directly construct arbitrary transactions.
- The decision model supplies HOLD/WIDEN/EXIT, a reason, explanation and width. Numerical range facts are displayed separately. A validator rejects obvious reversals of the observed out-of-range direction before accepting a new model response.
- The live and hypothetical decision snapshots are distinct. A hypothetical decision uses the same live plan builder and signing checks, but is permanently labeled AI_DEMO.
- Session policies constrain chain, contracts, original NFT, recipient, token budgets and expiry. The server additionally pins the generated calldata, range, order, operation count and gas budget. Privy's decoded uint24/int24 policy limitation means fee and tick checks are application-enforced, not independently enforced by Privy.
- A completely out-of-range LP can be single-sided. This implementation may use the explicitly authorized two-token wallet reserve, capped at the session allocation limits. It does not implement a balancing swap; insufficient inventory blocks execution with a reason.
- Automatic execution supports WIDEN/recentering only. EXIT remains advice requiring an explicit operation. It is not continuous unlimited portfolio management, and it does not optimize or guarantee profit.
- Pause/revoke, expired authority, unverifiable Graph data, insufficient inventory and failed simulations prevent future submissions. Already broadcast transactions require reconciliation.
