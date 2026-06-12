import { MOCK_POOLS_TODAY } from "@jion/mocks";
import { findEntryBySymbol } from "@/lib/ai/distribution-router";
import { scoreProtocolsFor, selectListings } from "@/lib/ai/scoring";
import { streamDistributionReasoning } from "@/lib/ai/claude";

export const runtime = "nodejs";

/**
 * Streams the AI routing reasoning for one token, token-by-token.
 * The route page renders instantly (heuristic venues + score bars) and the
 * RoutingReasoning component fetches this so the slow LLM call never blocks
 * the page render. Venue selection mirrors routeDistributionFast exactly.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const resolved = await findEntryBySymbol(decodeURIComponent(symbol));
  if (!resolved) {
    return new Response("Unknown token.", { status: 404 });
  }

  const tokenSymbol = `m${resolved.entry.ticker}`;
  const scores = scoreProtocolsFor(resolved.entry, MOCK_POOLS_TODAY);
  const listings = selectListings(scores, resolved.entry, tokenSymbol);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamDistributionReasoning({
          entry: resolved.entry,
          marketCode: resolved.market,
          listings,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("[reasoning] stream failed:", err);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
