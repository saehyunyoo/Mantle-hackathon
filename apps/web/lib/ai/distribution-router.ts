/**
 * Live AI distribution router for a single token.
 *
 * Pipeline:
 *   1. score 5 candidate protocols (heuristic — `scoreProtocolsFor`)
 *   2. decide breadth + seed % (rank-based — `computeListingPlan`)
 *   3. allocate seed tokens + USDC across selected venues (`selectListings`)
 *   4. generate a natural-language reasoning (Claude if available, else
 *      heuristic fallback)
 *
 * Supply policy is owned by `@jion/types/supply` (Youngin's rank-tier rule:
 * #1=3M / #2-3=2M / #4-10=1M). LP seed sizing is decided here.
 *
 * MM POLICY: we provide the initial listing + listing price. Ongoing market
 * making is the venue's responsibility — see PLAN.md §4.2 and
 * TOKEN_STANDARD.md §2.4. That's why we don't reserve a rebalancing budget.
 */
import {
  computeInitialSupplyUnits,
  type MarketCode,
  type Pool,
  type SnapshotEntry,
  type TokenDistribution,
} from "@jion/types";
import { MOCK_POOLS_TODAY, MOCK_SNAPSHOTS_TODAY } from "@jion/mocks";
import { explainDistribution } from "./claude";
import {
  computeListingPlan,
  scoreProtocolsFor,
  selectListings,
} from "./scoring";

interface RouteOptions {
  entry: SnapshotEntry;
  market: MarketCode;
  issuedAt: string;
  /** Reference pool data for scoring (optional). */
  pools?: Pool[];
}

/**
 * Run the full distribution routing pipeline for a single token.
 *
 * Output includes seed amounts + per-venue weights, enabling the route page
 * to show *why* this much of the mint went into pools (and the rest stayed
 * in vault as float reserve).
 */
export async function routeDistribution({
  entry,
  market,
  issuedAt: _issuedAt,
  pools,
}: RouteOptions): Promise<TokenDistribution> {
  const tokenSymbol = buildSymbol(entry.ticker);
  const tokenAddress = synthesizeTokenAddress(entry);

  // ---- 1. Supply policy (Youngin's rank-tier rule) ----
  const initialSupplyUnits = computeInitialSupplyUnits(entry.rank);
  const oraclePriceUsd = entry.price; // entry.price is the Pyth-enriched price (see @jion/integrations/snapshot)

  // ---- 2. Venue selection ----
  const scores = scoreProtocolsFor(entry, pools ?? MOCK_POOLS_TODAY);

  // ---- 3. Seed plan + allocation ----
  const plan = computeListingPlan(entry);
  const listings = selectListings({
    entry,
    tokenSymbol,
    scores,
    plan,
    initialSupplyUnits,
    oraclePriceUsd,
  });

  // ---- 4. Aggregate top-level seed totals ----
  const seededTokenUnitsTotal = listings.reduce(
    (acc, l) => acc + Number(l.seededTokenUnits ?? "0"),
    0,
  );
  const seededUsdcUnitsTotal = listings.reduce(
    (acc, l) => acc + (l.seededUsdcUnits ?? 0),
    0,
  );

  // ---- 5. Natural-language summary (Claude > fallback) ----
  const routingReasoning = await explainDistribution({
    entry,
    marketCode: market,
    listings,
    plan,
    initialSupplyUnits: String(initialSupplyUnits),
    seededTokenUnitsTotal: String(seededTokenUnitsTotal),
    seededUsdcUnitsTotal,
    oraclePriceUsd,
  });

  return {
    tokenSymbol,
    tokenAddress,
    listings,
    routingReasoning,
    generatedAt: new Date().toISOString(),

    initialSupplyUnits: String(initialSupplyUnits),
    oraclePriceUsd,
    seededTokenUnitsTotal: String(seededTokenUnitsTotal),
    seededUsdcUnitsTotal,
    seedPctBps: plan.seedPctBps,
  };
}

/**
 * Resolve a token symbol back to its source SnapshotEntry + market.
 * Used by the API route to handle requests like /api/distribution/mNVDA.
 */
export function findEntryBySymbol(symbol: string): {
  entry: SnapshotEntry;
  market: MarketCode;
  issuedAt: string;
} | null {
  // Symbol format: mTICKER (2026-05-21 naming change — no date suffix)
  const match = symbol.match(/^m(.+)$/);
  if (!match) return null;
  const ticker = match[1];
  if (!ticker) return null;

  for (const snapshot of MOCK_SNAPSHOTS_TODAY) {
    const entry = snapshot.entries.find((e) => e.ticker === ticker);
    if (entry) {
      return { entry, market: snapshot.market, issuedAt: snapshot.capturedAt };
    }
  }
  return null;
}

function buildSymbol(ticker: string): string {
  // Naming: mTICKER (single token per ticker — no re-issuance with date)
  return `m${ticker}`;
}

function synthesizeTokenAddress(entry: SnapshotEntry): string {
  // Stable mock address per ticker — matches packages/mocks naming convention.
  const seed = (entry.rank * 31 + entry.ticker.length).toString(16);
  return `0xa1aA0000000000000000000000000000000000${seed.slice(0, 2).padStart(2, "0")}`;
}
