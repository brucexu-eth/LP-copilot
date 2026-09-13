# Testnet security boundary

LP Copilot executes only on Base Sepolia. Manual transactions require the
 authenticated owner. Delegated execution requires a reviewed bounded plan and
an owner-attached Privy signer; the chat model cannot sign.

- Local startup defaults to loopback. Hosted startup requires explicit activation,
  HTTPS origin configuration, Privy credentials, an operator allowlist, and a
  disabled simulation lab. The proxy terminates TLS; the container port stays private.
- API requests retain authentication and exact origin checks. Forwarded headers
  do not select a trusted origin. Missing credentials or allowlist fail closed.
- Secrets stay in runtime configuration. Local databases, signer material and
  environment files are excluded from the container build context.
- Privy enforces chain, token amounts, recipient and expiry. The server separately
  pins full calldata, including fee and ticks. See
  [management readiness](docs/MANAGEMENT_READINESS.md) for the policy limitation.
- Run one instance with persistent `/app/data`. Do not overlap workers during
  deployment or copy active signer keys from a developer machine.

On 2026-09-13, the runtime dependency audit reported 0 high/critical, 28 moderate
and 11 low advisories. SDK dependency findings remain under review; no production
security certification is implied. Do not blindly force dependency downgrades.

See [deployment instructions](docs/DEPLOYMENT.md). Mainnet execution is unsupported.
