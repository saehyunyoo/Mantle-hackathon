export type SettlementReason = 'volume-below-threshold' | 'manual';

export interface SettlementEvent {
  tokenSymbol: string;
  tokenAddress: string;
  settledAt: string;
  oraclePrice: number;
  totalSupply: number;
  totalPayoutUsdc: number;
  reason: SettlementReason;
}
