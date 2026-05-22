interface Pillar {
  icon: string;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: "🧠",
    title: "Heuristic decision",
    body: "Rule-based scoring across 5 Mantle DeFi venues — volume tier × volatility × venue fit. Deterministic, auditable, no model hallucination.",
  },
  {
    icon: "✨",
    title: "LLM narrative",
    body: "A reasoning LLM explains *why* each venue was picked in plain language. Never decides — only narrates the heuristic's choice.",
  },
  {
    icon: "⛓️",
    title: "On-chain logged",
    body: "Every routing decision is emitted via AgentLogger on Mantle Sepolia. Verifiable agent — replay any decision from the chain.",
  },
];

export function HowItWorks() {
  return (
    <section className="mb-10 rounded-2xl border border-violet-500/30 bg-violet-500/[0.04] p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
            How Jion routes
          </div>
          <div className="mt-1 text-sm text-zinc-300">
            Explainable AI distribution — verifiable rules + LLM narrative.
            No hallucinated venue picks.
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
