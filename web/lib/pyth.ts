/**
 * Pyth Network price feed wrapper.
 *
 * Owner: 세현
 * Used by: API routes (today, route-quote, lp-recommend) and cron jobs.
 *
 * W1 deliverable: signatures committed.
 * W1-W2 deliverable: real impl using Pyth Hermes HTTP API.
 *
 * Docs: https://docs.pyth.network/price-feeds/use-real-time-data/evm
 */

export type PythPrice = {
  /** USD price */
  price: number;
  /** Confidence interval (USD) */
  conf: number;
  /** Unix timestamp (seconds) */
  publishTime: number;
  /** Pyth feed id (32-byte hex) */
  feedId: string;
};

/**
 * Fetch the latest oracle price for a stock symbol.
 *
 * @param symbol Common ticker (e.g. "NVDA", "TSLA"). Maps internally to a Pyth feed id.
 */
export async function fetchPythPrice(symbol: string): Promise<PythPrice> {
  throw new Error(`fetchPythPrice not implemented (symbol=${symbol})`);
}

/**
 * Batch fetch prices for many symbols at once.
 */
export async function fetchPythPrices(symbols: string[]): Promise<Record<string, PythPrice>> {
  throw new Error(`fetchPythPrices not implemented (n=${symbols.length})`);
}
