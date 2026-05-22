/**
 * AI Distribution Router — heuristic scoring + seed-amount planning.
 *
 * What this file decides, given a fresh top-10 ticker + its issued supply:
 *   1. **Which venues** to list on (1-3 of the 5 candidates).
 *   2. **How much of the minted supply** to seed into pools right now (rest
 *      stays in the protocol vault for later — see TOKEN_STANDARD.md §2.3).
 *   3. **How to split** that seed across the selected venues (weights in bps).
 *   4. **How much USDC** to pair with each slice (always = tokens × oracle).
 *
 * Stakeholder optimization (per Youngin's planning decisions):
 *   - HOLDERS need depth → top-rank tokens get more venues + larger seed %.
 *   - PROTOCOL minimizes capital → only seed enough for credible listing;
 *     ongoing MM is the venue's / external LPs' job (we don't reserve for
 *     rebalancing — DEX MMs handle that). See PLAN.md §4.2.
 *   - VENUES (adapters) get traffic matched to their kind: AMM for liquid
 *     trading, collateral/lending for top-rank stable profiles.
 *   - DEMO narrative: each decision must produce a human-readable reason,
 *     because "Explainable AI Distribution" is the pitch (PLAN §5.2.1).
 */
import type {
  DeFiListing,
  DeFiProtocol,
  ListingKind,
  Pool,
  SnapshotEntry,
} from "@jion/types";

// ---------------------------------------------------------------------------
// Candidate protocol profiles
// ---------------------------------------------------------------------------

interface ProtocolProfile {
  protocol: DeFiProtocol;
  kind: ListingKind;
  preferredVolumeRank: "any" | "top" | "mid" | "low";
  volatilityFit: "low" | "mid" | "high" | "any";
  baseUrl: (symbol: string) => string;
}

const PROTOCOL_PROFILES: ProtocolProfile[] = [
  {
    protocol: "merchant-moe",
    kind: "amm-pool",
    preferredVolumeRank: "top",
    volatilityFit: "low",
    baseUrl: (s) => `https://merchantmoe.com/pools/${s}`,
  },
  {
    protocol: "fluxion",
    kind: "amm-pool",
    preferredVolumeRank: "any",
    volatilityFit: "high",
    baseUrl: (s) => `https://fluxion.so/pools/${s}`,
  },
  {
    protocol: "agni",
    kind: "amm-pool",
    preferredVolumeRank: "mid",
    volatilityFit: "any",
    baseUrl: (s) => `https://agni.finance/pools/${s}`,
  },
  {
    protocol: "lendle",
    kind: "collateral",
    preferredVolumeRank: "top",
    volatilityFit: "mid",
    baseUrl: (s) => `https://lendle.xyz/markets/${s}`,
  },
  {
    protocol: "init-capital",
    kind: "lending-market",
    preferredVolumeRank: "mid",
    volatilityFit: "low",
    baseUrl: (s) => `https://init.capital/markets/${s}`,
  },
];

// ---------------------------------------------------------------------------
// 1. Scoring — which venues fit this token?
// ---------------------------------------------------------------------------

export interface ProtocolScore {
  profile: ProtocolProfile;
  score: number; // 0-100
  reasons: string[];
}

/**
 * Heuristic scoring — picks venues for a freshly issued token.
 * Inputs are snapshot data + (optional) historical pool depth signal.
 */
