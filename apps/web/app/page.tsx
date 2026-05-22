import {
  MOCK_DISTRIBUTIONS_TODAY,
  MOCK_MARKETS,
  MOCK_SNAPSHOTS_TODAY,
} from "@jion/mocks";
import { HowItWorks } from "@/components/how-it-works";
import { MarketTabs } from "@/components/market-tabs";

export default function Home() {
  const marketNames = Object.fromEntries(
    MOCK_MARKETS.map((m) => [m.code, m.name]),
  );

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

      <HowItWorks />

      <MarketTabs
        snapshots={MOCK_SNAPSHOTS_TODAY}
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
          </a>
          . Mock data shown for T1. Jion issues the tokens; trading happens on
          Mantle DeFi venues (Merchant Moe, Fluxion, Agni, Lendle, Init Capital).
        </p>
      </footer>
    </main>
  );
}
