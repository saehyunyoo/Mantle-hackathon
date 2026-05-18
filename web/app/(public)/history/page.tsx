export default function HistoryPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <p className="text-mute text-xs tracking-widest font-mono">
            MY TOKENS · SETTLEMENTS
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 font-display">
            History
          </h1>
        </header>
        <div className="bg-card border border-line rounded-2xl p-6">
          <p className="text-mute">
            GET /api/history/[wallet] · placeholder UI. 영인이 채워넣을 부분.
          </p>
        </div>
      </div>
    </main>
  );
}
