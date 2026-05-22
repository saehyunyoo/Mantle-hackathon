import {
  MOCK_DISTRIBUTIONS_TODAY,
  MOCK_SNAPSHOTS_TODAY,
} from "@jion/mocks";
import { PerformanceSummary } from "@/components/performance-summary";
import { ProtocolLeaderboard } from "@/components/protocol-leaderboard";
import { PerformanceMatrix } from "@/components/performance-matrix";
import {
  computeOverall,
  computeProtocolStats,
  computeTokenStats,
} from "@/lib/aggregate";

export default function PerformancePage() {
  const overall = computeOverall(MOCK_DISTRIBUTIONS_TODAY);
  const protocolStats = computeProtocolStats(MOCK_DISTRIBUTIONS_TODAY);
  const tokenStats = computeTokenStats(
    MOCK_DISTRIBUTIONS_TODAY,
    MOCK_SNAPSHOTS_TODAY,
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-8 lg:px-12">
      <header className="mb-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Cross-DeFi · Mantle Sepolia
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Performance
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          Where Jion-routed tokens are actually living and trading across
          Mantle DeFi. Token × venue matrix · per-venue leaderboard ·
          aggregate stats.
        </p>
      </header>

      <div className="mb-8">
        <PerformanceSummary stats={overall} />
      </div>

      <div className="mb-10">
        <ProtocolLeaderboard stats={protocolStats} />
      </div>

      <div className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">
            Token × venue matrix
          </h2>
          <span className="text-[11px] text-zinc-500">
            Click any token symbol to see its routing decision.
          </span>
        </div>
        <PerformanceMatrix tokenStats={tokenStats} />
      </div>

      <footer className="border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        Aggregated from <span className="font-mono">MOCK_DISTRIBUTIONS_TODAY</span>{" "}
        — follow-up PR will wire to T4 Supabase + on-chain reads from{" "}
        <span className="font-mono">Distributor</span> + each adapter&apos;s
        <span className="font-mono"> volume24h()</span>.
      </footer>
    </main>
  );
}
