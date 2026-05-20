interface RoutingReasoningProps {
  reasoning: string;
  generatedAt: string;
}

export function RoutingReasoning({ reasoning, generatedAt }: RoutingReasoningProps) {
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.04] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300">
            AI
          </span>
          <span className="text-sm font-semibold text-zinc-100">
            Routing reasoning
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">
          {new Date(generatedAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{reasoning}</p>
      <p className="mt-3 text-[10px] text-zinc-600">
        Explainable AI Distribution — heuristic scoring (volume × depth × volatility) with
        LLM-generated narrative. Mock for T2; live Claude integration in follow-up PR.
      </p>
    </div>
  );
}
