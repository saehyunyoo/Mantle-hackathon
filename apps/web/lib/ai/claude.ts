import Anthropic from "@anthropic-ai/sdk";
import type { DeFiListing, SnapshotEntry } from "@jion/types";
import { PROTOCOL_LABEL } from "@jion/mocks";

/**
 * LLM provider abstraction.
 *
 * Jion narrates the heuristic router's decision with an LLM. Per README:
 * Claude on dev, Z.ai (Mantle sponsor) on the submission demo. Selection:
 *   - LLM_PROVIDER=claude|zai  forces a provider (if its key is present)
 *   - otherwise auto: Claude if ANTHROPIC_API_KEY, else Z.ai if ZAI_API_KEY
 *   - none configured → callers fall back to templated narration
 *
 * Z.ai exposes an OpenAI-compatible chat-completions API, so it's driven via
 * fetch (streaming SSE) — no extra SDK dependency.
 *
 * NOTE: file kept as `claude.ts` for import stability; it is now multi-provider.
 */

type Provider = "claude" | "zai";

const HAS_CLAUDE = !!process.env.ANTHROPIC_API_KEY;
const HAS_ZAI = !!process.env.ZAI_API_KEY;

function resolveProvider(): Provider | null {
  const pref = process.env.LLM_PROVIDER?.toLowerCase();
  if (pref === "zai" && HAS_ZAI) return "zai";
  if (pref === "claude" && HAS_CLAUDE) return "claude";
  // auto-fallback: Claude preferred in dev, Z.ai if it's the only key present
  if (HAS_CLAUDE) return "claude";
  if (HAS_ZAI) return "zai";
  return null;
}

const PROVIDER = resolveProvider();

const claude = HAS_CLAUDE
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const CLAUDE_MODEL = "claude-sonnet-4-6";
const ZAI_BASE = process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/paas/v4";
const ZAI_MODEL = process.env.ZAI_MODEL ?? "glm-4.6";

export function activeProvider(): Provider | null {
  return PROVIDER;
}

export function isLLMEnabled(): boolean {
  return PROVIDER !== null;
}

/** @deprecated use {@link isLLMEnabled}. Kept for import stability. */
export function isClaudeEnabled(): boolean {
  return isLLMEnabled();
}

/** Short label for UI badges — surfaces the sponsor model (e.g. "Z.ai"). */
export function providerLabel(): string {
  if (PROVIDER === "zai") return "Z.ai";
  if (PROVIDER === "claude") return "Claude";
  return "Heuristic";
}

/**
 * Stream a natural-language answer token-by-token. Yields nothing when no
 * provider is configured — callers fall back to a templated narrative so the
 * "Ask Jion" UI keeps working in dev / on the mock demo.
 */
export async function* streamText(
  prompt: string,
  maxTokens = 320,
): AsyncGenerator<string> {
  if (PROVIDER === "claude" && claude) {
    const stream = claude.messages.stream({
      model: CLAUDE_MODEL,
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
    return;
  }
  if (PROVIDER === "zai") {
    yield* streamZai(prompt, maxTokens);
  }
}

/** Z.ai (OpenAI-compatible) streaming via SSE. */
async function* streamZai(
  prompt: string,
  maxTokens: number,
): AsyncGenerator<string> {
  const res = await fetch(`${ZAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ZAI_MODEL,
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok || !res.body) {
    console.error("[llm:zai] stream failed:", res.status);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        /* ignore keep-alive / partial frames */
      }
    }
  }
}

/** Non-streaming completion across providers. Returns null on failure. */
async function complete(
  prompt: string,
  maxTokens: number,
): Promise<string | null> {
  try {
    if (PROVIDER === "claude" && claude) {
      const msg = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });
      const block = msg.content.find((c) => c.type === "text");
      return block && "text" in block ? block.text.trim() : null;
    }
    if (PROVIDER === "zai") {
      const res = await fetch(`${ZAI_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ZAI_MODEL,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      return typeof text === "string" ? text.trim() : null;
    }
  } catch (err) {
    console.error(`[llm:${PROVIDER}] completion failed:`, err);
  }
  return null;
}

interface ReasoningInput {
  entry: SnapshotEntry;
  marketCode: string;
  listings: DeFiListing[];
}

/**
 * Summarize *why* this distribution decision was made — 1–2 sentences via the
 * active provider. Falls back to a heuristic-built explanation if no provider
 * is configured or the call fails, so the UI always renders.
 */
export async function explainDistribution({
  entry,
  marketCode,
  listings,
}: ReasoningInput): Promise<string> {
  if (!PROVIDER) {
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

  const out = await complete(prompt, 220);
  return out ?? fallbackExplanation(entry, marketCode, listings);
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
