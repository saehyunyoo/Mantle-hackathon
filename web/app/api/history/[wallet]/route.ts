import { NextResponse } from "next/server";
import { HistoryResponse, type HistoryResponseT } from "@/lib/types/api";

/**
 * GET /api/history/[wallet]
 *
 * Mock: returns 3 sample holdings (1 settled, 2 active).
 * Real impl (W3): read balances from chain + cross with Supabase status.
 */
export async function GET(
  _req: Request,
  { params }: { params: { wallet: string } }
): Promise<NextResponse> {
  const payload: HistoryResponseT = {
    wallet: params.wallet,
    holdings: [
      {
        tokenAddress: "0x1111111111111111111111111111111111111111",
        symbol: "mNVDA-20260518",
        underlying: "NVDA",
        balance: "120000000000000000000",
        pnlUsd: 42.18,
        status: "active",
      },
      {
        tokenAddress: "0x2222222222222222222222222222222222222222",
        symbol: "mTSLA-20260518",
        underlying: "TSLA",
        balance: "45000000000000000000",
        pnlUsd: -8.4,
        status: "active",
      },
      {
        tokenAddress: "0xdead000000000000000000000000000000000001",
        symbol: "mSOFI-20260517",
        underlying: "SOFI",
        balance: "0",
        pnlUsd: 3.12,
        status: "settled",
        settledAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
    totalPnlUsd: 36.9,
  };

  return NextResponse.json(HistoryResponse.parse(payload));
}
