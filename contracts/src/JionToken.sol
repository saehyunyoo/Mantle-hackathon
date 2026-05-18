// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JionToken — daily synthetic ERC-20
 * @notice One-day-lived synthetic token shadowing an underlying stock price.
 *         Naming convention: `mTICKER-YYYYMMDD` (e.g. `mNVDA-20260518`).
 *
 * Deploy lifecycle:
 *   - Minted by `TokenFactory` once per market per day.
 *   - Initial supply seeded into a `JionPool` for trading.
 *   - 24h after issuance: `Settlement` either keeps alive (volume ≥ $10K)
 *     or force-settles (volume < $10K) and burns this token.
 *
 * Notes:
 *   - Owner = TokenFactory address (set by `transferOwnership` after deploy).
 *   - Only owner can `mint` / `burn` post-deploy.
 */
contract JionToken is ERC20, Ownable {
    /// @notice Underlying ticker symbol (e.g. "NVDA").
    string public underlying;

    /// @notice Market identifier ("NASDAQ" | "KRX" | "TSE").
    string public market;

    /// @notice Unix timestamp of issuance (set in constructor).
    uint256 public immutable issuedAt;

    /// @notice Pyth feed id this token tracks.
    bytes32 public immutable pythFeedId;

    event Issued(address indexed factory, string underlying, uint256 initialSupply);
    event Burned(address indexed holder, uint256 amount);

    /**
     * @param name_         e.g. "Jion NVDA 2026-05-18"
     * @param symbol_       e.g. "mNVDA-20260518"
     * @param underlying_   e.g. "NVDA"
     * @param market_       e.g. "NASDAQ"
     * @param pythFeedId_   bytes32 Pyth Hermes feed id for the underlying
     * @param initialOwner_ initial owner (typically the TokenFactory)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory underlying_,
        string memory market_,
        bytes32 pythFeedId_,
        address initialOwner_
    ) ERC20(name_, symbol_) Ownable(initialOwner_) {
        underlying = underlying_;
        market = market_;
        pythFeedId = pythFeedId_;
        issuedAt = block.timestamp;
        emit Issued(initialOwner_, underlying_, 0);
    }

    /// @notice Owner-only mint (used by factory for initial supply / re-mints).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Owner-only burn (used by Settlement on force-settle).
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit Burned(from, amount);
    }
}
