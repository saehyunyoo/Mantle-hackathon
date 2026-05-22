import type {
  MarketCode,
  Pool,
  SnapshotEntry,
  TokenDistribution,
} from "@jion/types";
import { MOCK_POOLS_TODAY, MOCK_SNAPSHOTS_TODAY } from "@jion/mocks";
import { explainDistribution } from "./claude";
import { scoreProtocolsFor, selectListings } from "./scoring";

interface RouteOptions {
  entry: SnapshotEntry;
  market: MarketCode;
  issuedAt: string;
  /** Reference pool data for scoring (optional). */
  pools?: Pool[];
}

/**
 * Run the full distribution routing pipeline for a single token:
 *   1. score 5 candidate protocols (heuristic)
 *   2. select top-N venues (cutoff + cap)
 *   3. generate a natural-language reasoning (Claude if available, else heuristic)
 */
export async function routeDistribution({
  entry,
  market,
  issuedAt,
  pools,
}: RouteOptions): Promise<TokenDistribution> {
  const tokenSymbol = buildSymbol(entry.ticker, issuedAt);
  const tokenAddress = synthesizeTokenAddress(entry);

  const scores = scoreProtocolsFor(entry, pools ?? MOCK_POOLS_TODAY);
  const listings = selectListings(scores, entry, tokenSymbol);
  const routingReasoning = await explainDistribution({
    entry,
    marketCode: market,
    listings,
  });

  return {
    tokenSymbol,
    tokenAddress,
    listings,
    routingReasoning,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Resolve a token symbol back to its source SnapshotEntry + market.
 * Used by the API route to handle requests like /api/distribution/mNVDA-20260520.
 */
export function findEntryBySymbol(symbol: string): {
  entry: SnapshotEntry;
  market: MarketCode;
  issuedAt: string;
} | null {
  // Symbol format: mTICKER-YYYYMMDD
  const match = symbol.match(/^m(.+)-(\d{8})$/);
  if (!match) return null;
  const [, ticker, dateDigits] = match;
  if (!ticker || !dateDigits) return null;

  for (const snapshot of MOCK_SNAPSHOTS_TODAY) {
    const snapshotDate = snapshot.capturedAt.slice(0, 10).replaceAll("-", "");
    if (snapshotDate !== dateDigits) continue;
    const entry = snapshot.entries.find((e) => e.ticker === ticker);
    if (entry) {
      return { entry, market: snapshot.market, issuedAt: snapshot.capturedAt };
    }
  }
  return null;
}

function buildSymbol(ticker: string, issuedAt: string): string {
  return `m${ticker}-${issuedAt.slice(0, 10).replaceAll("-", "")}`;
}

function synthesizeTokenAddress(entry: SnapshotEntry): string {
  // Stable mock address per ticker — matches packages/mocks naming convention.
  const seed = (entry.rank * 31 + entry.ticker.length).toString(16);
  return `0xa1aA0000000000000000000000000000000000${seed.slice(0, 2).padStart(2, "0")}`;
}
