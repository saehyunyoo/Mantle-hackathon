"use client";

import { useState } from "react";
import type { MarketSnapshot } from "@jion/types";
import { TokenCard } from "@/components/token-card";

interface MarketTabsProps {
  snapshots: MarketSnapshot[];
  marketNames: Record<string, string>;
}

export function MarketTabs({ snapshots, marketNames }: MarketTabsProps) {
  const [activeMarket, setActiveMarket] = useState(snapshots[0]?.market ?? "NASDAQ");
  const active = snapshots.find((s) => s.market === activeMarket) ?? snapshots[0];

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
            {marketNames[s.market] ?? s.market}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
        <span>
          스냅샷 시각:{" "}
          <span className="font-mono text-zinc-400">
            {new Date(active.capturedAt).toLocaleString("ko-KR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        </span>
        <span>
          Top <span className="font-mono text-zinc-400">{active.entries.length}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {active.entries.map((entry) => (
          <TokenCard
            key={`${active.market}-${entry.ticker}`}
            entry={entry}
            market={active.market}
            issuedAt={active.capturedAt}
          />
        ))}
      </div>
    </div>
  );
}
