/**
 * T4 — daily snapshot cron handler.
 *
 * Triggered by Vercel Cron (or any HTTP cron / GH Actions schedule).
 * One snapshot per market per day.
 *
 * Trigger (Vercel `vercel.json` example):
 *   {
 *     "crons": [
 *       { "path": "/api/cron/snapshot?market=NASDAQ",
 *         "schedule": "30 13 * * 1-5" }   // 09:30 ET = 13:30 UTC, Mon-Fri
 *     ]
 *   }
 *
 * Auth:
 *   Set CRON_SECRET in env; senders must pass it via `x-cron-secret` header
 *   (Vercel can be configured to inject this, or use Vercel's built-in
 *   cron protection via `Authorization: Bearer <token>`).
 *
 * Env required:
 *   POLYGON_IO_API_KEY            (data source)
 *   SUPABASE_URL                  (target store)
 *   SUPABASE_SERVICE_ROLE_KEY     (target store — server only!)
 *   CRON_SECRET                   (optional auth)
 */
import { NextResponse } from 'next/server';
import { runDailySnapshot } from '@jion/integrations';
import type { MarketCode } from '@jion/types';
import { supabaseSnapshotStore } from '@/lib/jobs/snapshot-store';

const VALID_MARKETS: readonly MarketCode[] = ['NASDAQ', 'KRX', 'TSE'] as const;

function isValidMarket(value: string): value is MarketCode {
  return (VALID_MARKETS as readonly string[]).includes(value);
}

async function handle(req: Request): Promise<NextResponse> {
  // ---- Auth (optional but recommended in prod) ----
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const provided =
      req.headers.get('x-cron-secret') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  // ---- Market selection ----
  const url = new URL(req.url);
  const marketParam = url.searchParams.get('market') ?? 'NASDAQ';
  if (!isValidMarket(marketParam)) {
    return NextResponse.json(
      { error: `invalid market: ${marketParam}` },
      { status: 400 }
    );
  }

  // ---- Run ----
  try {
    const snap = await runDailySnapshot(marketParam, supabaseSnapshotStore);
    return NextResponse.json({
      ok: true,
      id: snap.id,
      market: snap.market,
      capturedAt: snap.capturedAt,
      count: snap.entries.length,
      tickers: snap.entries.map((e) => e.ticker),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'snapshot failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel cron triggers via GET; manual triggers + GH Actions usually POST.
export const GET = handle;
export const POST = handle;

// Avoid edge runtime — we use process.env + Supabase node client.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
