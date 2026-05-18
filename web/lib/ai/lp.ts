/**
 * AI LP Optimizer.
 *
 * Owner: 세현
 * W3 deliverable.
 *
 * Input: budget USD + (optional) risk tolerance.
 * Output: allocation weights across today's tokens with expected APR + reasoning.
 */
import type { LPRecommendRequestT, LPRecommendResponseT } from "../types/api";

export async function recommendLPAllocation(
  req: LPRecommendRequestT
): Promise<LPRecommendResponseT> {
  throw new Error(`recommendLPAllocation not implemented (amount=$${req.amountUsd})`);
}
