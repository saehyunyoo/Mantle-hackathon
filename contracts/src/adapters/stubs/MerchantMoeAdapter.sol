// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IJionAdapter } from "../IJionAdapter.sol";

/**
 * @title MerchantMoeAdapter — stub for Phase 2+
 *
 * Wraps Merchant Moe V1 (Uniswap V2 fork) + LB 2.2 (Liquidity Book) on Mantle.
 * Real implementation lands when Merchant Moe deploys to Mantle Sepolia, or
 * when the project goes to mainnet.
 *
 * Mainnet contracts (per docs/RESEARCH.md §4):
 *   MoeFactory   0x5bef015ca9424a7c07b68490616a4c1f094bedec
 *   MoeRouter    0xeaEE7EE68874218c3558b40063c42B82D3E7232a
 *   LB Factory   0xa6630671775c4EA2743840F9A5016dCf2A104054
 *
 * Until then this stub compiles, reports unhealthy, and reverts on writes.
 */
contract MerchantMoeAdapter is IJionAdapter {
    error NotImplemented();

    function name() external pure returns (string memory) {
        return "MerchantMoe-V1";
    }

    function kind() external pure returns (uint8) {
        return 0; // AMM
    }

    function list(address, address, uint256, uint256)
        external
        pure
        returns (bytes32)
    {
        revert NotImplemented();
    }

    function withdraw(bytes32) external pure returns (uint256, uint256) {
        revert NotImplemented();
    }

    function volume24h(address) external pure returns (uint256) {
        return 0;
    }

    function isHealthy() external pure returns (bool) {
        return false;
    }
}
