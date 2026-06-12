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
 * Demo scenario 4: if a token's combined 24-hour volume across all venues
 * falls below the threshold, this contract:
 *   1. yanks the position back from every adapter (LP / collateral / lending)
 *   2. takes the 0.5% protocol fee on the recovered USDC
 *   3. records `settlementPool` = (recoveredUSDC - fee)
 *   4. records `circulatingAtSettle` = totalSupply - recoveredToken
 *   5. holders pro-rata claim: (balance / circulatingAtSettle) * settlementPool
 *
 * Why pro-rata on the *real* recovered USDC instead of oracle * balance:
 *   - guarantees the contract is always solvent (it can only pay out what
 *     it has actually received from adapter withdrawals)
 *   - oracle price is still stamped for display / off-chain UIs that want
 *     to show "settled at $X per token"
 *   - if reality matches the oracle the two numbers converge; if reality
 *     diverges (slippage, IL, partial recovery) holders share the haircut
 *     proportionally — same fairness model as Uniswap V2 LP burn.
 *
 * Holder claim flow:
 *   - approve Settlement for token balance
 *   - call claim(token)
 *   - get (balance / circulatingAtSettle) * settlementPool USDC
 *   - your token moves into Settlement custody (retired)
 */
contract Settlement is Ownable, ReentrancyGuard {
    /// @notice USDC contract used to pay holders out. On Sepolia: a mock.
    address public immutable usdc;
    Distributor public immutable distributor;

    /// @notice 0.5% protocol fee target.
    address public feeVault;

    /// @notice 24h USD-volume threshold for staying alive.
    uint256 public constant THRESHOLD_USDC = 10_000 * 1e6;

    /// @notice Protocol fee in basis points (50 = 0.5%).
    uint16 public constant FEE_BPS = 50;

    /// @notice Whether a token has been settled. Once settled, irreversible.
    mapping(address => bool) public settled;

    /// @notice Oracle price stamped at settle (display only — actual payout
    ///         comes from settlementPool / circulatingAtSettle).
    mapping(address => uint256) public settlementPriceUsdc;

    /// @notice USDC reserved for holders of this token (after fee).
    mapping(address => uint256) public settlementPool;

    /// @notice Token amount in circulation at settle (totalSupply minus what
    ///         was already custodied by adapters). Used as denominator in claim.
    mapping(address => uint256) public circulatingAtSettle;

    // -----------------------------------------------------------------------
    // Voluntary redemption (PLAN §4.4 — replaces force-settle as the
    // user-facing exit path; forceSettle/claim above retained for backward
    // compatibility but no longer the recommended lifecycle).
    // -----------------------------------------------------------------------

    /// @notice Redemption fee in basis points (0.5%). Same magnitude as
    ///         force-settle fee — kept here to make the two paths comparable.
    uint16 public constant REDEEM_FEE_BPS = 50;

    /// @notice Admin-set oracle price for each token, in USDC raw units per
    ///         WHOLE token. e.g. NVDA at $145.30 with USDC 6-dec → 145_300_000.
    ///         The off-chain cron mirrors Pyth Hermes into this mapping; the
    ///         on-chain redeem path consumes whatever is set here.
    mapping(address => uint256) public oraclePriceUsdcPerWholeToken;

    /// @notice Cumulative tokens redeemed per JionToken (analytics).
    mapping(address => uint256) public totalRedeemed;

    /// @notice Cumulative USDC paid out per JionToken (net of fee, analytics).
    mapping(address => uint256) public totalUsdcRedeemed;

    event OraclePriceSet(address indexed token, uint256 priceUsdcPerWholeToken);

    event Redeemed(
        address indexed token,
        address indexed holder,
        uint256 tokenAmount,
        uint256 oraclePriceUsdc,
        uint256 grossUsdc,
        uint256 fee,
        uint256 netUsdcOut,
        uint256 recoveredFromAdaptersToken,
        uint256 recoveredFromAdaptersQuote,
        uint256 timestamp
    );

    error ZeroAmount();
    error NoOraclePrice(address token);
    error InsufficientLiquidity(uint256 requested, uint256 available);

    event Settled(
        address indexed token,
        uint256 totalVolume24h,
        uint256 oraclePriceUsdc,
        uint256 recoveredUsdc,
        uint256 recoveredToken,
        uint256 feeUsdc,
        uint256 netUsdc,
        uint256 circulating,
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

    /// @notice Owner mirrors today's Pyth price into the contract so the
    ///         `redeem` path can be a single user transaction (no Hermes
    ///         payload inside the user's wallet). One write per token per
    ///         price update (typically each market open).
    function setOraclePrice(address token, uint256 priceUsdcPerWholeToken)
        external
        onlyOwner
    {
        oraclePriceUsdcPerWholeToken[token] = priceUsdcPerWholeToken;
        emit OraclePriceSet(token, priceUsdcPerWholeToken);
    }

    /// @notice Convenience: set prices for many tokens in one transaction
    ///         (e.g. cron after a top-10 snapshot).
    function setOraclePrices(address[] calldata tokens, uint256[] calldata prices)
        external
        onlyOwner
    {
        require(tokens.length == prices.length, "length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            oraclePriceUsdcPerWholeToken[tokens[i]] = prices[i];
            emit OraclePriceSet(tokens[i], prices[i]);
        }
    }

    // -----------------------------------------------------------------------
    // Aggregate view
    // -----------------------------------------------------------------------

    function totalVolume24h(address token) public view returns (uint256 total) {
        address[] memory venues = distributor.venuesOf(token);
        for (uint256 i = 0; i < venues.length; i++) {
            total += IJionAdapter(venues[i]).volume24h(token);
        }
    }

    // -----------------------------------------------------------------------
    // Force settle
    // -----------------------------------------------------------------------

    /**
     * @notice Force-settle `token`. Owner only.
     *
     * @param token           the JionToken to settle
     * @param oraclePriceUsdc stamped for display; not used for payouts
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

        (uint256 recoveredToken, uint256 recoveredUsdc) =
            _unwindAllVenues(token, venues);

        uint256 fee = (recoveredUsdc * uint256(FEE_BPS)) / 10_000;
        uint256 netUsdc = recoveredUsdc - fee;
        if (fee > 0) _safeTransferOut(usdc, feeVault, fee);

        uint256 totalSupply_ = IERC20(token).totalSupply();
        uint256 circ = totalSupply_ > recoveredToken
            ? totalSupply_ - recoveredToken
            : 0;

        settled[token] = true;
        settlementPriceUsdc[token] = oraclePriceUsdc;
        settlementPool[token] = netUsdc;
        circulatingAtSettle[token] = circ;

        emit Settled(
            token,
            vol,
            oraclePriceUsdc,
            recoveredUsdc,
            recoveredToken,
            fee,
            netUsdc,
            circ,
            block.timestamp
        );
    }

    /// @dev Pull positions back from every venue. Extracted to keep stack
    ///      depth manageable.
    function _unwindAllVenues(address token, address[] memory venues)
        internal
        returns (uint256 totalToken, uint256 totalQuote)
    {
        for (uint256 i = 0; i < venues.length; i++) {
            bytes32 positionId = distributor.positionOf(token, venues[i]);
            if (positionId == bytes32(0)) continue;
            (uint256 amountToken, uint256 amountQuote) =
                IJionAdapter(venues[i]).withdraw(positionId);
            totalToken += amountToken;
            totalQuote += amountQuote;
        }
    }

    // -----------------------------------------------------------------------
    // Holder claim
    // -----------------------------------------------------------------------

    /**
     * @notice Holder calls claim(token) after settle. Approve first.
     * @return usdcOut total USDC paid to the holder.
     */
    function claim(address token) external nonReentrant returns (uint256 usdcOut) {
        if (!settled[token]) revert NotSettled(token);

        uint256 balance = IERC20(token).balanceOf(msg.sender);
        if (balance == 0) return 0;

        uint256 circ = circulatingAtSettle[token];
        if (circ == 0) return 0;

        usdcOut = (balance * settlementPool[token]) / circ;
        if (usdcOut > settlementPool[token]) usdcOut = settlementPool[token];

        settlementPool[token] -= usdcOut;
        circulatingAtSettle[token] -= balance;

        _safeTransferFrom(token, msg.sender, address(this), balance);
        _safeTransferOut(usdc, msg.sender, usdcOut);

        emit Claimed(token, msg.sender, balance, usdcOut);
    }

    // -----------------------------------------------------------------------
    // Voluntary redemption (PLAN §4.4)
    // -----------------------------------------------------------------------

    /**
     * @notice Holder calls `redeem(token, amount)` to swap mTICKER for USDC
     *         at the oracle price set by the owner. Always available — no
     *         volume threshold, no grace period.
     *
     * Flow:
     *   1. Holder approves Settlement for `amount` of the token.
     *   2. Settlement pulls the token in (effective custody).
     *   3. Settlement reads `oraclePriceUsdcPerWholeToken[token]`.
     *   4. grossUsdc = (amount × price) / 1e18  (token 18-dec → USDC 6-dec)
     *   5. fee = grossUsdc × REDEEM_FEE_BPS / 10000  → feeVault
     *   6. Best-effort: Settlement asks Distributor to unwind the token's
     *      adapter positions (`unwindProportional`). Recovered values are
     *      stamped in the event for transparency but the payout to the holder
     *      uses Settlement's own USDC balance — guarantees solvency even when
     *      adapters are illiquid.
     *   7. netUsdcOut → holder. Reverts if Settlement is underfunded.
     *
     * Notes:
     *   - Tokens received by Settlement are NOT burned (no JionToken.burn
     *     surface). They are effectively locked here — equivalent to retired
     *     supply. A future TokenFactory could expose a Settlement-only burn.
     */
    function redeem(address token, uint256 amount)
        external
        nonReentrant
        returns (uint256 usdcOut)
    {
        if (amount == 0) revert ZeroAmount();

        uint256 price = oraclePriceUsdcPerWholeToken[token];
        if (price == 0) revert NoOraclePrice(token);

        // 1. Pull tokens from holder
        _safeTransferFrom(token, msg.sender, address(this), amount);

        // 2. Gross USDC at oracle price (token 18-dec, USDC 6-dec, price already
        //    USDC raw units per whole token)
        uint256 grossUsdc = (amount * price) / 1e18;

        // 3. Fee
        uint256 fee = (grossUsdc * uint256(REDEEM_FEE_BPS)) / 10_000;
        usdcOut = grossUsdc - fee;

        // 4. Best-effort adapter unwind (recovered amounts surface in event
        //    only; actual payout comes from Settlement's USDC balance below).
        uint256 recoveredToken;
        uint256 recoveredQuote;
        try distributor.unwindProportional(token, 10_000) returns (
            uint256 t,
            uint256 q
        ) {
            recoveredToken = t;
            recoveredQuote = q;
        } catch {
            // ignore — Settlement must be solvent in its own right
        }

        // 5. Solvency check + payout
        uint256 bal = IERC20(usdc).balanceOf(address(this));
        if (bal < grossUsdc) {
            revert InsufficientLiquidity(grossUsdc, bal);
        }
        if (fee > 0) _safeTransferOut(usdc, feeVault, fee);
        _safeTransferOut(usdc, msg.sender, usdcOut);

        // 6. Analytics
        totalRedeemed[token] += amount;
        totalUsdcRedeemed[token] += usdcOut;

        emit Redeemed(
            token,
            msg.sender,
            amount,
            price,
            grossUsdc,
            fee,
            usdcOut,
            recoveredToken,
            recoveredQuote,
            block.timestamp
        );
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
