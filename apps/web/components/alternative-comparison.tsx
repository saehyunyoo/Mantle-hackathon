import type { DeFiProtocol, TokenDistribution } from "@jion/types";
import { PROTOCOL_LABEL } from "@jion/mocks";

const ALL_PROTOCOLS: DeFiProtocol[] = [
  "merchant-moe",
  "fluxion",
  "agni",
  "lendle",
  "init-capital",
];

const SKIP_REASONS: Record<DeFiProtocol, string> = {
  "merchant-moe":
    "Selected — deepest USDC liquidity on Mantle for this volume tier.",
  fluxion:
    "Selected when token volatility is high — concentrated liquidity captures tighter spreads.",
  agni: "Considered as secondary AMM venue; routed when cross-DEX arb is worth the gas overhead.",
  lendle:
    "Selected for top-rank tokens with stable price profile — unlocks leveraged exposure for traders.",
  "init-capital":
    "Selected for blue-chip stable profile tokens — stable-yield lending market suitable.",
};

interface AlternativeComparisonProps {
  distribution: TokenDistribution;
}

export function AlternativeComparison({ distribution }: AlternativeComparisonProps) {
  const selectedProtocols = new Set(
    distribution.listings.map((l) => l.protocol),
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-4">
        <div className="text-sm font-semibold text-zinc-100">
          Routing decision matrix
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">
          All candidate protocols considered for this issuance cycle.
        </div>
      </div>

      <div className="space-y-2">
        {ALL_PROTOCOLS.map((p) => {
          const isSelected = selectedProtocols.has(p);
          return (
            <div
              key={p}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                isSelected
                  ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-zinc-800 bg-zinc-950"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isSelected
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {isSelected ? "✓" : "—"}
              </span>
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    isSelected ? "text-zinc-100" : "text-zinc-400"
                  }`}
                >
                  {PROTOCOL_LABEL[p] ?? p}
                  {isSelected && (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                      Selected
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {SKIP_REASONS[p]}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
