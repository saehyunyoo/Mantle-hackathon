import { NextResponse } from "next/server";
import {
  LPRecommendRequest,
  LPRecommendResponse,
  type LPRecommendResponseT,
} from "@/lib/types/api";

/**
 * POST /api/lp-recommend
 *
 * Mock: returns a fixed 3-token allocation.
 * Real impl (W3): expected-APR model + Claude reasoning (see lib/ai/lp.ts).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json();
  const parsed = LPRecommendRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { amountUsd } = parsed.data;

  const payload: LPRecommendResponseT = {
    allocations: [
      {
        tokenAddress: "0x1111111111111111111111111111111111111111",
        symbol: "mNVDA",
        weight: 0.6,
        expectedApr: 38.4,
        poolAddress: "0xaaa1111111111111111111111111111111111111",
        venue: "MerchantMoe",
      },
      {
        tokenAddress: "0x2222222222222222222222222222222222222222",
        symbol: "mTSLA",
        weight: 0.3,
        expectedApr: 24.1,
        poolAddress: "0xaaa2222222222222222222222222222222222222",
        venue: "Agni",
      },
      {
        tokenAddress: "0x4444444444444444444444444444444444444444",
        symbol: "mAAPL",
        weight: 0.1,
        expectedApr: 12.8,
        poolAddress: "0xaaa4444444444444444444444444444444444444",
        venue: "Fluxion",
      },
    ],
    expectedDailyYieldUsd: (amountUsd * 0.32) / 365,
    reason:
      "거래량 + 24h 풀 깊이 + 변동성 결합 점수. mNVDA에 비중을 둔 이유: IV 92퍼센타일 + 깊은 유동성.",
  };

  return NextResponse.json(LPRecommendResponse.parse(payload));
}
