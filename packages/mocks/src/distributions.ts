import type { TokenDistribution } from '@jion/types';

const generatedAt = '2026-05-20T14:31:00Z';

export const MOCK_DISTRIBUTIONS_TODAY: TokenDistribution[] = [
  {
    tokenSymbol: 'mNVDA-20260520',
    tokenAddress: '0xa1aA00000000000000000000000000000000aA01',
    generatedAt,
    routingReasoning:
      'Volume rank 1 with deep liquidity demand. Seeded into Merchant Moe (deepest USDC pair on Mantle) as primary AMM venue; registered on Lendle as collateral to unlock leveraged exposure for traders.',
    listings: [
      {
        protocol: 'merchant-moe',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB01',
        tvlUsd: 1_280_000,
        volume24hUsd: 482_000,
        url: 'https://merchantmoe.com/pools/0xb2bB...bB01',
        reasoning: 'Primary AMM venue — deepest USDC liquidity on Mantle.',
      },
      {
        protocol: 'lendle',
        kind: 'collateral',
        listingAddress: '0xc3cC00000000000000000000000000000000cC01',
        tvlUsd: 850_000,
        volume24hUsd: 0,
        url: 'https://lendle.xyz/markets/mNVDA',
        reasoning: 'Collateral listing — top-rank token, low volatility-adj LTV 60%.',
      },
    ],
  },
  {
    tokenSymbol: 'mTSLA-20260520',
    tokenAddress: '0xa1aA00000000000000000000000000000000aA02',
    generatedAt,
    routingReasoning:
      'High volatility profile — routed to Fluxion concentrated liquidity for tighter spreads, with a secondary Agni pool to capture cross-venue arb.',
    listings: [
      {
        protocol: 'fluxion',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB02',
        tvlUsd: 840_000,
        volume24hUsd: 215_000,
        url: 'https://fluxion.so/pools/mTSLA',
        reasoning: 'Concentrated liquidity — tight spread for volatile asset.',
      },
      {
        protocol: 'agni',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB12',
        tvlUsd: 320_000,
        volume24hUsd: 88_000,
        url: 'https://agni.finance/pools/mTSLA',
        reasoning: 'Secondary venue — cross-DEX arb capacity.',
      },
    ],
  },
  {
    tokenSymbol: 'mAAPL-20260520',
    tokenAddress: '0xa1aA00000000000000000000000000000000aA03',
    generatedAt,
    routingReasoning:
      'Blue-chip stable profile. Listed on Agni for low-fee swaps and Init Capital for stable-yield lending.',
    listings: [
      {
        protocol: 'agni',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB03',
        tvlUsd: 790_000,
        volume24hUsd: 188_000,
        url: 'https://agni.finance/pools/mAAPL',
      },
      {
        protocol: 'init-capital',
        kind: 'lending-market',
        listingAddress: '0xc3cC00000000000000000000000000000000cC03',
        tvlUsd: 410_000,
        volume24hUsd: 0,
        url: 'https://init.capital/markets/mAAPL',
      },
    ],
  },
  {
    tokenSymbol: 'mMSFT-20260520',
    tokenAddress: '0xa1aA00000000000000000000000000000000aA04',
    generatedAt,
    routingReasoning: 'Mega-cap stable. Single deep Merchant Moe pool — concentration optimal given fee tier.',
    listings: [
      {
        protocol: 'merchant-moe',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB04',
        tvlUsd: 628_000,
        volume24hUsd: 142_000,
        url: 'https://merchantmoe.com/pools/mMSFT',
      },
    ],
  },
  {
    tokenSymbol: 'mAMD-20260520',
    tokenAddress: '0xa1aA00000000000000000000000000000000aA05',
    generatedAt,
    routingReasoning:
      'Semiconductor volatility — Fluxion concentrated liquidity primary, Lendle collateral secondary for leveraged trades.',
    listings: [
      {
        protocol: 'fluxion',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB05',
        tvlUsd: 532_000,
        volume24hUsd: 124_000,
        url: 'https://fluxion.so/pools/mAMD',
      },
      {
        protocol: 'lendle',
        kind: 'collateral',
        listingAddress: '0xc3cC00000000000000000000000000000000cC05',
        tvlUsd: 280_000,
        volume24hUsd: 0,
        url: 'https://lendle.xyz/markets/mAMD',
      },
    ],
  },
];

export const PROTOCOL_LABEL: Record<string, string> = {
  'merchant-moe': 'Merchant Moe',
  fluxion: 'Fluxion',
  agni: 'Agni',
  lendle: 'Lendle',
  'init-capital': 'Init Capital',
};
