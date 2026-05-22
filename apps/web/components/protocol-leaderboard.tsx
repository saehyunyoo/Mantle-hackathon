import { PROTOCOL_LABEL } from "@jion/mocks";
import type { ProtocolStats } from "@/lib/aggregate";
import { formatUsd } from "@/lib/format";

interface ProtocolLeaderboardProps {
  stats: ProtocolStats[];
}

export function ProtocolLeaderboard({ stats }: ProtocolLeaderboardProps) {
  const maxTvl = Math.max(...stats.map((s) => s.totalTvlUsd), 1);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-1 text-sm font-semibold text-zinc-100">
        Venue leaderboard
      </div>
      <div className="mb-4 text-[11px] text-zinc-500">
        Total TVL per Mantle DeFi protocol across all Jion-routed tokens.
      </div>

      <div className="space-y-3">
        {stats.map((s, i) => {
          const widthPct = (s.totalTvlUsd / maxTvl) * 100;
          return (
            <div key={s.protocol} className="flex items-center gap-4">
              <div className="w-6 font-mono text-xs text-zinc-500">
                #{i + 1}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-200">
                    {PROTOCOL_LABEL[s.protocol] ?? s.protocol}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-zinc-400">
                    {formatUsd(s.totalTvlUsd)}
                    <span className="ml-2 text-[10px] text-zinc-600">
                      {(s.share * 100).toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-violet-500/60"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="mt-1 flex items-baseline gap-3 text-[10px] text-zinc-500">
                  <span>{s.tokens} tokens</span>
                  <span>·</span>
                  <span>{s.listings} listings</span>
                  {s.totalVolume24hUsd > 0 && (
                    <>
                      <span>·</span>
                      <span>{formatUsd(s.totalVolume24hUsd)} 24h vol</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
