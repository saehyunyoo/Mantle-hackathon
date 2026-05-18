/**
 * Deployed contract addresses per chain.
 *
 * Update after every deploy. See contracts/script/Deploy.s.sol.
 */
export const MANTLE_SEPOLIA = {
  chainId: 5003,
  TokenFactory: "0x0000000000000000000000000000000000000000",
  OracleAdapter: "0x0000000000000000000000000000000000000000",
  Settlement: "0x0000000000000000000000000000000000000000",
  AgentLogger: "0x0000000000000000000000000000000000000000",
  Router: "0x0000000000000000000000000000000000000000",
} as const;
