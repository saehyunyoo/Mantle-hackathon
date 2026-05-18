// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title JionPool — minimal Uniswap V2-style constant-product pool
 * @notice One pool per (token0, token1). Token0 is always a JionToken,
 *         Token1 is always the quote (USDC mock or testnet stable).
 *
 * Why we built our own V2 fork instead of Merchant Moe:
 *   - Merchant Moe is mainnet-only (per docs/RESEARCH.md §4).
 *   - Sepolia demo needs a working AMM for T2 / T3.
 *   - Interface mirrors Merchant Moe V1 (createPair / addLiquidity / swap),
 *     so production mainnet deploy = swap router only.
 *
 * Skeleton scope:
 *   - This file declares the public surface + state.
 *   - W2 implements x*y=k math + LP-share minting + 0.3% fee.
 *   - No flash-swap, no fee-on-transfer support.
 */
contract JionPool is ERC20, ReentrancyGuard {
    address public immutable token0;
    address public immutable token1;
    address public immutable factory;

    uint112 public reserve0;
    uint112 public reserve1;
    uint32  public blockTimestampLast;

    /// @notice Cumulative fee % paid to LPs (basis points, 30 = 0.3%).
    uint16 public constant FEE_BPS = 30;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    error InvalidPair();
    error InsufficientLiquidity();
    error InsufficientInput();
    error InsufficientOutput();
    error K();

    constructor(address token0_, address token1_)
        ERC20("Jion LP", "JLP")
    {
        if (token0_ == address(0) || token1_ == address(0) || token0_ == token1_) {
            revert InvalidPair();
        }
        token0 = token0_;
        token1 = token1_;
        factory = msg.sender;
    }

    /// @notice Deposit token0 + token1 in current ratio → mint LP shares to `to`.
    /// @dev TODO(W2): implement V2 math (sqrt(amount0 * amount1) on first mint).
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        to; // silence unused
        revert("JionPool.mint: not implemented");
    }

    /// @notice Burn LP shares held by this pool → return token0 + token1 to `to`.
    /// @dev TODO(W2).
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        to;
        revert("JionPool.burn: not implemented");
    }

    /// @notice Swap with explicit out amounts. Caller must pre-deposit input.
    /// @dev TODO(W2): enforce reserve invariants + 0.3% fee.
    function swap(uint256 amount0Out, uint256 amount1Out, address to)
        external
        nonReentrant
    {
        amount0Out; amount1Out; to;
        revert("JionPool.swap: not implemented");
    }

    /// @notice Push reserves to actual balances. Used after donations.
    function sync() external {
        revert("JionPool.sync: not implemented");
    }

    /// @notice Read current reserves.
    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }
}
