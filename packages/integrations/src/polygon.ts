/**
 * Polygon.io stock data wrapper.
 *
 * Used by T4 (snapshot cron) to get NASDAQ top-volume tickers every day.
 *
 * Free-tier limits (per docs/RESEARCH.md §3):
 *   - 5 API calls / minute
 *   - End-of-day data only (15-min delayed)
 *   - Snapshot endpoint: max 250 symbols per call
 *
 * Our usage pattern (cron once per market per day) → free tier is enough.
 *
 * Env:
 *   POLYGON_IO_API_KEY  — required at call time
 */
import { z } from 'zod';
import type { MarketCode, SnapshotEntry } from '@jion/types';

// ---------------------------------------------------------------------------
// Polygon API response schema (validated, defensive)
// ---------------------------------------------------------------------------

const PolygonTickerSchema = z.object({
  ticker: z.string(),
  day: z
    .object({
      v: z.number().optional(), // volume
      c: z.number().optional(), // close
      vw: z.number().optional(), // VWAP
    })
    .partial()
    .optional(),
  prevDay: z
    .object({
      v: z.number().optional(),
      c: z.number().optional(),
    })
    .partial()
    .optional(),
  lastTrade: z
    .object({
      p: z.number().optional(), // last trade price
    })
    .partial()
    .optional(),
  todaysChange: z.number().optional(),
  todaysChangePerc: z.number().optional(),
  updated: z.number().optional(),
});

const PolygonSnapshotResponse = z.object({
  status: z.string(),
  tickers: z.array(PolygonTickerSchema),
});

export type PolygonTicker = z.infer<typeof PolygonTickerSchema>;

// ---------------------------------------------------------------------------
// Ticker → display name (small whitelist — we don't need Polygon's name lookup
// because (a) tickers list is small & curated, (b) Polygon's name endpoint
// burns a separate call quota).
// ---------------------------------------------------------------------------

const TICKER_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA Corp',
  TSLA: 'Tesla Inc',
  AAPL: 'Apple Inc',
  MSFT: 'Microsoft Corp',
  AMD: 'Advanced Micro Devices',
  META: 'Meta Platforms',
  AMZN: 'Amazon.com',
  GOOGL: 'Alphabet Class A',
  MSTR: 'MicroStrategy',
  AVGO: 'Broadcom Inc',
  PLTR: 'Palantir Technologies',
  COIN: 'Coinbase Global',
  NFLX: 'Netflix Inc',
  CRM: 'Salesforce Inc',
  ADBE: 'Adobe Inc',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FetchTopVolumeOptions {
  /** API key. Defaults to process.env.POLYGON_IO_API_KEY. */
  apiKey?: string;
  /** Override the base URL (used by tests). */
  baseUrl?: string;
  /** Override `fetch` (used by tests). */
  fetchImpl?: typeof fetch;
}

/**
 * Fetch top-N tickers by intraday trading volume for a given market.
 *
 * Currently only NASDAQ (US) is supported — Polygon.io is US-only.
 * For KRX/TSE we'll add a separate adapter later, or rely on mocks.
 *
 * @returns SnapshotEntry[] ordered by descending volume.
 */
export async function fetchTopVolume(
  market: MarketCode,
  limit: number = 10,
  options: FetchTopVolumeOptions = {}
): Promise<SnapshotEntry[]> {
  if (market !== 'NASDAQ') {
    throw new Error(
      `Polygon.io supports US markets only. Got: ${market}. ` +
        `Use a different provider or mock for ${market}.`
    );
  }

  const apiKey = options.apiKey ?? process.env.POLYGON_IO_API_KEY;
  if (!apiKey) {
    throw new Error(
      'POLYGON_IO_API_KEY not set. Add it to .env or pass `apiKey` option.'
    );
  }

  const baseUrl = options.baseUrl ?? 'https://api.polygon.io';
  const url = `${baseUrl}/v2/snapshot/locale/us/markets/stocks/tickers?apikey=${apiKey}`;
  const fetchFn = options.fetchImpl ?? fetch;

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Polygon.io returned ${res.status} ${res.statusText}`);
  }

  const raw = await res.json();
  const parsed = PolygonSnapshotResponse.parse(raw);

  // Sort by `day.v` descending; tickers with no volume drop to the bottom.
  const ranked = [...parsed.tickers]
    .filter((t) => (t.day?.v ?? 0) > 0)
    .sort((a, b) => (b.day?.v ?? 0) - (a.day?.v ?? 0))
    .slice(0, limit);

  return ranked.map((t, idx) => mapTickerToEntry(t, idx + 1));
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function mapTickerToEntry(t: PolygonTicker, rank: number): SnapshotEntry {
  const volume = t.day?.v ?? 0;
  // Best-available price: last trade > day close > prev day close.
  const price = t.lastTrade?.p ?? t.day?.c ?? t.prevDay?.c ?? 0;

  return {
    rank,
    ticker: t.ticker,
    name: TICKER_NAMES[t.ticker] ?? t.ticker,
    volume1h: volume,
    price,
  };
}
