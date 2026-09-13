# Coolify testnet deployment

Target: Bruce area, `https://lpcopilot.brucexu.xyz`.

Use the repository Dockerfile and one application instance. Expose internal port
3400 through Coolify's HTTPS proxy. Do not publish the container port directly.
Mount a persistent volume at `/app/data`, writable by UID/GID 1000. All SQLite
databases and temporary bounded signer files reside there. Use stop/start
deployment rather than overlapping replicas: the worker has no cross-process
execution lock. Do not deploy while a delegated job is active.

Runtime configuration:

```text
HOST=0.0.0.0
PORT=3400
ENABLE_HOSTED_TESTNET=1
APP_ORIGIN=https://lpcopilot.brucexu.xyz
LP_DATA_DIR=/app/data
ENABLE_SIMULATION_LAB=0
GRAPH_MODE=live
```

Set `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_ALLOWED_USER_IDS`,
`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `BASE_SEPOLIA_GRAPH_URL`, and optional
`GRAPH_API_KEY`/`ETH_RPC_URL` as runtime variables using the owner's existing
configuration. Do not pass secrets as build arguments. The Graph Studio deploy
key is not needed by this application. Add the exact HTTPS origin to the Privy
app's allowed origins. Keep the operator allowlist; a public page does not grant
visitors transaction access.

The image runs as the non-root node user and checks `/api/health`. Confirm HTTPS,
health, login, static assets, and an authenticated read after deployment. No
transaction or new delegation is needed for deployment acceptance. A fresh data
volume will not contain local transaction history. Do not copy local databases
or temporary signer keys as part of deployment.

Dependency check on 2026-09-13: `npm audit --omit=dev` reported zero high/critical,
28 moderate and 11 low advisories. Remaining SDK/transitive advisories require
ongoing review; this is an operator-restricted testnet demo, not production
financial infrastructure.
