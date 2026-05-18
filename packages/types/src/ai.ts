import type { DexId } from './pool';

export interface RouteHop {
  dex: DexId;
  tokenIn: string;
  tokenOut: string;
  expectedOut: number;
}

export interface RouteQuote {
  id: string;
  fromToken: string;
  toToken: string;
  amountIn: number;
  expectedOut: number;
  slippagePercent: number;
  hops: RouteHop[];
  primaryDex: DexId | 'multi';
  reasoning: string;
  generatedAt: string;
}

export interface LPAllocation {
  tokenSymbol: string;
  tokenAddress: string;
  poolAddress: string;
  percent: number;
  amountUsdc: number;
  expectedAprPercent: number;
}

export interface LPRecommendation {
  id: string;
  totalBudgetUsdc: number;
  allocations: LPAllocation[];
  weightedAprPercent: number;
  reasoning: string;
  generatedAt: string;
}

export type AgentDecisionType = 'route' | 'lp' | 'settle';

export interface AgentDecision {
  id: string;
  type: AgentDecisionType;
  txHash?: string;
  reason: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
