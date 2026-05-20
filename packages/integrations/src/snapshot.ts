/**
 * Snapshot service — composes Polygon + Pyth into a `MarketSnapshot`.
 *
 * This module owns the business logic for "what is today's snapshot":
 *   1. fetchTopVolume from Polygon
 *   2. enrich each entry with a Pyth oracle price (overrides the Polygon
 *      last-trade price when available — Pyth is the canonical on-chain
 *      source of truth)
 *   3. emit a {@link MarketSnapshot} object
 *   4. (optional) persist via a caller-injected `SnapshotStore`
 *
 * Storage is *dependency-injected* so this package stays free of Supabase /
 * Postgres deps. The caller (apps/web cron handler) supplies the store.
 *
 * Why DI: keeps `@jion/integrations` deployable in any runtime (Vercel cron,
 * GitHub Actions, a CLI script) and keeps tests offline.
 */
import type { MarketCode, MarketSnapshot, SnapshotEntry } from '@jion/types';
import { fetchTopVolume, type FetchTopVolumeOptions } from './polygon';
import {
  fetchPythPricesByTicker,
  type FetchPythOptions,
  type PythPrice,
} from './pyth';

// ---------------------------------------------------------------------------
// Storage interface — provided by caller (e.g. Supabase-backed implementation
// inside apps/web). Keep minimal — we only need save here.
// ---------------------------------------------------------------------------

export interface SnapshotStore {
  /**
   * Persist a snapshot. Implementations should be idempotent on `id`
   * (e.g. UPSERT) — the cron may retry on transient failures.
   */
  saveSnapshot(snapshot: MarketSnapshot): Promise<void>;
}

/** No-op store. Useful for dry-runs and tests. */
export const NULL_STORE: SnapshotStore = {
  async saveSnapshot() {
    // intentional no-op
  },
};

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export interface RunSnapshotOptions {
  /** How many tickers to take from the top. Default 10. */
  limit?: number;
  /** Override Polygon.io knobs (api key, fetch impl, ...). */
  polygon?: FetchTopVolumeOptions;
  /** Override Pyth Hermes knobs (hermes url, fetch impl). */
  pyth?: FetchPythOptions;
  /** Inject capturedAt (used by tests for deterministic IDs). */
  now?: Date;
}

/**
 * Build today's market snapshot and persist via the supplied store.
 *
 * Returns the snapshot regardless of store success — caller can decide
 * whether to retry / alert on save failures.
 */
export async function runDailySnapshot(
  market: MarketCode,
  store: SnapshotStore = NULL_STORE,
  options: RunSnapshotOptions = {}
): Promise<MarketSnapshot> {
  const limit = options.limit ?? 10;
  const now = options.now ?? new Date();

  // 1. Top-N tickers by intraday volume (currently Polygon → NASDAQ only;
  //    KRX/TSE will throw and need a different provider).
  const entries = await fetchTopVolume(market, limit, options.polygon);
  if (entries.length === 0) {
    throw new Error(`Polygon returned 0 tickers for ${market} — abort snapshot`);
  }

  // 2. Enrich with Pyth oracle prices where available. Unknown tickers
  //    keep the Polygon last-trade price.
  const tickers = entries.map((e) => e.ticker);
  const pythPrices = await fetchPythPricesSafely(tickers, market, options.pyth);

  const enriched: SnapshotEntry[] = entries.map((e) => {
    const pyth = pythPrices[e.ticker];
    return pyth ? { ...e, price: pyth.price } : e;
  });

  const snapshot: MarketSnapshot = {
    id: buildSnapshotId(market, now),
    market,
    capturedAt: now.toISOString(),
    entries: enriched,
  };

  await store.saveSnapshot(snapshot);
  return snapshot;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Pyth Hermes can be flaky / a ticker may not be in our feed table.
 * Don't let it tank the whole snapshot — log and fall back to Polygon prices.
 */
async function fetchPythPricesSafely(
  tickers: string[],
  market: MarketCode,
  options?: FetchPythOptions
): Promise<Record<string, PythPrice>> {
  try {
    const { prices } = await fetchPythPricesByTicker(tickers, market, options);
    return prices;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[snapshot] Pyth enrichment failed — falling back:', err);
    return {};
  }
}

function buildSnapshotId(market: MarketCode, capturedAt: Date): string {
  // YYYY-MM-DD in UTC; one snapshot per market per day.
  const iso = capturedAt.toISOString().slice(0, 10);
  return `${market}-${iso}`;
}
