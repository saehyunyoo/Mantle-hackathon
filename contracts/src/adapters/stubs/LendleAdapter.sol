// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IJionAdapter } from "../IJionAdapter.sol";

/**
 * @title LendleAdapter — stub for Phase 2+
 * Aave-V3 fork lending market on Mantle. When implemented, `list(token, quote, ...)`
 * supplies `token` as a borrowable asset; `withdraw` redeems aTokens.
 */
contract LendleAdapter is IJionAdapter {
    error NotImplemented();

    function name() external pure returns (string memory) { return "Lendle"; }
    function kind() external pure returns (uint8) { return 1; } // LENDING

    function list(address, address, uint256, uint256) external pure returns (bytes32) {
        revert NotImplemented();
    }
    function withdraw(bytes32) external pure returns (uint256, uint256) {
        revert NotImplemented();
    }
    function volume24h(address) external pure returns (uint256) { return 0; }
    function isHealthy() external pure returns (bool) { return false; }
}
