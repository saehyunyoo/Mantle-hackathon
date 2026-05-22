import { MOCK_DISTRIBUTIONS_TODAY, MOCK_MARKETS } from "@jion/mocks";
import { HowItWorks } from "@/components/how-it-works";
import { LiveStatusBar } from "@/components/live-status-bar";
import { MarketTabs } from "@/components/market-tabs";
import { getLiveSnapshots } from "@/lib/snapshot-live";

/**
 * Revalidate the live snapshot once a minute. Server renders with a fresh
 * Pyth fetch when the cache window expires; otherwise serves the cached
 * page. Demo recordings stay consistent within a minute.
 */
export const revalidate = 60;

export default async function Home() {
  const marketNames = Object.fromEntries(
    MOCK_MARKETS.map((m) => [m.code, m.name]),
  );

  const { snapshots, coverage, pythUpdatedAt, pythStatus } =
    await getLiveSnapshots();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-8 lg:px-12">
      <header className="mb-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Mantle · AI × RWA
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Trade today&apos;s trend
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          Daily top-volume stocks per market, auto-tokenized one hour after open
          and AI-routed across Mantle DeFi. Trade them where they live — not here.
        </p>
      </header>

      <LiveStatusBar
        pythStatus={pythStatus}
        pythUpdatedAt={pythUpdatedAt}
        coverage={coverage}
      />

      <HowItWorks />

      <MarketTabs
        snapshots={snapshots}
        marketNames={marketNames}
        distributions={MOCK_DISTRIBUTIONS_TODAY}
      />

      <footer className="mt-16 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        <p>
          Prices via{" "}
          <a
            href="https://pyth.network/"
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:underline"
          >
            Pyth Network
          </a>{" "}
          (live for {Object.values(coverage).reduce((a, c) => a + c.live, 0)} of
          {" "}{Object.values(coverage).reduce((a, c) => a + c.total, 0)} tickers).
          Tickers without a registered Pyth equity feed fall back to last
          known mock prices. Trading happens on Mantle DeFi venues, not here.
        </p>
      </footer>
    </main>
  );
}
