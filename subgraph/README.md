# LP Copilot Base Sepolia indexer

Indexes the actual USDC/WETH 0.05% pool at `0x94bfc0574FF48E92cE43d495376C477B1d0EEeC0`, starting at block 46713000. Pool state is refreshed at every indexed block; Swap events are stored separately. No mainnet or synthetic history is substituted.

1. Create `lp-copilot-base-sepolia` in https://thegraph.com/studio/ on Base Sepolia.
2. Keep the deploy key secret. Configure `GRAPH_STUDIO_DEPLOY_KEY` in the application `.env`; never commit it.
3. Run `npm ci`, `npm run codegen`, and `npm run build` in this directory.
4. Authenticate the Graph CLI with the Studio deploy key, then run `npm run deploy`.
5. Copy Studio's deployment query URL into application `.env` as `BASE_SEPOLIA_GRAPH_URL`, then restart the app.
6. Wait until the indexer catches up. The app requires a matching block hash and pool state from the same chain before automatic execution.

This deployment can consume RPC/indexing resources. Use Studio's status and usage panels to check indexing progress. A successful local build does not mean the hosted indexer has been deployed or is fresh.

## Hosted deployment

Created and deployed to Graph Studio on 2026-09-12.

- Studio: https://thegraph.com/studio/subgraph/lp-copilot-base-sepolia/
- Version: v0.1.0
- Deployment: QmSPeK2FdPh6PjuJy15CeHwTvCJEsAZHHga7ec6b4A3BLH
- Query: https://api.studio.thegraph.com/query/1760179/lp-copilot-base-sepolia/v0.1.0

The deploy key and query URL are configured in the local ignored environment file. This is a Studio development deployment, not an onchain publication. The first deployment exposed an ABI compatibility issue: Graph Node requires the Swap event's explicit `anonymous: false` field, now present in the ABI. The application independently checks freshness and chain state before accepting indexed data.
