/**
 * Top-of-home strip showing which markets have live Pyth oracle prices
 * vs which fell back to mock for this render.
 *
 * Data sourced from `lib/snapshot-live.ts::getLiveSnapshots()` which runs
 * server-side with a 60s revalidate window.
 */
import type { MarketCode } from "@jion/types";
import type { PythStatus } from "@/lib/snapshot-live";

interface LiveStatusBarProps {
  pythStatus: PythStatus;
  pythUpdatedAt: string | null;
  coverage: Record<MarketCode, { live: number; total: number }>;
}

const MARKET_LABEL: Record<MarketCode, string> = {
  NASDAQ: "NASDAQ",
  KRX: "KRX",
  TSE: "TSE",
  HKEX: "HKEX",
  LSE: "LSE",
};

export function LiveStatusBar({
  pythStatus,
  pythUpdatedAt,
  coverage,
}: LiveStatusBarProps) {
  const totalLive = Object.values(coverage).reduce(
    (acc, c) => acc + c.live,
    0,
  );
  const totalAll = Object.values(coverage).reduce(
    (acc, c) => acc + c.total,
    0,
  );
  const isOk = pythStatus === "live" && totalLive > 0;

  const updatedLabel = pythUpdatedAt
    ? new Date(pythUpdatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div
      className={`mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-2.5 text-xs ${
        isOk
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : "border-amber-500/30 bg-amber-500/[0.04]"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isOk ? "animate-pulse bg-emerald-400" : "bg-amber-400"
          }`}
        />
        <span
          className={`font-semibold ${
            isOk ? "text-emerald-300" : "text-amber-300"
          }`}
        >
          {isOk ? "Pyth · live" : "Pyth · unavailable"}
        </span>
      </span>

      <span className="text-zinc-400">
        <span className="font-mono text-zinc-200">{totalLive}/{totalAll}</span>{" "}
        tickers on oracle
      </span>

      <span className="hidden items-center gap-2 text-zinc-500 sm:flex">
        {(Object.keys(coverage) as MarketCode[])
          .filter((m) => coverage[m].total > 0)
          .map((m) => (
            <span key={m} className="font-mono text-[10px]">
              <span className="text-zinc-400">{MARKET_LABEL[m]}</span>{" "}
              <span
                className={
                  coverage[m].live > 0 ? "text-emerald-400" : "text-zinc-600"
                }
              >
                {coverage[m].live}/{coverage[m].total}
              </span>
            </span>
          ))}
      </span>

      <span className="ml-auto font-mono text-[10px] text-zinc-500">
        last update {updatedLabel}
      </span>
    </div>
  );
}
