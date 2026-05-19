// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { JionPool } from "./JionPool.sol";

/**
 * @title JionRouter — single user-facing entry point
 * @notice FE / API call this for swap / addLiquidity. Router wraps direct
 *         JionPool calls so callers (영인 T2/T3) never touch pools manually.
 *
 * Lifecycle:
 *   - createPair(t0, t1)  → deploys a fresh JionPool, registers it.
 *   - addLiquidity(...)   → transfers user funds → pool → mint LP.
 *   - swapExactTokensForTokens(...) → transfers user input → pool → swap.
 *
 * Mirrors Uniswap V2 router signatures so production mainnet deploy
 * = swap our pool factory for Merchant Moe V1's. Interface stable.
 */
contract JionRouter {
    /// @notice (token0, token1) → JionPool address. Symmetric.
    mapping(address => mapping(address => address)) public pairOf;

    /// @notice Append-only list of pools for indexers / FE.
    address[] public allPairs;

    /// @notice Deployer; allowed to (optionally) restrict createPair later. Multisig in prod.
    address public admin;

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        uint256 pairIndex
    );
    event LiquidityAdded(
        address indexed pool,
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity
    );
    event SwapExecuted(
        address indexed pool,
        address indexed sender,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed to
    );

    error PoolNotFound();
    error PoolAlreadyExists();
    error InvalidPair();
    error InsufficientOutput();
    error TransferFromFailed();

    constructor(address admin_) {
        admin = admin_;
    }

    // -----------------------------------------------------------------------
    // Pair management
    // -----------------------------------------------------------------------

    /**
     * @notice Deploy a new JionPool for (tokenA, tokenB) and register it.
     *         Permissionless — anyone can create a pool. (Adds resilience for
     *         the testnet demo + Mantle ecosystem alignment with V2 / Moe V1.)
     */
    function createPair(address tokenA, address tokenB) external returns (address pool) {
        if (tokenA == tokenB || tokenA == address(0) || tokenB == address(0)) {
            revert InvalidPair();
        }
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        if (pairOf[token0][token1] != address(0)) revert PoolAlreadyExists();

        JionPool p = new JionPool(token0, token1);
        pool = address(p);

        pairOf[token0][token1] = pool;
        pairOf[token1][token0] = pool;
        allPairs.push(pool);

        emit PairCreated(token0, token1, pool, allPairs.length - 1);
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    // -----------------------------------------------------------------------
    // Add liquidity
    // -----------------------------------------------------------------------

    /**
     * @notice Transfer (amount0, amount1) from sender, deposit into pool,
     *         and mint LP shares to `to`. Pool must already exist (via
     *         createPair).
     *
     * @dev Caller must approve this router for both tokens beforehand.
     *      No slippage protection in this first cut — added in router-v2 PR.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address to
    ) external returns (uint256 liquidity) {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        address pool = pairOf[token0][token1];
        if (pool == address(0)) revert PoolNotFound();

        (uint256 amount0, uint256 amount1) = tokenA == token0
            ? (amountA, amountB)
            : (amountB, amountA);

        _safeTransferFrom(token0, msg.sender, pool, amount0);
        _safeTransferFrom(token1, msg.sender, pool, amount1);
        liquidity = JionPool(pool).mint(to);

        emit LiquidityAdded(pool, msg.sender, amount0, amount1, liquidity);
    }

    // -----------------------------------------------------------------------
    // Swap
    // -----------------------------------------------------------------------

    /**
     * @notice Single-hop swap. Sender approves router for `amountIn` of
     *         `tokenIn` first. Reverts if quoted output < `amountOutMin`.
     */
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut) {
        (address token0, address token1) = _sortTokens(tokenIn, tokenOut);
        address pool = pairOf[token0][token1];
        if (pool == address(0)) revert PoolNotFound();

        (uint112 r0, uint112 r1,) = JionPool(pool).getReserves();
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == token0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));

        amountOut = JionPool(pool).getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut < amountOutMin) revert InsufficientOutput();

        _safeTransferFrom(tokenIn, msg.sender, pool, amountIn);

        (uint256 out0, uint256 out1) = tokenOut == token0
            ? (amountOut, uint256(0))
            : (uint256(0), amountOut);
        JionPool(pool).swap(out0, out1, to);

        emit SwapExecuted(pool, msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /// @notice Quote without performing the swap.
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn)
        external
        view
        returns (uint256 amountOut)
    {
        (address token0, address token1) = _sortTokens(tokenIn, tokenOut);
        address pool = pairOf[token0][token1];
        if (pool == address(0)) revert PoolNotFound();

        (uint112 r0, uint112 r1,) = JionPool(pool).getReserves();
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == token0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));

        amountOut = JionPool(pool).getAmountOut(amountIn, reserveIn, reserveOut);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    function _sortTokens(address a, address b)
        internal
        pure
        returns (address token0, address token1)
    {
        (token0, token1) = a < b ? (a, b) : (b, a);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        if (!(ok && (data.length == 0 || abi.decode(data, (bool))))) {
            revert TransferFromFailed();
        }
    }
}
