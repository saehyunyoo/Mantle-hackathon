import { NextResponse } from "next/server";
import { runDailySnapshot } from "@/lib/jobs/snapshot";

/**
 * POST /api/cron/snapshot
 *
 * Triggered by Vercel Cron (or external cron service) once per market per day.
 * Protected by CRON_SECRET header.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const market = (url.searchParams.get("market") ?? "NASDAQ") as
    | "NASDAQ"
    | "KRX"
    | "TSE";

  try {
    await runDailySnapshot({ market });
    return NextResponse.json({ ok: true, market });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "snapshot failed" },
      { status: 500 }
    );
  }
}
