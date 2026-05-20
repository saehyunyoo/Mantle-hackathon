export type DeFiProtocol =
  | 'merchant-moe'
  | 'fluxion'
  | 'agni'
  | 'lendle'
  | 'init-capital';

export type ListingKind = 'amm-pool' | 'collateral' | 'lending-market';

export interface DeFiListing {
  protocol: DeFiProtocol;
  kind: ListingKind;
  listingAddress: string;
  tvlUsd: number;
  volume24hUsd: number;
  url: string;
  reasoning?: string;
}

export interface TokenDistribution {
  tokenSymbol: string;
  tokenAddress: string;
  listings: DeFiListing[];
  routingReasoning: string;
  generatedAt: string;
}
