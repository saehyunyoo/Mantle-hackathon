import { MOCK_PRICE_FEEDS } from "@jion/mocks";
import { OracleFeedTable } from "@/components/oracle-feed-table";

export default function FeedPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-8 lg:px-12">
      <header className="mb-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          Oracle · Live
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Oracle Live Feed
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          Real-time price feeds powering Jion synthetic tokens. Each row maps
          a tokenized stock to its on-chain oracle source.
        </p>
      </header>

      <OracleFeedTable feeds={MOCK_PRICE_FEEDS} />

      <footer className="mt-16 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        <p>
          Source data: <span className="font-mono text-zinc-500">Pyth Hermes</span>
          {" · "}
          Polling cadence shown is a UI-side simulation for demo. Production target:
          Pyth Mantle Sepolia push updates + on-chain pull-on-trade.
        </p>
      </footer>
    </main>
  );
}
