import { MANTLE_SEPOLIA_ADDRESSES } from "@jion/types";
import { PROTOCOL_LABEL, MOCK_SNAPSHOTS_TODAY } from "@jion/mocks";
import { getLiveSnapshots } from "@/lib/snapshot-live";
import {
  findEntryBySymbol,
  routeDistributionFast,
} from "@/lib/ai/distribution-router";
import { isClaudeEnabled, streamText } from "@/lib/ai/claude";

export const runtime = "nodejs";

type Intent = "trending" | "explain" | "buy" | "general";

interface AskMeta {
  intent: Intent;
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

const BUY_RE = /\b(buy|purchase|invest|acquire|long|get me)\b/i;
const TREND_RE = /\b(hot|trend|trending|today|top|movers|popular)\b/i;

export async function POST(req: Request) {
  let query = "";
  try {
    const body = await req.json();
    query = typeof body?.query === "string" ? body.query.trim() : "";
  } catch {
    /* ignore */
  }
  if (!query) {
    return new Response("Empty query.", { status: 400 });
  }

  const lower = query.toLowerCase();
  const live = await getLiveSnapshots();
  const snapshots = live.snapshots.length ? live.snapshots : MOCK_SNAPSHOTS_TODAY;

  // --- resolve a mentioned token (ticker or company name) ---
  let symbol: string | null = null;
  for (const snap of snapshots) {
    for (const e of snap.entries) {
      const firstWord = e.name.toLowerCase().split(/\s+/)[0] ?? "";
      if (
        lower.includes(e.ticker.toLowerCase()) ||
        (firstWord.length >= 4 && lower.includes(firstWord))
      ) {
        symbol = `m${e.ticker}`;
        break;
      }
    }
    if (symbol) break;
  }

  const isBuy = BUY_RE.test(lower);
  const isTrending = TREND_RE.test(lower);

  let intent: Intent;
  if (symbol) intent = isBuy ? "buy" : "explain";
  else if (isTrending) intent = "trending";
  else intent = "general";

  const meta: AskMeta = {
    intent,
    symbol,
    venues: [],
    agentLogger: MANTLE_SEPOLIA_ADDRESSES.AgentLogger,
    claudeEnabled: isClaudeEnabled(),
  };
  let prompt = "";
  let fallback = "";

  if (symbol) {
    const resolved = await findEntryBySymbol(symbol);
    if (resolved) {
      // Fast: venues/listings only, no blocking LLM call — the narrative
      // streams separately below so meta + chips appear instantly.
      const distribution = routeDistributionFast(resolved);
      meta.name = resolved.entry.name;
      meta.tokenAddress = distribution.tokenAddress;
      meta.routeHref = `/route/${symbol}`;
      meta.venues = distribution.listings.map((l) => ({
        label: PROTOCOL_LABEL[l.protocol] ?? l.protocol,
        url: l.url,
        kind: l.kind,
      }));
      const venueList = meta.venues.map((v) => v.label).join(", ");

      if (intent === "buy") {
        prompt = `You are Jion's AI routing agent. The user wants to acquire ${resolved.entry.name} (${symbol}). Jion is infrastructure, not a venue. In ONE short sentence: name the best Mantle DeFi venue to trade it (${venueList}) and tell them to complete the trade there. No greeting, no preamble.`;
        fallback = `${resolved.entry.name} is best traded on ${venueList} on Mantle. Jion routes — it doesn't custody your trade — so open the venue below to complete your purchase.`;
      } else {
        prompt = `You are Jion's AI routing agent. In ONE short sentence, say why ${resolved.entry.name} (${symbol}) was routed to ${venueList} — reference volume rank, volatility, or liquidity. No greeting, no preamble.`;
        fallback = distribution.routingReasoning;
      }
    } else {
      intent = "general";
      meta.intent = "general";
    }
  }

  if (intent === "trending") {
    const top = snapshots
      .flatMap((s) => s.entries.map((e) => ({ e, market: s.market })))
      .sort((a, b) => a.e.rank - b.e.rank || b.e.volume1h - a.e.volume1h)
      .slice(0, 8);
    meta.trending = top.map(({ e, market }) => ({
      symbol: `m${e.ticker}`,
      ticker: e.ticker,
      name: e.name,
      market: String(market),
      rank: e.rank,
    }));
    const list = top
      .map(({ e, market }) => `${e.name} (${e.ticker}, ${market} #${e.rank})`)
      .join("; ");
    prompt = `You are Jion's AI agent. In ONE short sentence, introduce today's auto-tokenized top-volume stocks and invite the user to tap one for its AI routing. Names: ${list}. No greeting, no preamble.`;
    fallback = `Today's auto-tokenized leaders: ${list}. Tap any to see how the AI distributed it across Mantle DeFi.`;
  }

  if (intent === "general") {
    prompt = `You are Jion's assistant. Jion auto-tokenizes the day's top-volume stocks per market and an explainable AI router distributes them across Mantle DeFi venues; every routing decision is logged on-chain via AgentLogger. Answer the user's question in 1-2 short sentences. If off-topic, steer back to what Jion does. No greeting.\n\nUser: ${query}`;
    fallback =
      "Jion auto-tokenizes the day's top-volume stocks and an explainable AI router distributes them across Mantle DeFi — every decision logged on-chain. Try \"show today's hot stocks\" or \"why did mNVDA route to Merchant Moe?\".";
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(meta) + "\n"));
      try {
        if (isClaudeEnabled()) {
          let emitted = false;
          for await (const chunk of streamText(prompt, 110)) {
            emitted = true;
            controller.enqueue(encoder.encode(chunk));
          }
          if (!emitted) controller.enqueue(encoder.encode(fallback));
        } else {
          controller.enqueue(encoder.encode(fallback));
        }
      } catch (err) {
        console.error("[ask] narration failed:", err);
        controller.enqueue(encoder.encode(fallback));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Disable proxy buffering so tokens flush to the client as they stream.
      "X-Accel-Buffering": "no",
    },
  });
}
