import type { MarketCode } from './market';

export type PriceSource = 'pyth' | 'chainlink' | 'mock';

export interface OraclePriceFeed {
  tokenSymbol: string;
  ticker: string;
  name: string;
  market: MarketCode;
  source: PriceSource;
  feedId: string;
  price: number;
  prevPrice: number;
  updatedAt: string;
}
