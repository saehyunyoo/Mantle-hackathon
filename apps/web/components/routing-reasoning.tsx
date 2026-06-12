"use client";

import { useEffect, useState } from "react";

interface RoutingReasoningProps {
  reasoning: string;
  generatedAt: string;
  /** Venue match scores (0–100) from the heuristic — visualizes the "why". */
  scores?: { label: string; score: number }[];
  /** AgentLogger explorer link — ties the AI decision to on-chain proof. */
  onchainHref?: string;
}

export function RoutingReasoning({
  reasoning,
  generatedAt,
  scores,
  onchainHref,
}: RoutingReasoningProps) {
  // Typewriter reveal — makes the AI narration feel generated, not pasted.
  const [shown, setShown] = useState(0);
  const [barsIn, setBarsIn] = useState(false);

  useEffect(() => {
    let n = 0;
    const step = Math.max(1, Math.round(reasoning.length / 90));
    const id = setInterval(() => {
      n = Math.min(reasoning.length, n + step);
      setShown(n);
      if (n >= reasoning.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [reasoning]);

  useEffect(() => {
    const id = setTimeout(() => setBarsIn(true), 120);
    return () => clearTimeout(id);
  }, []);

  const typing = shown < reasoning.length;

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-brand-500/[0.05] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-200">
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

      <p className="text-sm leading-relaxed text-zinc-200">
        {reasoning.slice(0, shown)}
        {typing && (
          <span className="ml-0.5 inline-block animate-blink text-brand-300">
            ▍
          </span>
        )}
      </p>

      {/* venue match scores — the heuristic the LLM is narrating, made visible */}
      {scores && scores.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Venue fit · volume × volatility × liquidity
          </div>
          {scores.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-xs text-zinc-400">
                {s.label}
              </span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-[width] duration-700 ease-out"
                  style={{ width: barsIn ? `${s.score}%` : "0%" }}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-zinc-400">
                {s.score}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-zinc-500">
          Explainable AI distribution — heuristic scoring with LLM-generated
          narrative.
        </p>
        {onchainHref && (
          <a
            href={onchainHref}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-brand-300 transition hover:text-brand-200"
            title="This decision is emitted on-chain via AgentLogger"
          >
            View this decision on-chain ↗
          </a>
        )}
      </div>
    </div>
  );
}
