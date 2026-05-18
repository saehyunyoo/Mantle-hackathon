export type DexId = 'fluxion' | 'merchant-moe' | 'agni';

export interface Pool {
  tokenAddress: string;
  pairAddress: string;
  dex: DexId;
  reserveToken: number;
  reserveUsdc: number;
  volume24h: number;
  feeApr: number;
  lpSupply: number;
}
