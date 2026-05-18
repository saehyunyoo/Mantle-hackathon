import { NextResponse } from "next/server";
import { runDailySettlement } from "@/lib/jobs/settle";

/**
 * POST /api/cron/settle
 *
 * Triggered by cron after each new daily snapshot.
 * Force-settles tokens whose 24h volume < $10K.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await runDailySettlement();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "settle failed" },
      { status: 500 }
    );
  }
}
