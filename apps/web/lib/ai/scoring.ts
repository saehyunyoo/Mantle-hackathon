import type {
  DeFiListing,
  DeFiProtocol,
  ListingKind,
  Pool,
  SnapshotEntry,
} from "@jion/types";

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

export interface ProtocolScore {
  profile: ProtocolProfile;
  score: number;
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

  // Crude volatility proxy: rely on volume turnover relative to price.
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

/**
 * Convert ranked scores into actual DeFiListing[] (top-N selection).
 * Threshold: select scores >= cutoff (default 65), max 3 venues.
 */
export function selectListings(
  scores: ProtocolScore[],
  entry: SnapshotEntry,
  tokenSymbol: string,
  cutoff = 65,
  maxVenues = 3,
): DeFiListing[] {
  const selected = scores
    .filter((s) => s.score >= cutoff)
    .slice(0, maxVenues);

  // At least 1 venue, even if everything below cutoff: take the best.
  const finalSet = selected.length > 0 ? selected : [scores[0]!];

  return finalSet.map((s) => {
    // Stable but synthetic mock listing address derived from token rank + protocol.
    const seed = (entry.rank * 17 + s.profile.protocol.length).toString(16);
    const listingAddress = `0xb2bB000000000000000000000000000000000${seed.slice(0, 3).padStart(3, "0")}`;
    return {
      protocol: s.profile.protocol,
      kind: s.profile.kind,
      listingAddress,
      tvlUsd: Math.round(entry.volume1h * 0.0008),
      volume24hUsd:
        s.profile.kind === "amm-pool" ? Math.round(entry.volume1h * 0.0003) : 0,
      url: s.profile.baseUrl(tokenSymbol),
      reasoning: s.reasons.join(" · ") || "Suitable fit for token profile.",
    };
  });
}
