/**
 * Deployed contract addresses per chain.
 *
 * Updated: 2026-05-20
 * Source: contracts/broadcast/Deploy.s.sol/5003/run-latest.json
 *
 * Mantle Sepolia first deploy.
 * Re-run `forge script script/Deploy.s.sol:DeployScript --broadcast` to
 * redeploy, then regenerate this file from run-latest.json.
 */

export const MANTLE_SEPOLIA_CHAIN_ID = 5003 as const;

/** Pyth Network on Mantle Sepolia (per docs/RESEARCH.md §1.1) */
export const MANTLE_SEPOLIA_PYTH =
  '0x98046Bd286715D3B0BC227Dd7a956b83D8978603' as const;

/** Deployer / signer wallet for cron jobs and admin operations. */
export const MANTLE_SEPOLIA_DEPLOYER =
  '0x74Ce253E373A17584263ef55E05513AbfE55CaAe' as const;

/**
 * Jion core + adapter deployments on Mantle Sepolia.
 * String keys mirror the contract name (camelCase variants in FE if needed).
 */
export const MANTLE_SEPOLIA_ADDRESSES = {
  // ---- Core ----
  TokenFactory: '0x2eb123aedc45b26a5a04247af3790c5df113e2ae',
  OracleAdapter: '0xcd847aa6e047a4c9121ad1e868e847322aaed29b',
  AgentLogger: '0x77edbfacfc302f01aba5d25ece57c5dc69dcb2e5',
  JionRouter: '0x08b3b7b4327c6bb464ef6c9ec84667731c0620d6',
  Distributor: '0x28656c984ac361fe1a31cd4e13c28d97dc838cf6',
  /**
   * Settlement v2 — re-deployed 2026-05-21 with MockUSDC wired in
   * (immutable `usdc` field forced the redeploy). Old v1 at
   * 0x1df047a67952f7c81d78324e968b4381c5513a70 is left on-chain but
   * no longer referenced anywhere.
   */
  Settlement: '0xe11527fe1939c8827cc09690fd62b03950dda3ef',

  // ---- Adapters ----
  SelfPoolAdapter: '0x6e9bcc3409efaf8b220d549125973cb0f180b7e2',
  MerchantMoeMockAdapter: '0xde7d132a2eeb0222fdfca58ea9e25ae78a47e9e4',
  LendleMockAdapter: '0x7582ccc516ee587b3cc09541d8630ae4ebf8be9b',

  // ---- External integrations ----
  Pyth: MANTLE_SEPOLIA_PYTH,
  /**
   * Mock USDC for the Sepolia demo. Deployed by DeployUsdcAndSettlement.s.sol
   * on 2026-05-21. 6 decimals + public 1M-per-call faucet (anyone can mint).
   * Frontend MUST label this as "Mock USDC (testnet)".
   */
  USDC: '0x9719d0f8e2b766b842d8c810a314ace9de9f6e28',
} as const;

export type JionContractName = keyof typeof MANTLE_SEPOLIA_ADDRESSES;

/** Convenience: get a contract address with type-narrowed name. */
export function getAddress(name: JionContractName): string {
  return MANTLE_SEPOLIA_ADDRESSES[name];
}
