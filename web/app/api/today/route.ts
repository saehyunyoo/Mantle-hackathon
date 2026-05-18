import { NextResponse } from "next/server";
import { TodayResponse, type TodayResponseT } from "@/lib/types/api";

/**
 * GET /api/today
 *
 * Mock implementation. Real impl (W2):
 *   - read latest daily snapshot from Supabase
 *   - join with on-chain token addresses
 *   - return as TodayResponse
 */
export async function GET(): Promise<NextResponse> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const payload: TodayResponseT = {
    date: new Date().toISOString().slice(0, 10),
    market: "NASDAQ",
    tokens: [
      {
        address: "0x1111111111111111111111111111111111111111",
        symbol: `mNVDA-${today}`,
        underlying: "NVDA",
        market: "NASDAQ",
        price: 1247.2,
        priceChange24h: 2.1,
        volume24hUsd: 1_240_000,
        poolAddress: "0xaaa1111111111111111111111111111111111111",
        settlesAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
        agentReason:
          "AI capex 슈퍼사이클 가속. 옵션 IV 92퍼센타일, TSMC 2nm 캐파 발표. 매수세 우위.",
      },
      {
        address: "0x2222222222222222222222222222222222222222",
        symbol: `mTSLA-${today}`,
        underlying: "TSLA",
        market: "NASDAQ",
        price: 245.6,
        priceChange24h: -1.2,
        volume24hUsd: 980_000,
        poolAddress: "0xaaa2222222222222222222222222222222222222",
        settlesAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
        agentReason: "Robotaxi 출시 지연 우려. 거래량은 여전히 Top 3.",
      },
      {
        address: "0x3333333333333333333333333333333333333333",
        symbol: `mMSTR-${today}`,
        underlying: "MSTR",
        market: "NASDAQ",
        price: 345.1,
        priceChange24h: 6.8,
        volume24hUsd: 612_000,
        poolAddress: "0xaaa3333333333333333333333333333333333333",
        settlesAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
        agentReason: "BTC $100K 돌파 → 누적 BTC NAV 프리미엄 확대.",
      },
      {
        address: "0x4444444444444444444444444444444444444444",
        symbol: `mAAPL-${today}`,
        underlying: "AAPL",
        market: "NASDAQ",
        price: 224.3,
        priceChange24h: 0.4,
        volume24hUsd: 1_100_000,
        poolAddress: "0xaaa4444444444444444444444444444444444444",
        settlesAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
        agentReason: "Vision Pro 신모델 루머. 박스권 유지 중.",
      },
      {
        address: "0x5555555555555555555555555555555555555555",
        symbol: `mAMD-${today}`,
        underlying: "AMD",
        market: "NASDAQ",
        price: 158.9,
        priceChange24h: 3.2,
        volume24hUsd: 740_000,
        poolAddress: "0xaaa5555555555555555555555555555555555555",
        settlesAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
        agentReason: "MI400 양산 발표. NVDA 대비 멀티플 디스카운트 해소 시도.",
      },
    ],
  };

  // Validate before sending (catches schema drift early).
  return NextResponse.json(TodayResponse.parse(payload));
}
