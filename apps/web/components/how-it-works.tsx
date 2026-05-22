interface Pillar {
  icon: string;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: "📈",
    title: "Top-10 volume stocks",
    body: "The day's most-traded stocks from NASDAQ, KRX, and TSE — auto-tokenized one hour after market open. Hold a single mTICKER to ride that day's market leaders.",
  },
  {
    icon: "✨",
    title: "LLM narrative",
    body: "A reasoning LLM explains *why* each token went to which venue, in plain language. Click any card to see the routing logic — no black box.",
  },
  {
    icon: "⛓️",
    title: "On-chain logged",
    body: "Every routing decision is emitted via AgentLogger on Mantle. Verifiable agent — replay any decision straight from chain history.",
  },
];

export function HowItWorks() {
  return (
    <section className="mb-10 rounded-2xl border border-violet-500/30 bg-violet-500/[0.04] p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
            How Jion works
          </div>
          <div className="mt-1 text-xl font-semibold leading-tight text-zinc-50 sm:text-2xl">
            Today&apos;s hottest stocks, AI-routed where they perform best.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-base" aria-hidden>
                {p.icon}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                {p.title}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-zinc-400">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
