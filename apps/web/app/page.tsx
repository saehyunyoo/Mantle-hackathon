import { MOCK_MARKETS, MOCK_SNAPSHOTS_TODAY } from "@jion/mocks";
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
          오늘의 트렌딩
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          매일 시장 개장 +1시간 기준 거래량 Top 10 주식을 자동으로 합성토큰화.
          AI가 Mantle DeFi에서 최적 거래/유동성 경로를 찾아줍니다.
        </p>
      </header>

      <MarketTabs snapshots={MOCK_SNAPSHOTS_TODAY} marketNames={marketNames} />

      <footer className="mt-16 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
        <p>
          현재 화면은 mock 데이터 기반(T1). 실제 데이터/스왑/LP는 T2~T6에서 연결.
        </p>
      </footer>
    </main>
  );
}
