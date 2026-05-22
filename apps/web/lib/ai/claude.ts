import Anthropic from "@anthropic-ai/sdk";
import type { DeFiListing, SnapshotEntry } from "@jion/types";
import { PROTOCOL_LABEL } from "@jion/mocks";
import type { ListingPlan } from "./scoring";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

export function isClaudeEnabled(): boolean {
  return client !== null;
}

interface ReasoningInput {
  entry: SnapshotEntry;
  marketCode: string;
  listings: DeFiListing[];
  /** Listing breadth + seed % decision from `computeListingPlan`. */
  plan: ListingPlan;
  /** Total minted supply (whole units, BigInt as string). */
  initialSupplyUnits: string;
  /** Seed amounts (whole units / USDC) summed across listings. */
  seededTokenUnitsTotal: string;
  seededUsdcUnitsTotal: number;
  /** Oracle price at issue time. */
  oraclePriceUsd: number;
}

/**
 * Ask Claude to summarize *why* this distribution decision was made.
 * Returns a 2–3 sentence natural-language explanation that covers (a) venue
 * selection, (b) seed sizing rationale, (c) what stays in the vault.
 *
 * Falls back to a deterministic heuristic narrative if no API key is set.
 */
export async function explainDistribution({
  entry,
  marketCode,
  listings,
  plan,
  initialSupplyUnits,
  seededTokenUnitsTotal,
  seededUsdcUnitsTotal,
  oraclePriceUsd,
}: ReasoningInput): Promise<string> {
  if (!client) {
    return fallbackExplanation({
      entry,
      marketCode,
      listings,
      plan,
      initialSupplyUnits,
      seededTokenUnitsTotal,
      seededUsdcUnitsTotal,
    });
  }

  const venues = listings
    .map((l) => {
      const tokens = l.seededTokenUnits
        ? `${Number(l.seededTokenUnits).toLocaleString()} ${entry.ticker}`
        : "—";
      const usdc = l.seededUsdcUnits
        ? `$${l.seededUsdcUnits.toLocaleString()}`
        : "—";
      const pct =
        l.weightBps !== undefined ? `${(l.weightBps / 100).toFixed(1)}%` : "—";
      return `- ${PROTOCOL_LABEL[l.protocol] ?? l.protocol} (${l.kind}) — seed ${tokens} + ${usdc} USDC, weight ${pct} of mint`;
    })
    .join("\n");

  const vaultReserveBps = 10_000 - plan.seedPctBps;
  const prompt = `You are the AI distribution router for Jion, a daily RWA tokenization platform on Mantle DeFi.

A new synthetic token was just issued. Explain in 2–3 concise sentences what the routing agent decided and why. Speak as the agent — confident, technical, concrete. No greetings, no hedging.

Cover three points:
1. Which venues were selected and the volume/volatility fit reason.
2. The seed sizing — how much of the mint went into pools vs. stays in the protocol vault (note: the vault reserve is NOT used for ongoing MM; ongoing MM is the venue's responsibility).
3. The initial listing price = oracle, so the venue/external LPs pick up market making from there.

Token: ${entry.name} (${entry.ticker})
Market: ${marketCode}
Volume rank today: #${entry.rank}
1H volume: $${Math.round(entry.volume1h).toLocaleString()}
Oracle issue price: $${oraclePriceUsd}

Supply policy (Youngin rank-tier):
  Minted: ${Number(initialSupplyUnits).toLocaleString()} ${entry.ticker}
  Seeded into pools: ${Number(seededTokenUnitsTotal).toLocaleString()} (${(plan.seedPctBps / 100).toFixed(1)}% of mint)
  Vault reserve: ${(vaultReserveBps / 100).toFixed(1)}% of mint
  USDC paired: $${seededUsdcUnitsTotal.toLocaleString()} (= tokens × oracle)

Plan rationale (heuristic): ${plan.rationale}

Selected venues:
${venues}

Reasoning:`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 320,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((c) => c.type === "text");
    return block && "text" in block
      ? block.text.trim()
      : fallbackExplanation({
          entry,
          marketCode,
          listings,
          plan,
          initialSupplyUnits,
          seededTokenUnitsTotal,
          seededUsdcUnitsTotal,
        });
  } catch (err) {
    console.error("[claude] explainDistribution failed:", err);
    return fallbackExplanation({
      entry,
      marketCode,
      listings,
      plan,
      initialSupplyUnits,
      seededTokenUnitsTotal,
      seededUsdcUnitsTotal,
    });
  }
}

interface FallbackInput {
  entry: SnapshotEntry;
  marketCode: string;
  listings: DeFiListing[];
  plan: ListingPlan;
  initialSupplyUnits: string;
  seededTokenUnitsTotal: string;
  seededUsdcUnitsTotal: number;
}

function fallbackExplanation({
  entry,
  marketCode,
  listings,
  plan,
  initialSupplyUnits,
  seededTokenUnitsTotal,
  seededUsdcUnitsTotal,
}: FallbackInput): string {
  const venues = listings
    .map((l) => PROTOCOL_LABEL[l.protocol] ?? l.protocol)
    .join(" + ");
  const seedPct = (plan.seedPctBps / 100).toFixed(1);
  const vaultPct = ((10_000 - plan.seedPctBps) / 100).toFixed(1);
  const minted = Number(initialSupplyUnits).toLocaleString();
  const seeded = Number(seededTokenUnitsTotal).toLocaleString();
  return (
    `${entry.name} (${marketCode} #${entry.rank}) routed to ${venues}. ` +
    `Minted ${minted} ${entry.ticker}; seeded ${seeded} (${seedPct}%) plus $${seededUsdcUnitsTotal.toLocaleString()} USDC across listings — ` +
    `remaining ${vaultPct}% held in protocol vault as float reserve, not for ongoing MM (venues/external LPs handle that from here).`
  );
}
