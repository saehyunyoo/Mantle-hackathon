// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { JionPool } from "./JionPool.sol";

/**
 * @title JionRouter — single user-facing entry point
 * @notice FE / API call this for swap / addLiquidity / removeLiquidity.
 *         Wraps JionPool calls so callers never touch pools directly.
 *
 * Mirrors Uniswap V2 router signatures so we can swap our pool out for
 * Merchant Moe V1 on mainnet by changing the pool address only.
 *
 * Skeleton scope:
 *   - Public surface only. W2 fills in math.
 */
contract JionRouter {
    /// @notice Maps (token0, token1) → JionPool address. Set by factory after pair creation.
    mapping(address => mapping(address => address)) public pairOf;

    /// @notice The deployer wallet (admin for pair registration). Multisig later.
    address public admin;

    event PairRegistered(address indexed token0, address indexed token1, address pool);

    error PoolNotFound();
    error NotAdmin();

    constructor(address admin_) {
        admin = admin_;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /// @notice Called by TokenFactory (or admin) after deploying a JionPool.
    function registerPair(address token0, address token1, address pool) external onlyAdmin {
        pairOf[token0][token1] = pool;
        pairOf[token1][token0] = pool;
        emit PairRegistered(token0, token1, pool);
    }

    /// @notice Add liquidity to an existing pool. (Pool must be pre-registered.)
    function addLiquidity(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired,
        address to
    ) external returns (uint256 amount0, uint256 amount1, uint256 liquidity) {
        token0; token1; amount0Desired; amount1Desired; to;
        revert("JionRouter.addLiquidity: not implemented");
    }

    /// @notice Single-hop swap. Caller approves `amountIn` of `tokenIn` first.
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut) {
        tokenIn; tokenOut; amountIn; amountOutMin; to;
        revert("JionRouter.swapExactTokensForTokens: not implemented");
    }

    /// @notice Quote helper — pure view, no side effects.
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        tokenIn; tokenOut; amountIn;
        revert("JionRouter.getAmountOut: not implemented");
    }
}
