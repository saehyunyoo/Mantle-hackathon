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
