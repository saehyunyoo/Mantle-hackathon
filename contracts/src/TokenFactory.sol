// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TokenFactory (skeleton)
 * @notice Deploys per-day synthetic ERC-20 tokens (mTICKER-YYYYMMDD format).
 * @dev Real implementation TBD in W2. This is a signature stub for FE/API integration.
 */
contract TokenFactory {
    event TokenCreated(
        address indexed token,
        string symbol,
        string underlying,
        uint256 timestamp
    );

    /// @notice Mint a new daily synthetic token.
    /// @dev Owner-only in real impl. Returns deployed token address.
    function createToken(
        string calldata symbol,
        string calldata underlying,
        uint256 initialSupply
    ) external returns (address token) {
        // TODO(W2): deploy ERC-20, seed liquidity, emit event
        revert("not implemented");
    }
}
