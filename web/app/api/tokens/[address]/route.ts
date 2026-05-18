import { NextResponse } from "next/server";
import { TokenDetail, type TokenDetailT } from "@/lib/types/api";

/**
 * GET /api/tokens/[address]
 *
 * Mock: returns a fixed token detail regardless of address.
 * Real impl (W2): read from Supabase + on-chain.
 */
export async function GET(
  _req: Request,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const payload: TokenDetailT = {
    address: params.address as `0x${string}`,
    symbol: `mNVDA-${today}`,
    underlying: "NVDA",
    market: "NASDAQ",
    price: 1247.2,
    priceChange24h: 2.1,
    volume24hUsd: 1_240_000,
    poolAddress: "0xaaa1111111111111111111111111111111111111",
    settlesAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
    agentReason:
      "AI capex 슈퍼사이클 가속. 옵션 IV 92퍼센타일, TSMC 2nm 캐파 발표.",
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    totalSupply: "10000000000000000000000",
    cumulativeVolumeUsd: 84_000,
    thresholdUsd: 10_000,
    status: "active",
  };

  return NextResponse.json(TokenDetail.parse(payload));
}
