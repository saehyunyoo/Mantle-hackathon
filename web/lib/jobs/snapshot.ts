/**
 * Daily snapshot job.
 *
 * Owner: 세현
 * Trigger: cron at market open + 1h (NASDAQ 10:30 ET, KRX 10:00 KST, ...).
 *
 * Steps:
 *  1. Polygon.io → top-10 volume tickers
 *  2. Pyth → current oracle price for each
 *  3. Supabase → store snapshot row
 *  4. TokenFactory.createToken(...) for each ticker (on-chain)
 *  5. Seed LP on Merchant Moe pool
 */

export async function runDailySnapshot(opts: { market: "NASDAQ" | "KRX" | "TSE" }) {
  throw new Error(`runDailySnapshot not implemented (market=${opts.market})`);
}
