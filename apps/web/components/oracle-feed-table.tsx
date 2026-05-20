"use client";

import { useMemo } from "react";
import type { OraclePriceFeed } from "@jion/types";
import { formatPrice, marketCurrency } from "@/lib/format";
import { useLivePrices } from "@/lib/use-live-prices";

interface OracleFeedTableProps {
  feeds: OraclePriceFeed[];
}

export function OracleFeedTable({ feeds }: OracleFeedTableProps) {
  const basePrices = useMemo(() => feeds.map((f) => f.price), [feeds]);
  const { prices: livePrices, updatedAt } = useLivePrices(basePrices, 2000);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            <span className="h-1 w-1 animate-pulse rounded-full bg-violet-400" />
            Pyth Network · Hermes
          </span>
          <span>Polling every 2s</span>
        </span>
        <span className="font-mono text-[10px] text-zinc-600">
          last tick {new Date(updatedAt).toLocaleTimeString("en-US")}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Ticker</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Feed ID</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">24h Change</th>
              <th className="px-4 py-3 text-right font-medium">Live Δ</th>
              <th className="px-4 py-3 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-zinc-950">
            {feeds.map((feed, idx) => {
              const currency = marketCurrency(feed.market);
              const livePrice = livePrices[idx] ?? feed.price;
              const liveDelta = ((livePrice - feed.price) / feed.price) * 100;
              const dayDelta = ((feed.price - feed.prevPrice) / feed.prevPrice) * 100;
              const liveColor =
                liveDelta > 0
                  ? "text-emerald-400"
                  : liveDelta < 0
                    ? "text-rose-400"
                    : "text-zinc-500";
              const dayColor =
                dayDelta > 0
                  ? "text-emerald-400"
                  : dayDelta < 0
                    ? "text-rose-400"
                    : "text-zinc-500";

              return (
                <tr
                  key={feed.tokenSymbol}
                  className="transition hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3 font-mono text-zinc-100">
                    {feed.tokenSymbol}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{feed.ticker}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                      {feed.source.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {feed.feedId}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-100">
                    {formatPrice(livePrice, currency)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular-nums ${dayColor}`}
                  >
                    {dayDelta >= 0 ? "+" : ""}
                    {dayDelta.toFixed(2)}%
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular-nums ${liveColor}`}
                  >
                    {liveDelta >= 0 ? "+" : ""}
                    {liveDelta.toFixed(3)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                    {new Date(feed.updatedAt).toLocaleTimeString("en-US")}
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
