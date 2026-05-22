import Link from "next/link";
import type { MarketCode, TokenDistribution } from "@jion/types";
import {
  MOCK_DISTRIBUTIONS_TODAY,
  MOCK_MARKETS,
  MOCK_SNAPSHOTS_TODAY,
  PROTOCOL_LABEL,
} from "@jion/mocks";
import { formatUsd } from "@/lib/format";

export const metadata = {
  title: "AI Routing Reasoning · Jion",
  description:
    "Every token's distribution route and the AI's reasoning, aggregated in one view.",
};

const MARKET_FLAG: Record<string, string> = {
  NASDAQ: "🇺🇸",
  KRX: "🇰🇷",
  TSE: "🇯🇵",
  HKEX: "🇭🇰",
  LSE: "🇬🇧",
};

interface RowContext {
  distribution: TokenDistribution;
  ticker: string;
  name: string;
  rank: number;
  volume1h: number;
  market: MarketCode;
}

function buildRows(): Record<MarketCode, RowContext[]> {
  const bySymbol = new Map<string, TokenDistribution>();
  for (const d of MOCK_DISTRIBUTIONS_TODAY) bySymbol.set(d.tokenSymbol, d);

  const grouped: Partial<Record<MarketCode, RowContext[]>> = {};
  for (const snapshot of MOCK_SNAPSHOTS_TODAY) {
    const rows: RowContext[] = [];
    for (const entry of snapshot.entries) {
      const distribution = bySymbol.get(`m${entry.ticker}`);
      if (!distribution) continue;
      rows.push({
        distribution,
        ticker: entry.ticker,
        name: entry.name,
        rank: entry.rank,
        volume1h: entry.volume1h,
        market: snapshot.market,
      });
    }
    if (rows.length) grouped[snapshot.market] = rows;
  }
  return grouped as Record<MarketCode, RowContext[]>;
}

function VenuePill({
  protocol,
  kind,
  tvlUsd,
}: {
  protocol: string;
  kind: string;
  tvlUsd: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-200"
      title={`${kind} — TVL ${formatUsd(tvlUsd)} · Mock listing`}
    >
      {PROTOCOL_LABEL[protocol as keyof typeof PROTOCOL_LABEL] ?? protocol}
      <span className="rounded-sm border border-amber-700/40 bg-amber-900/20 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-amber-400">
        Mock
      </span>
    </span>
  );
}

function ReasoningRow({ ctx }: { ctx: RowContext }) {
  const { distribution, ticker, name, rank, volume1h } = ctx;
  const symbol = distribution.tokenSymbol;
  return (
    <Link
      href={`/route/${encodeURIComponent(symbol)}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-violet-500/40 hover:bg-zinc-900/60"
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-semibold text-zinc-100">
          {symbol}
        </span>
        <span className="text-xs text-zinc-400">{name}</span>
        <span className="font-mono text-[10px] text-zinc-600">
          #{rank} · 1H {formatUsd(volume1h)}
        </span>
        <span className="ml-auto text-sm font-semibold text-violet-400 group-hover:text-violet-200">
          Why this route →
        </span>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-zinc-300">
        &ldquo;{distribution.routingReasoning}&rdquo;
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          Routed to
        </span>
        {distribution.listings.map((l) => (
          <VenuePill
            key={`${l.protocol}-${l.listingAddress}`}
            protocol={l.protocol}
            kind={l.kind}
            tvlUsd={l.tvlUsd}
          />
        ))}
        <span className="font-mono text-[10px] text-zinc-600">
          {distribution.listings.length} venues
        </span>
      </div>
    </Link>
  );
}

export default function ReasoningPage() {
  const grouped = buildRows();
  const markets = MOCK_MARKETS.filter((m) => grouped[m.code]?.length);
  const totalTokens = Object.values(grouped).reduce(
    (s, rows) => s + (rows?.length ?? 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-8 lg:px-12">
      <header className="mb-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          AI Routing · {totalTokens} tokens today
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Routing Reasoning
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          Every token issued today, the venues it was routed to, and the AI&apos;s
          reasoning — at a glance. Click any row for the full live narrative.
        </p>
      </header>

      <div className="space-y-10">
        {markets.map((market) => {
          const rows = grouped[market.code] ?? [];
          return (
            <section key={market.code}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-100">
                  <span>{MARKET_FLAG[market.code] ?? "🌐"}</span>
                  {market.name}
                </h2>
                <span className="font-mono text-xs text-zinc-500">
                  {market.code} · {rows.length} tokens
                </span>
              </div>
              <div className="space-y-3">
                {rows.map((ctx) => (
                  <ReasoningRow key={ctx.distribution.tokenSymbol} ctx={ctx} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-12 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        Heuristic decisions, LLM narration. Click any row for the live{" "}
        <span className="text-violet-400">Reasoning AI</span> deep dive.{" "}
        <Link href="/" className="text-violet-400 hover:underline">
          ← Trending
        </Link>
      </footer>
    </main>
  );
}