export function scoreProtocolsFor(
  entry: SnapshotEntry,
  referencePools: Pool[] = [],
): ProtocolScore[] {
  const volumeRank: "top" | "mid" | "low" =
    entry.rank <= 3 ? "top" : entry.rank <= 6 ? "mid" : "low";

  // Crude volatility proxy: turnover relative to price.
  const turnover = entry.volume1h / Math.max(entry.price, 1);
  const volatility: "low" | "mid" | "high" =
    turnover > 5_000_000 ? "high" : turnover > 1_000_000 ? "mid" : "low";

  const avgPoolDepth =
    referencePools.length > 0
      ? referencePools.reduce((s, p) => s + p.reserveUsdc, 0) /
        referencePools.length
      : 500_000;

  return PROTOCOL_PROFILES.map((profile) => {
    const reasons: string[] = [];
    let score = 50;

    if (profile.preferredVolumeRank === volumeRank) {
      score += 25;
      reasons.push(`Volume rank fit (${volumeRank})`);
    } else if (profile.preferredVolumeRank === "any") {
      score += 10;
    } else {
      score -= 10;
    }

    if (profile.volatilityFit === volatility) {
      score += 20;
      reasons.push(`Volatility fit (${volatility})`);
    } else if (profile.volatilityFit === "any") {
      score += 8;
    } else {
      score -= 8;
    }

    if (profile.kind === "amm-pool" && avgPoolDepth > 750_000) {
      score += 5;
      reasons.push("Deep reference liquidity available");
    }

    if (profile.kind === "collateral" && volumeRank === "top") {
      score += 5;
      reasons.push("Top-rank asset suitable as collateral");
    }

    return { profile, score: Math.max(0, Math.min(100, score)), reasons };
  }).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// 2. Listing plan — how many venues + what % of supply gets seeded
// ---------------------------------------------------------------------------

export interface ListingPlan {
  /** Number of venues to fan out to (1-3). */
  venueCount: number;
  /** Fraction of minted supply (in bps) we put into pools right now. */
  seedPctBps: number;
  /** Narrative for the route page (why these numbers). */
  rationale: string;
}

/**
 * Decide how broadly to list AND how deep to seed, based on volume rank.
 *
 * Higher rank → more venues + larger seed (deeper float across surfaces).
 * Lower rank  → fewer venues + smaller seed (capital efficiency over depth).
 *
 * The remaining supply stays in the protocol vault. We do NOT pre-allocate
 * for rebalancing — ongoing MM is the venue's responsibility once listed.
 */
export function computeListingPlan(entry: SnapshotEntry): ListingPlan {
  if (entry.rank === 1) {
    return {
      venueCount: 3,
      seedPctBps: 1200, // 12%
      rationale:
        "Rank-#1 whale — fan out to 3 venues with 12% of supply for deep cross-venue float; rest reserved in vault for emergency rebalance.",
    };
  }
  if (entry.rank <= 3) {
    return {
      venueCount: 2,
      seedPctBps: 1000, // 10%
      rationale:
        "Rank #2-3 head ticker — 2 venues with 10% supply each for redundancy + arb headroom.",
    };
  }
  if (entry.rank <= 6) {
    return {
      venueCount: 2,
      seedPctBps: 800, // 8%
      rationale:
        "Mid-tier rank — 2 venues at 8% seed to anchor liquidity without over-committing capital.",
    };
  }
  return {
    venueCount: 1,
    seedPctBps: 600, // 6%
    rationale:
      "Long-tail rank — single venue at 6% seed; capital efficiency over breadth, can re-route from vault if volume picks up.",
  };
}

// ---------------------------------------------------------------------------
// 3. Allocation — split the seeded tokens across the selected venues
// ---------------------------------------------------------------------------

interface SelectionInput {
  entry: SnapshotEntry;
  tokenSymbol: string;
  scores: ProtocolScore[];
  plan: ListingPlan;
  /** Minted supply in WHOLE UNITS (e.g. 1_000_000n for rank #4-10). */
  initialSupplyUnits: bigint;
  /** Pyth oracle price at issue time. Determines USDC pairing. */
  oraclePriceUsd: number;
}

/**
 * Convert scored protocols + a listing plan into concrete DeFiListing[].
 *
 *   - Take the top `plan.venueCount` venues from `scores`.
 *   - Total seed (tokens) = initialSupplyUnits × plan.seedPctBps / 10000.
 *   - Split that across the venues by their relative score (weighted).
 *   - USDC seed per venue = tokens × oraclePriceUsd (always matches oracle to
 *     prevent immediate arb at listing time — see PLAN §4.1).
 *
 * For demo readability, token amounts are rounded to the nearest 100.
 */
export function selectListings({
  entry,
  tokenSymbol,
  scores,
  plan,
  initialSupplyUnits,
  oraclePriceUsd,
}: SelectionInput): DeFiListing[] {
  // Pick top-N by score (fallback to best one if everything's mediocre).
  const picked = scores.slice(0, plan.venueCount);
  const finalSet = picked.length > 0 ? picked : [scores[0]!];

  // Total tokens earmarked for pools.
  const totalSeedUnits =
    (initialSupplyUnits * BigInt(plan.seedPctBps)) / BigInt(10_000);
  const totalSeedNum = Number(totalSeedUnits); // safe: < 2^53 for our supplies

  // Weight by score (so top venue gets the biggest slice).
  const scoreSum = finalSet.reduce((acc, s) => acc + Math.max(s.score, 1), 0);
  const venueAllocations = finalSet.map((s) => {
    const rawShare = Math.max(s.score, 1) / scoreSum;
    return {
      score: s,
      weightBps: Math.round(rawShare * plan.seedPctBps), // bps of TOTAL minted
    };
  });

  // Round token amounts to nearest 100 for UI cleanliness; track running total
  // so final venue absorbs rounding drift.
  let allocated = 0;
  return venueAllocations.map(({ score, weightBps }, idx) => {
    const isLast = idx === venueAllocations.length - 1;
    let seededTokens: number;
    if (isLast) {
      seededTokens = totalSeedNum - allocated;
    } else {
      const raw = (totalSeedNum * weightBps) / plan.seedPctBps;
      seededTokens = Math.round(raw / 100) * 100;
      allocated += seededTokens;
    }
    const seededUsdc = Math.round(seededTokens * oraclePriceUsd);

    // Stable listing address mock — derived from rank + protocol.
    const seed = (entry.rank * 17 + score.profile.protocol.length).toString(16);
    const listingAddress = `0xb2bB000000000000000000000000000000000${seed.slice(0, 3).padStart(3, "0")}`;

    // Per-venue reasoning combines venue fit + sizing rationale.
    const sizingNote = isLast
      ? `${(weightBps / 100).toFixed(1)}% of mint — anchor venue.`
      : `${(weightBps / 100).toFixed(1)}% of mint — top-score venue.`;
    const fitNote = score.reasons.join(" · ") || "Suitable fit.";

    return {
      protocol: score.profile.protocol,
      kind: score.profile.kind,
      listingAddress,
      tvlUsd: seededUsdc * 2, // initial TVL ≈ token side + usdc side
      volume24hUsd:
        score.profile.kind === "amm-pool"
          ? Math.round(entry.volume1h * 0.0003)
          : 0,
      url: score.profile.baseUrl(tokenSymbol),
      reasoning: `${fitNote} ${sizingNote}`,
      seededTokenUnits: String(seededTokens),
      seededUsdcUnits: seededUsdc,
      weightBps,
    } satisfies DeFiListing;
  });
}
