/**
 * Daily settlement job.
 *
 * Owner: 세현
 * Trigger: cron, runs right after the next-day snapshot.
 *
 * Steps:
 *  1. Iterate yesterday's tokens.
 *  2. Read 24h pool volume from on-chain (or subgraph).
 *  3. If volume < $10K → call Settlement.forceSettle(token):
 *       - Pull oracle price
 *       - Convert all token holders to USDC pro-rata
 *       - Withdraw LP, refund LP providers
 *       - Mark token as settled
 *  4. Log to Supabase + emit AgentDecision event.
 */

const THRESHOLD_USD = 10_000;

export async function runDailySettlement() {
  throw new Error(`runDailySettlement not implemented (threshold=$${THRESHOLD_USD})`);
}
