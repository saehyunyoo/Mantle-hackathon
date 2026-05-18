import type { MarketCode } from './market';

export type TokenStatus = 'active' | 'settled';

export interface JionToken {
  symbol: string;
  ticker: string;
  name: string;
  market: MarketCode;
  address: string;
  issuedAt: string;
  initialPrice: number;
  currentPrice: number;
  status: TokenStatus;
  settledAt?: string;
  settlementPrice?: number;
}
