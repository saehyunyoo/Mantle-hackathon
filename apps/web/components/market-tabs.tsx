"use client";

import { useMemo, useState } from "react";
import type { MarketSnapshot, TokenDistribution } from "@jion/types";
import { TokenCard } from "@/components/token-card";
import { useLivePrices } from "@/lib/use-live-prices";

interface MarketTabsProps {
  snapshots: MarketSnapshot[];
  marketNames: Record<string, string>;
  distributions: TokenDistribution[];
}

const MARKET_FLAG: Record<string, string> = {
  NASDAQ: "🇺🇸",
  KRX: "🇰🇷",
  TSE: "🇯🇵",
};

type SortBy = "volume" | "recent" | "gainers";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "recent", label: "Recent" },
  { value: "gainers", label: "Top gainers" },
];

export function MarketTabs({
  snapshots,
  marketNames,
  distributions,
}: MarketTabsProps) {
  const [activeMarket, setActiveMarket] = useState(snapshots[0]?.market ?? "NASDAQ");
  const [sortBy, setSortBy] = useState<SortBy>("volume");
  const active = snapshots.find((s) => s.market === activeMarket) ?? snapshots[0];

  const basePrices = useMemo(
    () => (active ? active.entries.map((e) => e.price) : []),
    [active],
  );
  const { prices: livePrices, updatedAt } = useLivePrices(basePrices);

  const distributionBySymbol = useMemo(() => {
    const map = new Map<string, TokenDistribution>();
    for (const d of distributions) map.set(d.tokenSymbol, d);
    return map;
  }, [distributions]);

  const sortedView = useMemo(() => {
    if (!active) return [];
    const rows = active.entries.map((entry, idx) => ({
      entry,
      livePrice: livePrices[idx],
      idx,
    }));
    if (sortBy === "volume") {
      return rows.sort((a, b) => b.entry.volume1h - a.entry.volume1h);
    }
    if (sortBy === "gainers") {
      const gain = (r: (typeof rows)[number]) =>
        ((r.livePrice ?? r.entry.price) - r.entry.price) / r.entry.price;
      return rows.sort((a, b) => gain(b) - gain(a));
    }
    // "recent" — newest issuance first. With mTICKER reuse model the snapshot
    // shares one capturedAt, so this falls back on rank order today.
    return rows.sort((a, b) => a.entry.rank - b.entry.rank);
  }, [active, livePrices, sortBy]);

  if (!active) return null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1">
        {snapshots.map((s) => (
          <button
            key={s.market}
            type="button"
            onClick={() => setActiveMarket(s.market)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              s.market === activeMarket
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="mr-1.5">{MARKET_FLAG[s.market] ?? "🌐"}</span>
            {marketNames[s.market] ?? s.market}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            <span className="h-1 w-1 rounded-full bg-violet-400" />
            Pyth Network
          </span>
          <span>
            Snapshot at{" "}
            <span className="font-mono text-zinc-400">
              {new Date(active.capturedAt).toLocaleString("en-US", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </span>
        </span>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortBy(opt.value)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  sortBy === opt.value
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] text-zinc-600">
            live · last tick {new Date(updatedAt).toLocaleTimeString("en-US")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sortedView.map(({ entry, livePrice }) => {
          const symbol = `m${entry.ticker}`;
          return (
            <TokenCard
              key={`${active.market}-${entry.ticker}`}
              entry={entry}
              livePrice={livePrice}
              market={active.market}
              issuedAt={active.capturedAt}
              distribution={distributionBySymbol.get(symbol)}
            />
          );
        })}
      </div>
    </div>
  );
}
