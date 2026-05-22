import Link from "next/link";
import { notFound } from "next/navigation";
import { MANTLE_SEPOLIA_ADDRESSES } from "@jion/types";
import { ListingDetailCard } from "@/components/listing-detail-card";
import { RoutingReasoning } from "@/components/routing-reasoning";
import { AlternativeComparison } from "@/components/alternative-comparison";
import { formatUsd } from "@/lib/format";
import { explorerAddress, shortAddress } from "@/lib/explorer";
import { isClaudeEnabled } from "@/lib/ai/claude";
import {
  findEntryBySymbol,
  routeDistribution,
} from "@/lib/ai/distribution-router";

/** Cache Pyth-enriched route page for 60s, matching the home page window. */
export const revalidate = 60;

interface RoutePageProps {
  params: Promise<{ symbol: string }>;
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);

  const resolved = await findEntryBySymbol(decodedSymbol);
  if (!resolved) {
    notFound();
  }

  const distribution = await routeDistribution(resolved);
  const claudeOn = isClaudeEnabled();

  const totalTvl = distribution.listings.reduce((s, l) => s + l.tvlUsd, 0);
  const totalVolume = distribution.listings.reduce(
    (s, l) => s + l.volume24hUsd,
    0,
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-8 lg:px-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          ← Back to Trending
        </Link>
      </div>

      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            AI Distribution Routing
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Mantle Sepolia
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              claudeOn
                ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
            }`}
            title={
              claudeOn
                ? "Live LLM-generated narration over heuristic routing"
                : "Heuristic-only narration (LLM provider not configured)"
            }
          >
            {claudeOn ? "Reasoning AI · live" : "Heuristic"}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          {resolved.entry.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-zinc-400">
          <span>
            Ticker{" "}
            <span className="font-medium text-zinc-200">
              {resolved.entry.ticker}
            </span>
          </span>
          <span>
            Token{" "}
            <span className="font-mono text-zinc-300">{decodedSymbol}</span>
          </span>
          <a
            href={explorerAddress(distribution.tokenAddress)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-zinc-500 hover:text-zinc-300"
          >
            {shortAddress(distribution.tokenAddress)} ↗
          </a>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Routed to
          </div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100">
            {distribution.listings.length}{" "}
            <span className="text-sm font-normal text-zinc-500">venues</span>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Aggregate TVL
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-100">
            {formatUsd(totalTvl)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            24h Volume (all venues)
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-100">
            {totalVolume > 0 ? formatUsd(totalVolume) : "—"}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <RoutingReasoning
          reasoning={distribution.routingReasoning}
          generatedAt={distribution.generatedAt}
        />
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Active listings ({distribution.listings.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {distribution.listings.map((l, i) => (
            <ListingDetailCard
              key={`${l.protocol}-${l.listingAddress}`}
              listing={l}
              rank={i + 1}
            />
          ))}
        </div>
      </div>

      <div className="mb-10">
        <AlternativeComparison distribution={distribution} />
      </div>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-3 text-sm font-semibold text-zinc-100">
          On-chain provenance
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ContractRef
            label="Distributor"
            address={MANTLE_SEPOLIA_ADDRESSES.Distributor}
          />
          <ContractRef
            label="AgentLogger"
            address={MANTLE_SEPOLIA_ADDRESSES.AgentLogger}
          />
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Every distribution decision is emitted on-chain via{" "}
          <span className="font-mono">AgentLogger.TokenDistribution</span> —
          verifiable agent on Mantle Sepolia.
        </p>
      </div>

      <footer className="border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        Routing computed live by{" "}
        <span className="font-mono">lib/ai/distribution-router</span>:
        heuristic scoring (volume × volatility × venue fit) +{" "}
        {claudeOn
          ? "live LLM-generated reasoning."
          : "fallback template narration (LLM provider not configured)."}{" "}
        External adapter listings point to Mock adapters on Sepolia (T8) — labeled
        as such for honesty.
      </footer>
    </main>
  );
}

function ContractRef({ label, address }: { label: string; address: string }) {
  return (
    <a
      href={explorerAddress(address)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 transition hover:border-zinc-700"
    >
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="font-mono text-[11px] text-zinc-500 group-hover:text-zinc-300">
        {shortAddress(address)} ↗
      </span>
    </a>
  );
}
