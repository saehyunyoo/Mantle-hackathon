// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IJionAdapter } from "./IJionAdapter.sol";
import { JionRouter } from "../JionRouter.sol";
import { JionPool } from "../JionPool.sol";

/**
 * @title SelfPoolAdapter — adapter that lists tokens on Jion's own JionPool
 *
 * Phase 1 active adapter. Wraps the in-house Uniswap-V2-style pool so the
 * Distributor sees JionPool as just another DeFi venue, identical interface
 * to the (future) Merchant Moe / Lendle / Fluxion adapters.
 *
 * Position id = the JionPool LP address. `withdraw(positionId)` removes
 * the adapter's LP shares from the pool and returns the tokens back to the
 * caller (typically the Settlement contract).
 */
contract SelfPoolAdapter is IJionAdapter {
    /// @notice Router that owns pool creation + LP movement.
    JionRouter public immutable router;

    /// @notice Volume tracker — populated by an off-chain indexer (T3) or by
    ///         reading on-chain Swap events. Phase 1: caller-pushed via
    ///         setVolume24h (only Distributor / authorized cron).
    mapping(address => uint256) internal _volume24h;

    /// @notice owner == Distributor address; only it can push volume snapshots.
    address public immutable controller;

    error NotController();

    constructor(JionRouter router_, address controller_) {
        router = router_;
        controller = controller_;
    }

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    // ---- IJionAdapter ----

    function name() external pure returns (string memory) {
        return "SelfPool";
    }

    function kind() external pure returns (uint8) {
        return 0; // AMM
    }

    /**
     * @notice Create (or use existing) pool for (token, quote) and add liquidity.
     *         Caller must have transferred amountToken + amountQuote here first.
     *
     * Position id = pool address (cast to bytes32). Lets us look up the pool
     * later from positionId alone.
     */
    function list(
        address token,
        address quote,
        uint256 amountToken,
        uint256 amountQuote
    ) external returns (bytes32 positionId) {
        // Ensure pool exists.
        address pool = router.pairOf(token, quote);
        if (pool == address(0)) {
            pool = router.createPair(token, quote);
        }

        // We're going to add liquidity via Router, which expects allowance.
        IERC20(token).approve(address(router), amountToken);
        IERC20(quote).approve(address(router), amountQuote);

        // Adapter forwards tokens to the router (router pulls via transferFrom).
        // LP shares are minted *to this adapter*, so settlement can later burn.
        router.addLiquidity(token, quote, amountToken, amountQuote, address(this));

        positionId = bytes32(uint256(uint160(pool)));
    }

    /**
     * @notice Burn all adapter-held LP for this pool and return assets to caller.
     *         Caller (typically Settlement) gets the unwrapped token + quote.
     */
    function withdraw(bytes32 positionId)
        external
        returns (uint256 amountTokenOut, uint256 amountQuoteOut)
    {
        address pool = address(uint160(uint256(positionId)));
        uint256 lp = IERC20(pool).balanceOf(address(this));
        if (lp == 0) return (0, 0);

        // Transfer LP into the pool and call burn — pool returns the underlying
        // amounts straight to msg.sender (the Settlement contract).
        IERC20(pool).transfer(pool, lp);
        (uint256 a0, uint256 a1) = JionPool(pool).burn(msg.sender);

        // Caller doesn't need to know token0 vs token1; just return total outs.
        // For now: amount0 = a0, amount1 = a1. Distributor uses both directly.
        return (a0, a1);
    }

    function volume24h(address token) external view returns (uint256) {
        return _volume24h[token];
    }

    function isHealthy() external pure returns (bool) {
        return true;
    }

    // ---- Volume snapshot push (off-chain → on-chain) ----

    /// @notice Off-chain cron pushes daily volume so Settlement can read it
    ///         without needing to walk all Swap events on-chain.
    function setVolume24h(address token, uint256 usd) external onlyController {
        _volume24h[token] = usd;
    }
}
