import type { MarketCode } from './market';

export interface SnapshotEntry {
  rank: number;
  ticker: string;
  name: string;
  volume1h: number;
  price: number;
}

export interface MarketSnapshot {
  id: string;
  market: MarketCode;
  capturedAt: string;
  entries: SnapshotEntry[];
}
