/**
 * AI Routing — graph search + Claude reasoning.
 *
 * Owner: 세현
 * W3 deliverable.
 *
 * Strategy:
 *  1. Build a graph of Mantle DEX pools (Merchant Moe, Agni, Fluxion).
 *  2. Dijkstra by effective slippage (weights = price impact + gas).
 *  3. Top-K paths → ask Claude to pick + explain in natural language.
 */
import type { RouteQuoteRequestT, RouteQuoteResponseT } from "../types/api";

export async function computeBestRoute(
  req: RouteQuoteRequestT
): Promise<RouteQuoteResponseT> {
  throw new Error(`computeBestRoute not implemented (in=${req.tokenIn} → out=${req.tokenOut})`);
}
