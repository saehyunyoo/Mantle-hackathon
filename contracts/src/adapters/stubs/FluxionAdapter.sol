// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IJionAdapter } from "../IJionAdapter.sol";

/**
 * @title FluxionAdapter — stub for Phase 2+
 * Concentrated liquidity AMM on Mantle (V3-style ticks).
 */
contract FluxionAdapter is IJionAdapter {
    error NotImplemented();

    function name() external pure returns (string memory) { return "Fluxion"; }
    function kind() external pure returns (uint8) { return 0; } // AMM

    function list(address, address, uint256, uint256) external pure returns (bytes32) {
        revert NotImplemented();
    }
    function withdraw(bytes32) external pure returns (uint256, uint256) {
        revert NotImplemented();
    }
    function volume24h(address) external pure returns (uint256) { return 0; }
    function isHealthy() external pure returns (bool) { return false; }
}
