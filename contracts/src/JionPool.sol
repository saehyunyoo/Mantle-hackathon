// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title JionPool — minimal Uniswap V2-style constant-product pool
 * @notice One pool per (token0, token1). Token0 is always a JionToken,
 *         Token1 is always the quote (USDC mock or testnet stable).
 *
 * Why a self-rolled V2 fork instead of Merchant Moe:
 *   - Merchant Moe is mainnet-only (per docs/RESEARCH.md §4).
 *   - Sepolia demo needs a working AMM for T2 / T3.
 *   - Interface mirrors Merchant Moe V1 (createPair / addLiquidity / swap),
 *     so production mainnet deploy = swap router only.
 *
 * Scope of this commit (W2 step 1/3):
 *   - mint() implemented (first + subsequent liquidity, V2 math)
 *   - _update() reserve sync helper
 *   - burn() / swap() still stubbed; landed in follow-up PRs.
 *   - No cumulative price oracle (Pyth handles that off-chain).
 */
contract JionPool is ERC20, ReentrancyGuard {
    address public immutable token0;
    address public immutable token1;
    address public immutable factory;

    uint112 public reserve0;
    uint112 public reserve1;
    uint32  public blockTimestampLast;

    /// @notice LP fee in basis points (30 = 0.3%). Used by swap() in PR3.
    uint16 public constant FEE_BPS = 30;

    /// @notice Minimum LP shares burned on first mint (V2 standard).
    /// Permanently locks dust to prevent first-LP price griefing.
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    /// @dev Where the locked MINIMUM_LIQUIDITY goes. address(0) would revert ERC20._mint;
    /// any address with no private key works. Use the common dead address.
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

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
    error ReservesOverflow();

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

    /**
     * @notice Mint LP shares to `to` proportional to deposited token0/token1.
     *         Caller must transfer tokens to this pool BEFORE calling mint().
     *
     * Math:
     *   - First mint: liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY,
     *                 MINIMUM_LIQUIDITY burned (sent to DEAD) once and never again.
     *   - Subsequent: liquidity = min(
     *                   amount0 * totalSupply / reserve0,
     *                   amount1 * totalSupply / reserve1
     *                 )
     *
     * @param to recipient of LP shares
     */
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        uint112 _reserve0 = reserve0;
        uint112 _reserve1 = reserve1;
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - uint256(_reserve0);
        uint256 amount1 = balance1 - uint256(_reserve1);

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(DEAD, MINIMUM_LIQUIDITY); // lock forever
        } else {
            liquidity = Math.min(
                (amount0 * _totalSupply) / uint256(_reserve0),
                (amount1 * _totalSupply) / uint256(_reserve1)
            );
        }
        if (liquidity == 0) revert InsufficientLiquidity();
        _mint(to, liquidity);

        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @notice Burn LP shares held by this pool (caller transferred them in)
     *         and return proportional token0 + token1 to `to`.
     *
     * Math (V2):
     *   liquidity   = LP shares currently sitting in this contract
     *   amount0_out = liquidity * balance0 / totalSupply
     *   amount1_out = liquidity * balance1 / totalSupply
     *
     * Pattern: caller (typically JionRouter) transfers their LP into this
     * pool first, then calls burn(to). The pool burns those LP shares and
     * sends out the underlying tokens.
     *
     * @param to recipient of the underlying token0 + token1
     */
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        _burn(address(this), liquidity);
        _safeTransfer(token0, to, amount0);
        _safeTransfer(token1, to, amount1);

        // refresh reserves from post-transfer balances
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );

        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @notice V2-style constant-product swap with 0.3% LP fee.
     *
     * Pattern (must be done by router atomically):
     *   1. Caller transfers `amountIn` of input token to this pool.
     *   2. Caller calls `swap(amount0Out, amount1Out, to)` with the
     *      pre-computed output amount (see `getAmountOut`).
     *   3. Pool optimistically sends `amountXOut` to `to`, then verifies
     *      the constant-product invariant including the 0.3% fee.
     *
     * Invariant (V2 standard, fee = 30 bps):
     *   (balance0 * 1000 - amount0In * FEE_BPS) *
     *   (balance1 * 1000 - amount1In * FEE_BPS)
     *     >= reserve0 * reserve1 * 1_000_000
     *
     * @param amount0Out amount of token0 to send out (0 if buying token0)
     * @param amount1Out amount of token1 to send out (0 if buying token1)
     * @param to recipient of the output token
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to)
        external
        nonReentrant
    {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutput();
        uint112 _reserve0 = reserve0;
        uint112 _reserve1 = reserve1;
        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) {
            revert InsufficientLiquidity();
        }

        // Send out first (optimistic), then validate against post-balances.
        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        // Infer how much of each token was deposited by the caller before the call.
        uint256 amount0In = balance0 + amount0Out > uint256(_reserve0)
            ? balance0 + amount0Out - uint256(_reserve0)
            : 0;
        uint256 amount1In = balance1 + amount1Out > uint256(_reserve1)
            ? balance1 + amount1Out - uint256(_reserve1)
            : 0;
        if (amount0In == 0 && amount1In == 0) revert InsufficientInput();

        // Adjusted balances net of fee — invariant must hold against old reserves.
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * uint256(FEE_BPS);
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * uint256(FEE_BPS);
        if (
            balance0Adjusted * balance1Adjusted
                < uint256(_reserve0) * uint256(_reserve1) * (1000 * 1000)
        ) {
            revert K();
        }

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /**
     * @notice Pure quote helper — given an input amount and pair reserves,
     *         return how much output the pool would give after the 0.3% fee.
     *
     * Formula (V2):
     *   amountInWithFee = amountIn * (1000 - FEE_BPS)
     *   amountOut       = amountInWithFee * reserveOut
     *                       / (reserveIn * 1000 + amountInWithFee)
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        if (amountIn == 0) revert InsufficientInput();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 amountInWithFee = amountIn * (1000 - uint256(30)); // FEE_BPS hard-cast for pure
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Force reserves to match actual balances (e.g. after donation).
    function sync() external nonReentrant {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
    }

    /// @notice Read current reserves + last update timestamp.
    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    /// @dev Refresh reserves from balances. Caps to uint112; reverts on overflow.
    function _update(uint256 balance0, uint256 balance1) internal {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) {
            revert ReservesOverflow();
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = uint32(block.timestamp);
        emit Sync(reserve0, reserve1);
    }

    /// @dev ERC-20 transfer that surfaces both `revert` and `return false`.
    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "JP: TRANSFER_FAILED");
    }
}
