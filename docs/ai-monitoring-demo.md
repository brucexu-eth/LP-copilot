# AI-first demo walkthrough

Use Base Sepolia only. All on-screen portfolio and transaction values are test tokens.

1. Select a position. Show its deposited capital, P&L, range and actual earned fees. Pause for 8 seconds.
2. Open Copilot and send “Check my position”. Show the refreshed assessment in the AI sidebar, including the observed price, timestamp, range and reason. Pause for 8 seconds.
3. Enable automatic execution. Review the exact amounts, recipient, expiry and gas cap. Confirm once with “Confirm & let AI decide”.
4. Show the authorized waiting state. HOLD means no transaction. Only a live WIDEN recommendation passing the checks can queue this approved adjustment.
5. Pause, verify the paused state, and resume. The existing authorization remains usable only until its original expiry; resuming does not extend it.
6. Refresh the page and confirm the same monitoring state persists. Switch positions and confirm the sidebar follows the selected position.
7. Optionally show Simulation briefly as a risk-explanation tool. It does not trigger the signer or change the real pool.

## Execution footage

If a real WIDEN decision occurs, show the queued operation, confirmations and resulting position. Otherwise describe the session accurately as authorized monitoring with a HOLD decision. An operator-triggered automatic operation must be labeled separately; it is not an AI market decision.

## This walkthrough's findings

- Expired or removed authorizations appeared as setup pending; labels now distinguish ended sessions and removed access.
- A checkbox prepared a proposal without becoming checked; replaced with an explicit setup button and separate authorized status.
- Pause could appear to discard authorization; the paused message now explains that the existing authorization is retained only until expiry.
- Removed signers still exposed removal controls; those controls are hidden after confirmed removal.
- Periodic list refresh cleared action errors; errors now remain until another user action resets them.
- Tiny negative P&L displayed as negative zero percent; normalized the rounded zero display.

## Observed result

Position #82179: fresh AI assessment returned HOLD with a cost-related reason while the observed price remained in range. A reviewed one-time adjustment was armed. Pause/resume reused the same authorization. No transaction was initiated solely to manufacture an AI adjustment signal.

## Verified execution demonstration (2026-09-13)

The hypothetical range-coverage evaluations returned HOLD. They did not initiate trades. An explicitly labeled `DEMO_OPERATOR` trigger then executed the already-approved exact plan, with live Graph, simulation, expiry and gas checks intact.

- Old position: #82179. New position: #82184.
- New range: 1,759.9294–2,351.9840 USDC/WETH.
- Seven transactions confirmed, with no per-transaction wallet prompts.
- Recorded gas: 0.000005462795747372 test ETH.
- Both token allowances verified zero; Privy additional signer count zero; local temporary key absent.
- Evidence: `outputs/demo-reposition-verification.json`.

The UI now distinguishes ARMED (waiting for AI) from QUEUED/RUNNING (execution). The demo offers two separate controls: hypothetical evaluation by AI, and explicit execution of the approved plan even when AI chooses HOLD. Do not describe the latter as an AI recommendation.
