import type { AgentDecision, LPRecommendation, RouteQuote } from '@jion/types';

export const MOCK_ROUTE_QUOTE: RouteQuote = {
  id: 'rq-2026-05-18-001',
  fromToken: 'USDC',
  toToken: '0xa1aA00000000000000000000000000000000aA01',
  amountIn: 100,
  expectedOut: 0.10538,
  slippagePercent: 0.18,
  hops: [
    {
      dex: 'merchant-moe',
      tokenIn: 'USDC',
      tokenOut: '0xa1aA00000000000000000000000000000000aA01',
      expectedOut: 0.10538,
    },
  ],
  primaryDex: 'merchant-moe',
  reasoning:
    'Merchant Moe 직접 스왑이 Fluxion(0.32% 슬리피지)·Agni(0.47%)보다 0.14~0.29%p 낮음. 풀 깊이 $11.78M로 $100 거래는 즉시 체결 가능.',
  generatedAt: '2026-05-18T15:02:11Z',
};

export const MOCK_LP_RECOMMENDATION: LPRecommendation = {
  id: 'lp-2026-05-18-001',
  totalBudgetUsdc: 1_000,
  weightedAprPercent: 15.6,
  allocations: [
    {
      tokenSymbol: 'mNVDA-20260518',
      tokenAddress: '0xa1aA00000000000000000000000000000000aA01',
      poolAddress: '0xb2bB00000000000000000000000000000000bB01',
      percent: 60,
      amountUsdc: 600,
      expectedAprPercent: 18.4,
    },
    {
      tokenSymbol: 'mTSLA-20260518',
      tokenAddress: '0xa1aA00000000000000000000000000000000aA02',
      poolAddress: '0xb2bB00000000000000000000000000000000bB02',
      percent: 30,
      amountUsdc: 300,
      expectedAprPercent: 12.1,
    },
    {
      tokenSymbol: 'mAAPL-20260518',
      tokenAddress: '0xa1aA00000000000000000000000000000000aA03',
      poolAddress: '0xb2bB00000000000000000000000000000000bB03',
      percent: 10,
      amountUsdc: 100,
      expectedAprPercent: 10.8,
    },
  ],
  reasoning:
    'mNVDA는 거래량 1위(거래수수료 APR 18.4%)+풀 깊이 충분으로 가중 최대. mTSLA·mAAPL은 변동성 헷지용. 단일 풀 집중 리스크 회피 위해 분산.',
  generatedAt: '2026-05-18T15:05:22Z',
};

export const MOCK_AGENT_DECISIONS: AgentDecision[] = [
  {
    id: 'ad-2026-05-18-001',
    type: 'route',
    txHash: '0xc1cC00000000000000000000000000000000cC01',
    reason: 'Merchant Moe direct swap, lowest slippage 0.18%',
    payload: { routeQuoteId: 'rq-2026-05-18-001' },
    createdAt: '2026-05-18T15:02:14Z',
  },
  {
    id: 'ad-2026-05-18-002',
    type: 'lp',
    txHash: '0xc1cC00000000000000000000000000000000cC02',
    reason: 'Top-volume weighted allocation, 3-pool diversification',
    payload: { lpRecommendationId: 'lp-2026-05-18-001' },
    createdAt: '2026-05-18T15:05:25Z',
  },
];
