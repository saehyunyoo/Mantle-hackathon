import type {
  DeFiListing,
  DeFiProtocol,
  MarketCode,
  MarketSnapshot,
  TokenDistribution,
} from "@jion/types";

export interface ProtocolStats {
  protocol: DeFiProtocol;
  listings: number;
  tokens: number;
  totalTvlUsd: number;
  totalVolume24hUsd: number;
  share: number;
}

export interface TokenStats {
  tokenSymbol: string;
  tokenAddress: string;
  ticker: string;
  name: string;
  market: MarketCode;
  listings: DeFiListing[];
  venueCount: number;
  totalTvlUsd: number;
  totalVolume24hUsd: number;
}

export interface OverallStats {
  totalTvlUsd: number;
  totalVolume24hUsd: number;
  activeTokens: number;
  activeVenues: number;
  totalListings: number;
}

export function computeOverall(
  distributions: TokenDistribution[],
): OverallStats {
  let totalTvlUsd = 0;
  let totalVolume24hUsd = 0;
  let totalListings = 0;
  const venues = new Set<DeFiProtocol>();

  for (const d of distributions) {
    for (const l of d.listings) {
      totalTvlUsd += l.tvlUsd;
      totalVolume24hUsd += l.volume24hUsd;
      totalListings += 1;
      venues.add(l.protocol);
    }
  }

  return {
    totalTvlUsd,
    totalVolume24hUsd,
    activeTokens: distributions.length,
    activeVenues: venues.size,
    totalListings,
  };
}

export function computeProtocolStats(
  distributions: TokenDistribution[],
): ProtocolStats[] {
  const map = new Map<
    DeFiProtocol,
    { listings: number; tokens: Set<string>; tvl: number; vol: number }
  >();

  for (const d of distributions) {
    for (const l of d.listings) {
      const bucket = map.get(l.protocol) ?? {
        listings: 0,
        tokens: new Set<string>(),
        tvl: 0,
        vol: 0,
      };
      bucket.listings += 1;
      bucket.tokens.add(d.tokenSymbol);
      bucket.tvl += l.tvlUsd;
      bucket.vol += l.volume24hUsd;
      map.set(l.protocol, bucket);
    }
  }

  const totalTvl = [...map.values()].reduce((s, b) => s + b.tvl, 0);

  return [...map.entries()]
    .map(([protocol, bucket]) => ({
      protocol,
      listings: bucket.listings,
      tokens: bucket.tokens.size,
      totalTvlUsd: bucket.tvl,
      totalVolume24hUsd: bucket.vol,
      share: totalTvl > 0 ? bucket.tvl / totalTvl : 0,
    }))
    .sort((a, b) => b.totalTvlUsd - a.totalTvlUsd);
}

export function computeTokenStats(
  distributions: TokenDistribution[],
  snapshots: MarketSnapshot[],
): TokenStats[] {
  const meta = new Map<string, { name: string; market: MarketCode }>();
  for (const s of snapshots) {
    for (const e of s.entries) {
      meta.set(e.ticker, { name: e.name, market: s.market });
    }
  }

  return distributions
    .map((d) => {
      const tickerMatch = d.tokenSymbol.match(/^m(.+)-\d{8}$/);
      const ticker = tickerMatch?.[1] ?? d.tokenSymbol;
      const found = meta.get(ticker);
      return {
        tokenSymbol: d.tokenSymbol,
        tokenAddress: d.tokenAddress,
        ticker,
        name: found?.name ?? ticker,
        market: found?.market ?? ("NASDAQ" as MarketCode),
        listings: d.listings,
        venueCount: d.listings.length,
        totalTvlUsd: d.listings.reduce((s, l) => s + l.tvlUsd, 0),
        totalVolume24hUsd: d.listings.reduce((s, l) => s + l.volume24hUsd, 0),
      };
    })
    .sort((a, b) => b.totalTvlUsd - a.totalTvlUsd);
}
