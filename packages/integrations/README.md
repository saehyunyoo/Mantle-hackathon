# @jion/integrations

External data source wrappers for T4 (snapshot cron) and beyond.

## Modules

| Module | Purpose | Env |
| --- | --- | --- |
| `polygon` | NASDAQ Top-N tickers by intraday volume | `POLYGON_IO_API_KEY` |
| `pyth` | Pyth Hermes equity prices + on-chain update payloads | — (public API) |

## Usage

```ts
import { fetchTopVolume, fetchPythPricesByTicker } from '@jion/integrations';

// 1. Get NASDAQ top 10
const top10 = await fetchTopVolume('NASDAQ', 10);

// 2. Get oracle prices for those tickers + payloads to pass on-chain
const tickers = top10.map((t) => t.ticker);
const { prices, updateData } = await fetchPythPricesByTicker(tickers, 'NASDAQ');

// 3. updateData → OracleAdapter.updateAndRead(...) inside T5 cron
```

## Tests

```bash
cd packages/integrations
bun test
```

All HTTP calls are dependency-injected via `fetchImpl` so tests never touch
the network.

## Tradeoffs / Notes

- **Polygon.io free tier**: 5 calls/min, end-of-day delayed. Our cron hits the
  snapshot endpoint once per market per day — well within budget.
- **Polygon.io = US only**: KRX/TSE need a different provider (yfinance fallback,
  or the broker-level data Polygon paid tier).
- **Pyth Hermes**: public, no API key, rate-limited but generous. Feed IDs for
  US + Korean equities pre-loaded; expand `PYTH_FEED_IDS_*` as needed.
- **No browser support**: imports `process.env`, intended for Node/Bun runtime
  (Next.js server components / API routes).
