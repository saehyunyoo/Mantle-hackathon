export type MarketCode = 'NASDAQ' | 'KRX' | 'TSE' | 'HKEX' | 'LSE';

export interface Market {
  code: MarketCode;
  name: string;
  timezone: string;
  openHour: number;
  snapshotHour: number;
  isMainnet: boolean;
}
