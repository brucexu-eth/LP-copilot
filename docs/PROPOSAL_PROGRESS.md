# Versioned mock proposal increment

This increment adds a durable manual proposal to the local lab, not the promised complete research-to-real-execution product.

Delivered: structured amount/range/reason; server-assigned monotonically increasing current version; exact-version confirmation bound to a separately approved mock policy; five-minute confirmation validity; one-shot submission; job-to-plan version reference; the proposed range is used at synthetic mint; current position summary. Restart and refresh preserve the current proposal. Prior full draft versions are not archived yet; event history retains revision events only.

All notes are USER_NOTE_UNVERIFIED. The UI does not imply pasted text is authenticated AI evidence. Existing advanced lab actions remain available for fault testing, so proposal confirmation is not a universal authorization gate for that offline simulator. No real authorization route changed. The mock policy, not the draft, governs later automatic repositioning.

Verification: regression first failed on unsupported DRAFT command. Unit tests cover revision invalidation, one-shot submission, restart, session isolation, policy changes, expiry and revoke. Actual desktop/mobile Chromium now saves a draft, reloads, confirms, executes the selected range, then exercises failure/restart/retry/exit. No external requests or page errors; mobile overflow found during verification and repaired.

Still not delivered: authenticated research automatically creating proposals, shared research/wallet/proposal UI, historical proposal version records, real LI.FI quote adapter, fork lifecycle, real sending/reconciliation, SDK remediation. Fresh production dependency audit remains 47 advisories including 7 high; audit proposes major SDK changes for some, which have not been blindly forced. No real signing, funds, deployment or production acceptance.
