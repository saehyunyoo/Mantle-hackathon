// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC — demo-only USDC for Mantle Sepolia
 *
 * On Mantle Sepolia there is no real USDC contract we can rely on. To unblock
 * Settlement.claim() and the AI Distribution Routing demo we ship a minimal
 * mock with:
 *   - 6 decimals (matches real USDC)
 *   - public faucet (anyone can mint up to 1M per call, easy demo setup)
 *   - owner-only mint without cap (for seeding LP pools)
 *
 * Frontend MUST label this as "Mock USDC (testnet)" — never confuse with
 * the real Circle USDC.
 */
contract MockUSDC is ERC20, Ownable {
    /// @notice Per-call faucet limit (1M USDC = 1_000_000 * 1e6).
    uint256 public constant FAUCET_LIMIT = 1_000_000 * 1e6;

    error FaucetLimitExceeded();

    constructor(address initialOwner_) ERC20("Mock USDC", "mUSDC") Ownable(initialOwner_) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Open faucet for demo use. Anyone can mint up to FAUCET_LIMIT per call.
    function faucet(uint256 amount) external {
        if (amount > FAUCET_LIMIT) revert FaucetLimitExceeded();
        _mint(msg.sender, amount);
    }

    /// @notice Owner can seed any amount (e.g. LP pools, Settlement pool).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
