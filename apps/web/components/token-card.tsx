import type { MarketCode, SnapshotEntry } from "@jion/types";
import { formatPrice, formatUsd, marketCurrency } from "@/lib/format";

interface TokenCardProps {
  entry: SnapshotEntry;
  market: MarketCode;
  issuedAt: string;
}

export function TokenCard({ entry, market, issuedAt }: TokenCardProps) {
  const currency = marketCurrency(market);
  const symbol = `m${entry.ticker}-${issuedAt.slice(0, 10).replaceAll("-", "")}`;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700 hover:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-500">#{entry.rank}</span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          ACTIVE
        </span>
      </div>

      <div className="mb-1 font-mono text-lg font-semibold text-zinc-100">
        {symbol}
      </div>
      <div className="mb-4 line-clamp-1 text-sm text-zinc-400">
        {entry.name}
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">발행가</span>
          <span className="font-mono text-sm font-semibold text-zinc-100">
            {formatPrice(entry.price, currency)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">1h 거래량</span>
          <span className="font-mono text-sm text-zinc-300">
            {formatUsd(entry.volume1h)}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        title="T2에서 구현 예정"
      >
        스왑하기
      </button>
    </div>
  );
}
