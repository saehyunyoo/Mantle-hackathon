import type { SettlementEvent } from '@jion/types';

export const MOCK_SETTLEMENT_EXAMPLE: SettlementEvent = {
  tokenSymbol: 'mSNAP-20260517',
  tokenAddress: '0xa1aA00000000000000000000000000000000aA99',
  settledAt: '2026-05-18T14:30:00Z',
  oraclePrice: 12.20,
  totalSupply: 8_240,
  totalPayoutUsdc: 100_028,
  reason: 'volume-below-threshold',
};
