// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IJionAdapter } from "./adapters/IJionAdapter.sol";

/**
 * @title Distributor — fan out a newly issued token to multiple venues
 *
 * Lifecycle:
 *   1. TokenFactory mints a daily synth (mNVDA, mTSLA, ...) and sends its
 *      initial supply to the Distributor along with an equivalent USDC seed.
 *   2. Distributor receives an off-chain plan from the AI router:
 *        [(adapter, weight_bps), ...]  (weights sum to <= 10000)
 *   3. For each (adapter, weight), Distributor:
 *        a. transfers weight * amountToken / 10000 of token to the adapter
 *        b. transfers weight * amountQuote / 10000 of quote to the adapter
 *        c. calls adapter.list(token, quote, ...) and records position id
 *   4. AgentLogger emits a DISTRIBUTION event for off-chain indexers.
 *
 * Storage:
 *   distributions[token][adapter] = position id
 *   adapterRegistry              = set of allowed adapter addresses
 *
 * Authority:
 *   owner can add/remove adapters and trigger distribute().
 *   In production owner = multisig.
 */
contract Distributor is Ownable, ReentrancyGuard {
    /// @notice Allowed adapters. Distributor only sends funds to whitelisted addresses.
    mapping(address => bool) public isAdapter;

    /// @notice token => adapter => positionId returned by adapter.list().
    mapping(address => mapping(address => bytes32)) public positionOf;

    /// @notice token => list of adapters it's distributed to (for iteration).
    mapping(address => address[]) internal _venuesOf;

    /// @notice Settlement contract that may call `unwindProportional`.
    ///         Set once after deployment via `setSettlement`.
    address public settlement;

    event AdapterAdded(address indexed adapter, string name);
    event AdapterRemoved(address indexed adapter);
    event TokenDistributed(
        address indexed token,
        address indexed adapter,
        uint256 amountToken,
        uint256 amountQuote,
        uint16 weightBps,
        bytes32 positionId
    );
    event SettlementSet(address indexed settlement);
    event ProportionalUnwind(
        address indexed token,
        uint16 fractionBps,
        uint256 recoveredToken,
        uint256 recoveredQuote
    );

    error NotAdapter(address adapter);
    error WeightsExceedMax(uint256 sum);
    error LengthMismatch();
    error EmptyPlan();
    error TransferFailed();
    error NotSettlement(address caller);
    error InvalidFraction(uint16 fractionBps);

    constructor(address initialOwner_) Ownable(initialOwner_) {}

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    function addAdapter(address adapter) external onlyOwner {
        isAdapter[adapter] = true;
        emit AdapterAdded(adapter, IJionAdapter(adapter).name());
    }

    function removeAdapter(address adapter) external onlyOwner {
        isAdapter[adapter] = false;
        emit AdapterRemoved(adapter);
    }

    /// @notice Owner sets the Settlement contract authorized to call
    ///         `unwindProportional`. Set once after Settlement deploy.
    function setSettlement(address settlement_) external onlyOwner {
        settlement = settlement_;
        emit SettlementSet(settlement_);
    }

    // -----------------------------------------------------------------------
    // Distribution
    // -----------------------------------------------------------------------

    /**
     * @notice Fan out (token, quote) across `adapters` per `weightsBps`.
     *
     * @dev Owner-only. Caller (TokenFactory or cron-signer) must have
     *      transferred the *full* totalToken + totalQuote to this contract
     *      BEFORE calling distribute(). The contract redistributes them out
     *      proportionally.
     *
     * @param token         the JionToken being distributed
     * @param quote         the paired stable (USDC mock on Sepolia)
     * @param totalToken    full token amount the Distributor is holding
     * @param totalQuote    full quote amount the Distributor is holding
     * @param adapters      list of target adapters (must all be whitelisted)
     * @param weightsBps    matching basis-point weights, sum <= 10000
     */
    function distribute(
        address token,
        address quote,
        uint256 totalToken,
        uint256 totalQuote,
        address[] calldata adapters,
        uint16[] calldata weightsBps
    ) external onlyOwner nonReentrant {
        if (adapters.length == 0) revert EmptyPlan();
        if (adapters.length != weightsBps.length) revert LengthMismatch();

        uint256 sumWeights;
        for (uint256 i = 0; i < weightsBps.length; i++) {
            sumWeights += uint256(weightsBps[i]);
        }
        if (sumWeights > 10_000) revert WeightsExceedMax(sumWeights);

        for (uint256 i = 0; i < adapters.length; i++) {
            if (!isAdapter[adapters[i]]) revert NotAdapter(adapters[i]);
            _distributeOne(token, quote, adapters[i], weightsBps[i], totalToken, totalQuote);
        }
    }

    /// @dev Extracted to keep `distribute`'s stack depth under the 16-slot limit.
    function _distributeOne(
        address token,
        address quote,
        address adapter,
        uint16 weightBps,
        uint256 totalToken,
        uint256 totalQuote
    ) internal {
        uint256 amountToken = (totalToken * uint256(weightBps)) / 10_000;
        uint256 amountQuote = (totalQuote * uint256(weightBps)) / 10_000;
        if (amountToken == 0 && amountQuote == 0) return;

        _safeTransfer(token, adapter, amountToken);
        _safeTransfer(quote, adapter, amountQuote);

        bytes32 positionId = IJionAdapter(adapter).list(
            token, quote, amountToken, amountQuote
        );

        positionOf[token][adapter] = positionId;
        _venuesOf[token].push(adapter);

        emit TokenDistributed(token, adapter, amountToken, amountQuote, weightBps, positionId);
    }

    /// @notice Read-only list of adapters a token is currently distributed to.
    function venuesOf(address token) external view returns (address[] memory) {
        return _venuesOf[token];
    }

    function venueCount(address token) external view returns (uint256) {
        return _venuesOf[token].length;
    }

    // -----------------------------------------------------------------------
    // Redemption — Settlement-driven, best-effort unwind (PLAN §4.4)
    // -----------------------------------------------------------------------

    /**
     * @notice Pull back a proportional slice from every adapter holding this token
     *         and forward what's recovered to the caller (Settlement).
     *
     * @dev    Best-effort: an adapter that reverts on `withdraw()` (paused,
     *         no position, internal error) is silently skipped — the rest still
     *         contribute. The current minimal-viable Phase-1 implementation
     *         performs FULL unwind of every adapter's position regardless of
     *         `fractionBps` so the mock adapters can return their reserves;
     *         a future revision will plumb partial-withdraw semantics through
     *         the `IJionAdapter` interface (Phase 2+).
     *
     * @param  token        the JionToken being redeemed against
     * @param  fractionBps  desired fraction (0–10000) of each position to pull
     *                      back. Kept in storage / event log for analytics
     *                      even though the v1 unwind is full.
     * @return recoveredToken sum of token side returned by all adapters
     * @return recoveredQuote sum of quote (USDC) side returned by all adapters,
     *                        forwarded onward to the Settlement caller.
     */
    function unwindProportional(address token, uint16 fractionBps)
        external
        nonReentrant
        returns (uint256 recoveredToken, uint256 recoveredQuote)
    {
        if (msg.sender != settlement) revert NotSettlement(msg.sender);
        if (fractionBps == 0 || fractionBps > 10_000) {
            revert InvalidFraction(fractionBps);
        }

        address[] memory venues = _venuesOf[token];
        for (uint256 i = 0; i < venues.length; i++) {
            bytes32 positionId = positionOf[token][venues[i]];
            if (positionId == bytes32(0)) continue;
            try IJionAdapter(venues[i]).withdraw(positionId) returns (
                uint256 amountToken,
                uint256 amountQuote
            ) {
                recoveredToken += amountToken;
                recoveredQuote += amountQuote;
                // Mark position consumed so a second redeem cycle doesn't
                // double-withdraw against the same adapter slot.
                positionOf[token][venues[i]] = bytes32(0);
            } catch {
                // best-effort: skip this venue
            }
        }

        emit ProportionalUnwind(token, fractionBps, recoveredToken, recoveredQuote);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    function _safeTransfer(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!(ok && (data.length == 0 || abi.decode(data, (bool))))) {
            revert TransferFailed();
        }
    }
}
