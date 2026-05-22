/**
 * Jion supply policy — rank-tier issuance.
 *
 * Spec: docs/TOKEN_STANDARD.md §2.3.
 *
 * Single source of truth for how many units of a Jion-issued daily synth get
 * minted at issuance time. The TokenFactory contract is policy-agnostic —
 * `issue()` accepts `initialSupply` from the caller — so this module is what
 * the cron signer, deploy scripts, and tests all import.
 *
 * Per-market daily total: 3M + 2×2M + 7×1M = 14M mTICKER.
 * Across NASDAQ + KRX + TSE: 42M mTICKER/day.
 */

/** Base supply for a rank-#4..#10 token, in whole units (pre-decimals). */
export const BASE_SUPPLY_UNITS = BigInt(1_000_000);

/** Decimals used by every JionToken (matches OpenZeppelin ERC20 default). */
export const JION_TOKEN_DECIMALS = 18;

/**
 * Rank-tier multiplier. Multiplies BASE_SUPPLY_UNITS to produce the final
 * mint amount (still in whole units, before decimals scaling).
 */
export function rankMultiplier(rank: number): 1 | 2 | 3 {
  if (rank === 1) return 3;
  if (rank === 2 || rank === 3) return 2;
  return 1;
}

/**
 * Initial supply in whole units (e.g. `3_000_000n` for rank #1).
 * Call `withDecimals()` to convert to the wei-style amount the contract expects.
 */
export function computeInitialSupplyUnits(rank: number): bigint {
  return BASE_SUPPLY_UNITS * BigInt(rankMultiplier(rank));
}

/**
 * Initial supply in token wei (i.e. units × 10**decimals). This is what gets
 * passed as `initialSupply` to `TokenFactory.issue(...)`.
 */
export function computeInitialSupply(rank: number): bigint {
  return computeInitialSupplyUnits(rank) * BigInt(10) ** BigInt(JION_TOKEN_DECIMALS);
}
