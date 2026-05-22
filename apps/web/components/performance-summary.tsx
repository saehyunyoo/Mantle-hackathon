import type { OverallStats } from "@/lib/aggregate";
import { formatUsd } from "@/lib/format";

interface PerformanceSummaryProps {
  stats: OverallStats;
}

export function PerformanceSummary({ stats }: PerformanceSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total TVL" value={formatUsd(stats.totalTvlUsd)} />
      <Stat
        label="24h Volume"
        value={stats.totalVolume24hUsd > 0 ? formatUsd(stats.totalVolume24hUsd) : "—"}
      />
      <Stat
        label="Active tokens"
        value={stats.activeTokens.toString()}
        sub={`${stats.totalListings} listings`}
      />
      <Stat
        label="Live venues"
        value={stats.activeVenues.toString()}
        sub="across Mantle DeFi"
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-100">
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>
      )}
    </div>
  );
}
