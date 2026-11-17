# ETH Whale Tracker
Read-only Ethereum research dashboard.

## Features in v0.1
- ETH price, 24h change, market cap, volume and circulating supply via CoinGecko public API.
- 24h price chart.
- ETH balance queries for curated Ethereum addresses using a public JSON-RPC endpoint.
- Browser-local custom wallet watchlist and Etherscan links.
- Explicit distinction between individual attributions, organizations, exchange custody and protocol contracts.

## Run locally
Open index.html, or run `python -m http.server 8000` and visit http://localhost:8000.

## Render Static Site
Connect this repository in Render. Leave Build Command blank and set Publish Directory to `.`.

## Limitations
This is an initial prototype. It does not yet index historical transfers, calculate exchange netflows, integrate ETF flow data, store daily snapshots in a database, or send automatic alerts. Public RPC can be rate-limited. A wallet balance does not prove beneficial ownership. Exchange deposits do not prove a sale. Custom watchlist data is stored locally in the browser.

## Planned
1. Explorer/indexer integration for transfers and balance history.
2. Entity labels with confidence levels and evidence.
3. Exchange flow classification and duplicate/internal transfer filtering.
4. ETF flows.
5. Persistent storage, scheduled snapshots and alerts.

No private keys, seed phrases, wallet signatures or trade execution. Research only; not investment advice.
