import type { TokenDistribution } from '@jion/types';

const generatedAt = '2026-05-20T14:31:00Z';

export const MOCK_DISTRIBUTIONS_TODAY: TokenDistribution[] = [
  {
    tokenSymbol: 'mNVDA',
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
    tokenSymbol: 'mTSLA',
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
    tokenSymbol: 'mAAPL',
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
    tokenSymbol: 'mMSFT',
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
    tokenSymbol: 'mAMD',
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

  // ---------------- KRX (Korean equities) ----------------
  {
    tokenSymbol: 'm005930',
    tokenAddress: '0xa1aA00000000000000000000000000000000aB01',
    generatedAt,
    routingReasoning:
      'Korean blue-chip with the deepest 1H volume on KRX. Seeded into Merchant Moe (USDC pair, highest depth) as primary AMM and registered as collateral on Lendle to unlock KRW-equity leveraged exposure.',
    listings: [
      {
        protocol: 'merchant-moe',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB11',
        tvlUsd: 920_000,
        volume24hUsd: 312_000,
        url: 'https://merchantmoe.com/pools/m005930',
        reasoning: 'Primary AMM — top KR ticker, deepest USDC pairing demand.',
      },
      {
        protocol: 'lendle',
        kind: 'collateral',
        listingAddress: '0xc3cC00000000000000000000000000000000cC11',
        tvlUsd: 540_000,
        volume24hUsd: 0,
        url: 'https://lendle.xyz/markets/m005930',
        reasoning: 'Stable mega-cap profile — conservative 65% LTV.',
      },
    ],
  },
  {
    tokenSymbol: 'm000660',
    tokenAddress: '0xa1aA00000000000000000000000000000000aB02',
    generatedAt,
    routingReasoning:
      'Semiconductor volatility — Fluxion concentrated liquidity primary; Lendle collateral for leveraged semis exposure popular with Korean traders.',
    listings: [
      {
        protocol: 'fluxion',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB12',
        tvlUsd: 680_000,
        volume24hUsd: 215_000,
        url: 'https://fluxion.so/pools/m000660',
        reasoning: 'Concentrated liquidity — tight spread for volatile semis.',
      },
      {
        protocol: 'lendle',
        kind: 'collateral',
        listingAddress: '0xc3cC00000000000000000000000000000000cC12',
        tvlUsd: 320_000,
        volume24hUsd: 0,
        url: 'https://lendle.xyz/markets/m000660',
      },
    ],
  },
  {
    tokenSymbol: 'm373220',
    tokenAddress: '0xa1aA00000000000000000000000000000000aB03',
    generatedAt,
    routingReasoning:
      'EV battery sector — stable mid-cap. Agni primary for low-fee swaps; Init Capital lending market for yield-seeking holders.',
    listings: [
      {
        protocol: 'agni',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB13',
        tvlUsd: 510_000,
        volume24hUsd: 142_000,
        url: 'https://agni.finance/pools/m373220',
      },
      {
        protocol: 'init-capital',
        kind: 'lending-market',
        listingAddress: '0xc3cC00000000000000000000000000000000cC13',
        tvlUsd: 260_000,
        volume24hUsd: 0,
        url: 'https://init.capital/markets/m373220',
      },
    ],
  },
  {
    tokenSymbol: 'm207940',
    tokenAddress: '0xa1aA00000000000000000000000000000000aB04',
    generatedAt,
    routingReasoning:
      'High unit price, low volatility — single deep Merchant Moe pool concentrates LP efficiency. No leverage demand at this nominal level yet.',
    listings: [
      {
        protocol: 'merchant-moe',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB14',
        tvlUsd: 420_000,
        volume24hUsd: 88_000,
        url: 'https://merchantmoe.com/pools/m207940',
      },
    ],
  },
  {
    tokenSymbol: 'm005380',
    tokenAddress: '0xa1aA00000000000000000000000000000000aB05',
    generatedAt,
    routingReasoning:
      'Auto industry blue-chip with stable profile — Merchant Moe AMM + Init Capital lending market suit institutional-style positioning.',
    listings: [
      {
        protocol: 'merchant-moe',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB15',
        tvlUsd: 380_000,
        volume24hUsd: 96_000,
        url: 'https://merchantmoe.com/pools/m005380',
      },
      {
        protocol: 'init-capital',
        kind: 'lending-market',
        listingAddress: '0xc3cC00000000000000000000000000000000cC15',
        tvlUsd: 195_000,
        volume24hUsd: 0,
        url: 'https://init.capital/markets/m005380',
      },
    ],
  },

  // ---------------- TSE (Japanese equities) ----------------
  {
    tokenSymbol: 'm7203',
    tokenAddress: '0xa1aA00000000000000000000000000000000aC01',
    generatedAt,
    routingReasoning:
      'Japan mega-cap blue-chip — deepest TSE volume. Merchant Moe USDC pair for global access; Init Capital lending for stable-yield Japan equity exposure.',
    listings: [
      {
        protocol: 'merchant-moe',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB21',
        tvlUsd: 720_000,
        volume24hUsd: 248_000,
        url: 'https://merchantmoe.com/pools/m7203',
        reasoning: 'Primary AMM — Japan blue-chip with stable trading.',
      },
      {
        protocol: 'init-capital',
        kind: 'lending-market',
        listingAddress: '0xc3cC00000000000000000000000000000000cC21',
        tvlUsd: 410_000,
        volume24hUsd: 0,
        url: 'https://init.capital/markets/m7203',
      },
    ],
  },
  {
    tokenSymbol: 'm6758',
    tokenAddress: '0xa1aA00000000000000000000000000000000aC02',
    generatedAt,
    routingReasoning:
      'Tech & media — Fluxion concentrated liquidity captures spread; Lendle collateral for media-sector momentum trades.',
    listings: [
      {
        protocol: 'fluxion',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB22',
        tvlUsd: 540_000,
        volume24hUsd: 168_000,
        url: 'https://fluxion.so/pools/m6758',
      },
      {
        protocol: 'lendle',
        kind: 'collateral',
        listingAddress: '0xc3cC00000000000000000000000000000000cC22',
        tvlUsd: 285_000,
        volume24hUsd: 0,
        url: 'https://lendle.xyz/markets/m6758',
      },
    ],
  },
  {
    tokenSymbol: 'm8035',
    tokenAddress: '0xa1aA00000000000000000000000000000000aC03',
    generatedAt,
    routingReasoning:
      'Semi-equipment volatility — single Fluxion concentrated pool optimal; secondary venues skipped to avoid LP fragmentation.',
    listings: [
      {
        protocol: 'fluxion',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB23',
        tvlUsd: 470_000,
        volume24hUsd: 134_000,
        url: 'https://fluxion.so/pools/m8035',
      },
    ],
  },
  {
    tokenSymbol: 'm6861',
    tokenAddress: '0xa1aA00000000000000000000000000000000aC04',
    generatedAt,
    routingReasoning:
      'High unit-price stable industrial — Merchant Moe deep pool + Init Capital lending. Suitable for buy-and-hold yield strategies.',
    listings: [
      {
        protocol: 'merchant-moe',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB24',
        tvlUsd: 360_000,
        volume24hUsd: 92_000,
        url: 'https://merchantmoe.com/pools/m6861',
      },
      {
        protocol: 'init-capital',
        kind: 'lending-market',
        listingAddress: '0xc3cC00000000000000000000000000000000cC24',
        tvlUsd: 180_000,
        volume24hUsd: 0,
        url: 'https://init.capital/markets/m6861',
      },
    ],
  },
  {
    tokenSymbol: 'm9984',
    tokenAddress: '0xa1aA00000000000000000000000000000000aC05',
    generatedAt,
    routingReasoning:
      'Holding company with high portfolio volatility — Agni AMM + Lendle collateral pairing supports both swap and leverage demand.',
    listings: [
      {
        protocol: 'agni',
        kind: 'amm-pool',
        listingAddress: '0xb2bB00000000000000000000000000000000bB25',
        tvlUsd: 295_000,
        volume24hUsd: 78_000,
        url: 'https://agni.finance/pools/m9984',
      },
      {
        protocol: 'lendle',
        kind: 'collateral',
        listingAddress: '0xc3cC00000000000000000000000000000000cC25',
        tvlUsd: 155_000,
        volume24hUsd: 0,
        url: 'https://lendle.xyz/markets/m9984',
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
