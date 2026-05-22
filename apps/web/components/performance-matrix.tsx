import Link from "next/link";
import type { DeFiProtocol } from "@jion/types";
import { PROTOCOL_LABEL } from "@jion/mocks";
import type { TokenStats } from "@/lib/aggregate";
import { formatUsd } from "@/lib/format";

const ALL_PROTOCOLS: DeFiProtocol[] = [
  "merchant-moe",
  "fluxion",
  "agni",
  "lendle",
  "init-capital",
];

interface PerformanceMatrixProps {
  tokenStats: TokenStats[];
}

export function PerformanceMatrix({ tokenStats }: PerformanceMatrixProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="sticky left-0 z-10 bg-zinc-900/60 px-4 py-3 font-medium">
                Token
              </th>
              {ALL_PROTOCOLS.map((p) => (
                <th key={p} className="px-4 py-3 text-right font-medium">
                  {PROTOCOL_LABEL[p] ?? p}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-zinc-300">
                Token total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-zinc-950">
            {tokenStats.map((t) => {
              const byProtocol = new Map(
                t.listings.map((l) => [l.protocol, l]),
              );
              return (
                <tr
                  key={t.tokenSymbol}
                  className="transition hover:bg-zinc-900/50"
                >
                  <td className="sticky left-0 z-10 bg-zinc-950 px-4 py-3">
                    <Link
                      href={`/route/${encodeURIComponent(t.tokenSymbol)}`}
                      className="block transition hover:text-violet-300"
                      title={`Token: ${t.tokenSymbol}`}
                    >
                      <div className="text-sm font-medium text-zinc-100">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {t.ticker} · {t.market}
                      </div>
                    </Link>
                  </td>
                  {ALL_PROTOCOLS.map((p) => {
                    const listing = byProtocol.get(p);
                    if (!listing) {
                      return (
                        <td key={p} className="px-4 py-3 text-right">
                          <span className="text-zinc-700">—</span>
                        </td>
                      );
                    }
                    return (
                      <td key={p} className="px-4 py-3 text-right">
                        <div className="font-mono text-xs tabular-nums text-zinc-100">
                          {formatUsd(listing.tvlUsd)}
                        </div>
                        {listing.volume24hUsd > 0 && (
                          <div className="font-mono text-[10px] text-zinc-500">
                            {formatUsd(listing.volume24hUsd)} vol
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums text-zinc-100">
                      {formatUsd(t.totalTvlUsd)}
                    </div>
                    {t.totalVolume24hUsd > 0 && (
                      <div className="font-mono text-[10px] text-zinc-500">
                        {formatUsd(t.totalVolume24hUsd)} vol
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
