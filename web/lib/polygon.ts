/**
 * Polygon.io stock data wrapper.
 *
 * Owner: 세현
 * Used by: cron jobs (daily snapshot) and API routes (today).
 *
 * Docs: https://polygon.io/docs/stocks/getting-started
 */
import type { Market } from "./types/api";

export type VolumeEntry = {
  ticker: string;
  volume: number;
  price: number;
  vwap?: number;
  trades?: number;
};

/**
 * Get the top-N tickers by trading volume for a given market.
 *
 * @param market 'NASDAQ' | 'KRX' | 'TSE'
 * @param limit  default 10
 */
export async function fetchTopVolume(
  market: Market,
  limit: number = 10
): Promise<VolumeEntry[]> {
  throw new Error(`fetchTopVolume not implemented (market=${market}, limit=${limit})`);
}

/**
 * Get yesterday's close price for backtesting / settlement.
 */
export async function fetchYesterdayClose(ticker: string): Promise<number> {
  throw new Error(`fetchYesterdayClose not implemented (ticker=${ticker})`);
}
