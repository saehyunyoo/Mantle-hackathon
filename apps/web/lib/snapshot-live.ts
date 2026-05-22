/**
 * Server-side snapshot enrichment with live Pyth prices.
 *
 * What this does:
 *   1. Start from the canonical mock snapshots (`MOCK_SNAPSHOTS_TODAY`) —
 *      they own the ranking, volumes, and ticker lists.
 *   2. For tickers that have a known Pyth feed id, hit Hermes for live
 *      USD prices and overlay them on the mock `entry.price`.
 *   3. Tickers without a Pyth feed (e.g. AVGO, PLTR, all TSE) keep their
 *      mock prices. The whole snapshot keeps working if Pyth is down.
 *
 * Why we keep mock volumes:
 *   - Polygon.io (the only intraday volume source we have plumbed) requires
 *     a paid key + only covers NASDAQ. For the demo we'd rather show real
 *     oracle prices than fake-real volumes.
 *   - Volumes are used by the AI router for ranking heuristics — keeping
 *     them deterministic also keeps the demo reproducible across recordings.
 *
 * Caching:
 *   - We rely on the page-level `export const revalidate = 60` on the Home
 *     route, so this function is called at most once a minute per render
 *     surface. Pyth Hermes is rate-limited and the prices don't move fast
 *     enough for sub-minute updates to matter at the demo level.
 *
 * Failure mode:
 *   - Hermes unreachable → `pythStatus = 'unavailable'`, prices stay at
 *     mock values. UI shows a "Pyth temporarily unavailable" indicator.
 *   - Partial fetch (some tickers fail) → those tickers stay at mock,
 *     status stays 'live'. Coverage count reflects what actually landed.
 */
import {
  PYTH_FEED_IDS_KR,
  PYTH_FEED_IDS_US,
  fetchPythPricesByTicker,
} from "@jion/integrations";
import { MOCK_SNAPSHOTS_TODAY } from "@jion/mocks";
import type { MarketCode, MarketSnapshot } from "@jion/types";

export type PythStatus = "live" | "unavailable";

export interface LiveSnapshotResult {
  snapshots: MarketSnapshot[];
  /** Tickers whose price comes from a fresh Pyth read. */
  liveTickers: Set<string>;
  /** Per-market coverage counts. */
  coverage: Record<MarketCode, { live: number; total: number }>;
  /** Latest Pyth publish time across all live tickers (ISO string). */
  pythUpdatedAt: string | null;
  /** Whether Hermes was reachable at all. */
  pythStatus: PythStatus;
}

/**
 * Pick the tickers in this snapshot that have a known Pyth feed id. The
 * rest fall back to mock prices.
 */
function knownTickersFor(snapshot: MarketSnapshot): string[] {
  if (snapshot.market === "NASDAQ") {
    return snapshot.entries
      .map((e) => e.ticker)
      .filter((t) => t in PYTH_FEED_IDS_US);
  }
  if (snapshot.market === "KRX") {
    return snapshot.entries
      .map((e) => e.ticker)
      .filter((t) => t in PYTH_FEED_IDS_KR);
  }
  // TSE — no Pyth feed table yet.
  return [];
}

export async function getLiveSnapshots(): Promise<LiveSnapshotResult> {
  const liveTickers = new Set<string>();
  const coverage: Record<MarketCode, { live: number; total: number }> = {
    NASDAQ: { live: 0, total: 0 },
    KRX: { live: 0, total: 0 },
    TSE: { live: 0, total: 0 },
    HKEX: { live: 0, total: 0 },
    LSE: { live: 0, total: 0 },
  };
  let pythStatus: PythStatus = "live";
  let latestPublishTime = 0;

  const enriched = await Promise.all(
    MOCK_SNAPSHOTS_TODAY.map(async (snapshot) => {
      coverage[snapshot.market].total = snapshot.entries.length;
      const knownTickers = knownTickersFor(snapshot);
      if (knownTickers.length === 0) {
        return snapshot;
      }

      try {
        const { prices } = await fetchPythPricesByTicker(
          knownTickers,
          snapshot.market,
        );
        const newEntries = snapshot.entries.map((e) => {
          const live = prices[e.ticker];
          if (!live) return e;
          liveTickers.add(e.ticker);
          coverage[snapshot.market].live += 1;
          if (live.publishTime > latestPublishTime) {
            latestPublishTime = live.publishTime;
          }
          return { ...e, price: live.price };
        });
        return { ...snapshot, entries: newEntries };
      } catch (err) {
        // Pyth may be flaky — fall back to mock prices for this market.
        console.warn(
          `[snapshot-live] Pyth fetch failed for ${snapshot.market}:`,
          err,
        );
        pythStatus = "unavailable";
        return snapshot;
      }
    }),
  );

  return {
    snapshots: enriched,
    liveTickers,
    coverage,
    pythUpdatedAt:
      latestPublishTime > 0
        ? new Date(latestPublishTime * 1000).toISOString()
        : null,
    pythStatus,
  };
}
