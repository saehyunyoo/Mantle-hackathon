import { TodayResponse } from "@/lib/types/api";

async function getTodayTokens() {
  // Server-side fetch from our own API (mock for now).
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/today`, { cache: "no-store" });
  const data = await res.json();
  return TodayResponse.parse(data);
}

export default async function TodayPage() {
  const { date, tokens } = await getTodayTokens();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <p className="text-mute text-xs tracking-widest font-mono">
            {date} · NASDAQ TOP 10 · POWERED BY AI
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 font-display">
            오늘의 토큰화
          </h1>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((t) => (
            <div
              key={t.address}
              className="bg-card border border-line rounded-2xl p-5"
            >
              <div className="text-xs text-mute font-mono">{t.underlying}</div>
              <div className="text-2xl font-bold font-display mt-1">{t.symbol}</div>
              <div className="mt-3 font-mono">
                ${t.price.toFixed(2)}{" "}
                <span
                  className={
                    t.priceChange24h >= 0 ? "text-neon" : "text-hot"
                  }
                >
                  {t.priceChange24h >= 0 ? "+" : ""}
                  {t.priceChange24h.toFixed(2)}%
                </span>
              </div>
              <p className="text-sm text-mute mt-3 line-clamp-3">
                {t.agentReason}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
