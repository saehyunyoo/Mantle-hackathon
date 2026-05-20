// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IJionAdapter } from "./adapters/IJionAdapter.sol";
import { Distributor } from "./Distributor.sol";

/**
 * @title Settlement — force-settle low-volume tokens across all adapters
 *
 * Demo scenario 4 (per docs/DEMO.md): if a token's combined 24-hour volume
 * across all venues falls below the threshold, this contract:
 *   1. yanks the position back from every adapter (LP / collateral / lending)
 *   2. computes the oracle USD price at settlement
 *   3. takes the 0.5% protocol fee
 *   4. holds the recovered USDC for token holders to claim
 *
 * Holder claim flow:
 *   - holder approves Settlement for their token balance
 *   - calls claim(token) → returns balance × settlementPrice in USDC
 *   - token moves into Settlement custody (effectively retired)
 *
 * Why "claim" instead of push-distribute:
 *   - holder list = O(N) Transfer events to walk on-chain; expensive
 *   - claim is lazy + gas-fair (each holder pays their own gas)
 *   - simpler ownership (no need to make Settlement = TokenFactory owner)
 */
contract Settlement is Ownable, ReentrancyGuard {
    /// @notice Mock-or-real USDC contract (Sepolia: mock USDC on Mantle Sepolia).
    address public immutable usdc;
    Distributor public immutable distributor;

    /// @notice Where the 0.5% protocol fee goes.
    address public feeVault;

    /// @notice 24h USD-volume threshold for staying alive (USDC has 6 decimals
    ///         on most testnets / Mantle mainnet → $10_000 = 10_000 * 1e6).
    uint256 public constant THRESHOLD_USDC = 10_000 * 1e6;

    /// @notice Protocol fee in basis points (50 = 0.5%).
    uint16 public constant FEE_BPS = 50;

    /// @notice Whether a token has been settled. Once settled, irreversible.
    mapping(address => bool) public settled;

    /// @notice settlementPriceUsdc[token] = USDC payout per 1e18 token units
    ///         (i.e. amount of USDC base-units a holder gets per 1.0 token).
    mapping(address => uint256) public settlementPriceUsdc;

    /// @notice settlementPool[token] = total USDC reserved for that token's holders.
    mapping(address => uint256) public settlementPool;

    event Settled(
        address indexed token,
        uint256 totalVolume24h,
        uint256 oraclePriceUsdc,
        uint256 grossUsdc,
        uint256 feeUsdc,
        uint256 netUsdc,
        uint256 timestamp
    );

    event Claimed(
        address indexed token,
        address indexed holder,
        uint256 tokenAmount,
        uint256 usdcPayout
    );

    error AlreadySettled(address token);
    error VolumeAboveThreshold(address token, uint256 total);
    error NoVenues(address token);
    error NotSettled(address token);
    error TransferFailed();

    constructor(
        address usdc_,
        Distributor distributor_,
        address feeVault_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        usdc = usdc_;
        distributor = distributor_;
        feeVault = feeVault_;
    }

    function setFeeVault(address feeVault_) external onlyOwner {
        feeVault = feeVault_;
    }

    // -----------------------------------------------------------------------
    // Force settle
    // -----------------------------------------------------------------------

    /**
     * @notice Sum 24h volume across every adapter `token` is distributed to.
     *         View helper for off-chain monitoring + cron decision.
     */
    function totalVolume24h(address token) public view returns (uint256 total) {
        address[] memory venues = distributor.venuesOf(token);
        for (uint256 i = 0; i < venues.length; i++) {
            total += IJionAdapter(venues[i]).volume24h(token);
        }
    }

    /**
     * @notice Pull `token` back from every adapter, lock USDC for claims.
     *
     * @param token           the JionToken to settle
     * @param oraclePriceUsdc USDC payout per 1e18 token (computed off-chain
     *                        using Pyth right before this call). Caller is
     *                        responsible for fresh price.
     */
    function forceSettle(address token, uint256 oraclePriceUsdc)
        external
        onlyOwner
        nonReentrant
    {
        if (settled[token]) revert AlreadySettled(token);

        uint256 vol = totalVolume24h(token);
        if (vol >= THRESHOLD_USDC) revert VolumeAboveThreshold(token, vol);

        address[] memory venues = distributor.venuesOf(token);
        if (venues.length == 0) revert NoVenues(token);

        uint256 recoveredUsdc;
        for (uint256 i = 0; i < venues.length; i++) {
            recoveredUsdc += _withdrawFromVenue(token, venues[i], oraclePriceUsdc);
        }

        uint256 fee = (recoveredUsdc * uint256(FEE_BPS)) / 10_000;
        uint256 netUsdc = recoveredUsdc - fee;

        if (fee > 0) _safeTransferOut(usdc, feeVault, fee);

        settled[token] = true;
        settlementPriceUsdc[token] = oraclePriceUsdc;
        settlementPool[token] = netUsdc;

        emit Settled(token, vol, oraclePriceUsdc, recoveredUsdc, fee, netUsdc, block.timestamp);
    }

    /**
     * @dev Pull a single adapter position back, convert any received `token`
     *      into a USDC-equivalent amount using the oracle price.
     *
     *      Returns the *USDC equivalent* recovered from this venue. The
     *      adapter is expected to send the actual token + quote back to
     *      this Settlement contract (the caller of `withdraw`).
     */
    function _withdrawFromVenue(address token, address venue, uint256 oraclePriceUsdc)
        internal
        returns (uint256 usdcEquivalent)
    {
        bytes32 positionId = distributor.positionOf(token, venue);
        if (positionId == bytes32(0)) return 0;

        (uint256 amountToken, uint256 amountQuote) =
            IJionAdapter(venue).withdraw(positionId);

        // amountQuote is already USDC; amountToken needs oracle conversion.
        uint256 tokenAsUsdc = (amountToken * oraclePriceUsdc) / 1e18;
        usdcEquivalent = tokenAsUsdc + amountQuote;
    }

    // -----------------------------------------------------------------------
    // Holder claim
    // -----------------------------------------------------------------------

    /**
     * @notice Holder calls claim(token) after Settlement is done.
     *         Holder must approve Settlement for their full token balance first.
     */
    function claim(address token) external nonReentrant returns (uint256 usdcOut) {
        if (!settled[token]) revert NotSettled(token);

        uint256 balance = IERC20(token).balanceOf(msg.sender);
        if (balance == 0) return 0;

        // Pull holder's tokens into Settlement custody (effectively retired).
        _safeTransferFrom(token, msg.sender, address(this), balance);

        usdcOut = (balance * settlementPriceUsdc[token]) / 1e18;
        if (usdcOut > settlementPool[token]) {
            // Edge case: dust accumulates because of rounding. Cap to pool.
            usdcOut = settlementPool[token];
        }
        settlementPool[token] -= usdcOut;

        _safeTransferOut(usdc, msg.sender, usdcOut);

        emit Claimed(token, msg.sender, balance, usdcOut);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    function _safeTransferOut(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!(ok && (data.length == 0 || abi.decode(data, (bool))))) {
            revert TransferFailed();
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount)
        internal
    {
        if (amount == 0) return;
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!(ok && (data.length == 0 || abi.decode(data, (bool))))) {
            revert TransferFailed();
        }
    }
}
