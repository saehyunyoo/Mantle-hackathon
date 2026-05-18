/**
 * Shared API contracts (Zod schemas).
 *
 * Both 영인 (FE) and 세현 (API) import from here.
 * Changes to this file require a PR review from the other person.
 */
import { z } from "zod";

// ============================================================
// Common
// ============================================================

export const MarketEnum = z.enum(["NASDAQ", "KRX", "TSE"]);
export type Market = z.infer<typeof MarketEnum>;

export const VenueEnum = z.enum(["MerchantMoe", "Agni", "Fluxion"]);
export type Venue = z.infer<typeof VenueEnum>;

export const TokenAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid 0x address");

// ============================================================
// GET /api/today
// ============================================================

export const TodayToken = z.object({
  address: TokenAddress,
  symbol: z.string(), // e.g. "mNVDA-20260518"
  underlying: z.string(), // e.g. "NVDA"
  market: MarketEnum,
  price: z.number(), // oracle USD price
  priceChange24h: z.number(), // %
  volume24hUsd: z.number(),
  poolAddress: z.string().optional(),
  settlesAt: z.string(), // ISO datetime
  agentReason: z.string(),
});
export type TodayTokenT = z.infer<typeof TodayToken>;

export const TodayResponse = z.object({
  date: z.string(), // YYYY-MM-DD
  market: MarketEnum,
  tokens: z.array(TodayToken),
});
export type TodayResponseT = z.infer<typeof TodayResponse>;

// ============================================================
// GET /api/tokens/[address]
// ============================================================

export const TokenDetail = TodayToken.extend({
  createdAt: z.string(),
  totalSupply: z.string(),
  cumulativeVolumeUsd: z.number(),
  thresholdUsd: z.number(),
  status: z.enum(["active", "settled"]),
});
export type TokenDetailT = z.infer<typeof TokenDetail>;

// ============================================================
// POST /api/route-quote
// ============================================================

export const RouteQuoteRequest = z.object({
  tokenIn: TokenAddress,
  tokenOut: TokenAddress,
  amountIn: z.string(), // wei
});
export type RouteQuoteRequestT = z.infer<typeof RouteQuoteRequest>;

export const RouteQuoteResponse = z.object({
  path: z.array(TokenAddress),
  venues: z.array(VenueEnum),
  expectedOut: z.string(), // wei
  slippage: z.number(),
  estimatedGasUsd: z.number(),
  reason: z.string(),
});
export type RouteQuoteResponseT = z.infer<typeof RouteQuoteResponse>;

// ============================================================
// POST /api/lp-recommend
// ============================================================

export const LPRecommendRequest = z.object({
  amountUsd: z.number().positive(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
});
export type LPRecommendRequestT = z.infer<typeof LPRecommendRequest>;

export const LPAllocation = z.object({
  tokenAddress: TokenAddress,
  symbol: z.string(),
  weight: z.number().min(0).max(1),
  expectedApr: z.number(),
  poolAddress: z.string(),
  venue: VenueEnum,
});
export type LPAllocationT = z.infer<typeof LPAllocation>;

export const LPRecommendResponse = z.object({
  allocations: z.array(LPAllocation),
  expectedDailyYieldUsd: z.number(),
  reason: z.string(),
});
export type LPRecommendResponseT = z.infer<typeof LPRecommendResponse>;

// ============================================================
// GET /api/history/[wallet]
// ============================================================

export const HoldingItem = z.object({
  tokenAddress: TokenAddress,
  symbol: z.string(),
  underlying: z.string(),
  balance: z.string(),
  pnlUsd: z.number(),
  status: z.enum(["active", "settled"]),
  settledAt: z.string().optional(),
});

export const HistoryResponse = z.object({
  wallet: z.string(),
  holdings: z.array(HoldingItem),
  totalPnlUsd: z.number(),
});
export type HistoryResponseT = z.infer<typeof HistoryResponse>;

// ============================================================
// Error envelope (for all endpoints)
// ============================================================

export const ApiError = z.object({
  error: z.string(),
  code: z.string().optional(),
});
