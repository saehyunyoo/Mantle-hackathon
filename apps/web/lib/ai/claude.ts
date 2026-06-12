import Anthropic from "@anthropic-ai/sdk";
import type { DeFiListing, SnapshotEntry } from "@jion/types";
import { PROTOCOL_LABEL } from "@jion/mocks";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

export function isClaudeEnabled(): boolean {
  return client !== null;
}

/**
 * Stream a natural-language answer token-by-token. Yields nothing when no
 * API key is configured — callers fall back to a templated narrative so the
 * "Ask Jion" UI keeps working in dev / on the mock demo.
 */
export async function* streamText(
  prompt: string,
  maxTokens = 320,
): AsyncGenerator<string> {
  if (!client) return;
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

interface ReasoningInput {
  entry: SnapshotEntry;
  marketCode: string;
  listings: DeFiListing[];
}

/**
 * Ask Claude to summarize *why* this distribution decision was made.
 * Returns a 1–2 sentence natural-language explanation.
 *
 * If no API key is configured, returns a heuristic-built fallback so the
 * UI keeps working in dev without external dependencies.
 */
export async function explainDistribution({
  entry,
  marketCode,
  listings,
}: ReasoningInput): Promise<string> {
  if (!client) {
    return fallbackExplanation(entry, marketCode, listings);
  }

  const venues = listings
    .map(
      (l) =>
        `- ${PROTOCOL_LABEL[l.protocol] ?? l.protocol} (${l.kind}, TVL $${Math.round(l.tvlUsd).toLocaleString()})`,
    )
    .join("\n");

  const prompt = `You are the AI distribution router for Jion, a daily RWA tokenization platform on Mantle DeFi.

A new synthetic token was just issued. Explain in 1–2 concise sentences why it was routed to these specific Mantle DeFi venues. Speak as the routing agent — confident, technical, and concrete. Do not greet or hedge.

Token: ${entry.name} (${entry.ticker})
Market: ${marketCode}
Volume rank today: #${entry.rank}
1H volume: $${Math.round(entry.volume1h).toLocaleString()}
Issue price: $${entry.price}

Selected venues:
${venues}

Reasoning:`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 220,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((c) => c.type === "text");
    return block && "text" in block
      ? block.text.trim()
      : fallbackExplanation(entry, marketCode, listings);
  } catch (err) {
    console.error("[claude] explainDistribution failed:", err);
    return fallbackExplanation(entry, marketCode, listings);
  }
}

function fallbackExplanation(
  entry: SnapshotEntry,
  marketCode: string,
  listings: DeFiListing[],
): string {
  const venues = listings
    .map((l) => PROTOCOL_LABEL[l.protocol] ?? l.protocol)
    .join(" + ");
  return `${entry.name} (${marketCode} #${entry.rank} by volume) routed to ${venues} — heuristic match based on volume tier, volatility profile, and venue suitability.`;
}
