import { NextResponse } from "next/server";
import {
  RouteQuoteRequest,
  RouteQuoteResponse,
  type RouteQuoteResponseT,
} from "@/lib/types/api";

/**
 * POST /api/route-quote
 *
 * Mock: returns a deterministic single-hop quote on Merchant Moe.
 * Real impl (W3): graph search + Claude reasoning (see lib/ai/routing.ts).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json();
  const parsed = RouteQuoteRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tokenIn, tokenOut, amountIn } = parsed.data;

  // Mock: assume 1:1 with 0.3% fee + 0.1% slippage.
  const inBig = BigInt(amountIn);
  const expectedOutBig = (inBig * 996n) / 1000n;

  const payload: RouteQuoteResponseT = {
    path: [tokenIn, tokenOut],
    venues: ["MerchantMoe"],
    expectedOut: expectedOutBig.toString(),
    slippage: 0.1,
    estimatedGasUsd: 0.12,
    reason:
      "Merchant Moe 직스왑이 Agni 경유보다 슬리피지 0.3% 낮음. 가스도 30% 절약.",
  };

  return NextResponse.json(RouteQuoteResponse.parse(payload));
}
