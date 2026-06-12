"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { explorerAddress, shortAddress } from "@/lib/explorer";

interface AskMeta {
  intent: "trending" | "explain" | "buy" | "general";
  symbol: string | null;
  name?: string;
  venues: { label: string; url: string; kind: string }[];
  trending?: {
    symbol: string;
    ticker: string;
    name: string;
    market: string;
    rank: number;
  }[];
  tokenAddress?: string;
  routeHref?: string;
  agentLogger: string;
  claudeEnabled: boolean;
}

const EXAMPLES = [
  "오늘의 핫스톡 보여줘",
  "Why did mNVDA route to Merchant Moe?",
  "I want to buy mTSLA",
];

export function AskJion() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [meta, setMeta] = useState<AskMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setStarted(true);
    setError(null);
    setAnswer("");
    setMeta(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok || !res.body) {
        setError("Ask Jion is unavailable right now. Try again.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let gotMeta = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const nl = buf.indexOf("\n");
        if (nl === -1) continue;
        if (!gotMeta) {
          try {
            setMeta(JSON.parse(buf.slice(0, nl)) as AskMeta);
          } catch {
            /* keep streaming text even if meta unparseable */
          }
          gotMeta = true;
        }
        setAnswer(buf.slice(nl + 1));
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    ask(query);
  }

  function runExample(ex: string) {
    setQuery(ex);
    inputRef.current?.focus();
    ask(ex);
  }

  return (
    <section
      aria-label="Ask Jion"
      className="rounded-3xl border border-brand-500/25 bg-gradient-to-b from-brand-500/[0.06] to-transparent p-5 shadow-2xl shadow-brand-950/30 sm:p-6"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-200">
          AI
        </span>
        <span className="text-sm font-semibold text-zinc-100">Ask Jion</span>
        <span className="text-xs text-zinc-500">
          natural language · routes &amp; explains, trades stay on-venue
        </span>
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Ask about today&apos;s tokens — e.g. "why did mNVDA route there?"'
          aria-label="Ask Jion a question"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition focus:border-brand-500/50"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-40"
        >
          {loading ? "…" : "Ask"}
        </button>
      </form>

      {/* guidance chips (also: accessibility — shows users what they can do) */}
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => runExample(ex)}
            className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400 transition hover:border-brand-500/40 hover:text-zinc-200"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* answer */}
      {started && (
        <div className="mt-4 animate-fade-up rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          {error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : (
            <>
              {!answer && loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-zinc-200">
                  {answer}
                  {loading && (
                    <span className="ml-0.5 inline-block animate-blink text-brand-300">
                      ▍
                    </span>
                  )}
                </p>
              )}

              {/* trending chips */}
              {meta?.trending && meta.trending.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {meta.trending.map((t) => (
                    <Link
                      key={t.symbol}
                      href={`/route/${t.symbol}`}
                      className="group rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-brand-500/40"
                    >
                      <span className="font-medium text-zinc-100">
                        {t.symbol}
                      </span>{" "}
                      <span className="text-zinc-500">
                        {t.market} #{t.rank}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* venue handoff (infra-not-venue: trade on external venue) */}
              {meta?.venues && meta.venues.length > 0 && (
                <div className="mt-4 border-t border-zinc-800/80 pt-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">
                    {meta.intent === "buy" ? "Trade on" : "Routed to"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {meta.venues.map((v) => (
                      <a
                        key={v.label}
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200 transition hover:bg-brand-500/20"
                      >
                        {v.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* deep links: full routing + on-chain provenance */}
              {(meta?.routeHref || meta?.agentLogger) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {meta?.routeHref && (
                    <Link
                      href={meta.routeHref}
                      className="text-brand-300 transition hover:text-brand-200"
                    >
                      Full AI routing →
                    </Link>
                  )}
                  {meta?.agentLogger && (
                    <a
                      href={explorerAddress(meta.agentLogger)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-zinc-500 transition hover:text-zinc-300"
                      title="Every routing decision is logged on-chain via AgentLogger"
                    >
                      View agent log on-chain {shortAddress(meta.agentLogger)} ↗
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
