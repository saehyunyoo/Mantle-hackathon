/**
 * Distribution types — what the AI router emits after deciding fan-out.
 *
 * Two layers:
 *   - DeFiListing  = "this venue gets X tokens + Y USDC, weight Z bps"
 *   - TokenDistribution = the full per-token decision (one issuance event)
 *
 * Seed-amount fields are OPTIONAL on the wire so older mock fixtures keep
 * working. The live router (apps/web/lib/ai) always populates them.
 *
 * Conventions:
 *   - `seededTokenUnits` is whole units (pre-decimals), e.g. "100000" = 100K
 *     tokens. Use string so JSON can carry BigInt-safe values.
 *   - `seededUsdcUnits` is whole USDC (1 = 1 USDC). UI multiplies by 1e6 when
 *     calling chain.
 *   - `weightBps` ∈ [0, 10000]; the sum across listings is the total seeded
 *     fraction of `initialSupplyUnits`.
 */

export type DeFiProtocol =
  | 'merchant-moe'
  | 'fluxion'
  | 'agni'
  | 'lendle'
  | 'init-capital';

export type ListingKind = 'amm-pool' | 'collateral' | 'lending-market';

export interface DeFiListing {
  protocol: DeFiProtocol;
  kind: ListingKind;
  listingAddress: string;
  tvlUsd: number;
  volume24hUsd: number;
  url: string;
  reasoning?: string;

  // ---- AI router seed decision (Phase 1.5) ----
  /** Whole tokens seeded into this venue at listing time (e.g. "100000"). */
  seededTokenUnits?: string;
  /** Whole USDC seeded into this venue at listing time. */
  seededUsdcUnits?: number;
  /** Share of the listed (not minted) supply on this venue, in bps (0-10000). */
  weightBps?: number;
}

export interface TokenDistribution {
  tokenSymbol: string;
  tokenAddress: string;
  listings: DeFiListing[];
  routingReasoning: string;
  generatedAt: string;

  // ---- AI router seed decision (Phase 1.5) ----
  /** Total minted supply per Youngin's rank-tier policy ("1000000" / "2000000" / "3000000"). */
  initialSupplyUnits?: string;
  /** Pyth oracle price (USD) locked at issue time — used to derive USDC pairing. */
  oraclePriceUsd?: number;
  /** Sum of seededTokenUnits across listings (the float that's actually tradeable). */
  seededTokenUnitsTotal?: string;
  /** Sum of seededUsdcUnits across listings. */
  seededUsdcUnitsTotal?: number;
  /** Fraction of initialSupplyUnits that hit pools, in bps (rest stays in vault reserve). */
  seedPctBps?: number;
}
