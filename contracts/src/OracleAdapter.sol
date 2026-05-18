// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { PythStructs } from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title OracleAdapter — Pyth pull-oracle wrapper
 * @notice Single point for reading equity / RWA prices from Pyth Network on Mantle.
 *
 * Mantle Sepolia Pyth contract: 0x98046Bd286715D3B0BC227Dd7a956b83D8978603
 * Mantle Mainnet Pyth contract: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
 *
 * Pull-oracle pattern (per docs/RESEARCH.md §1.4):
 *   1. caller obtains `priceUpdate` payload from Hermes off-chain
 *   2. caller computes fee via `pyth.getUpdateFee(priceUpdate)`
 *   3. caller forwards `msg.value = fee` into `updateAndRead(...)`
 *
 * Staleness:
 *   - default 60s. Configurable per-call.
 */
contract OracleAdapter {
    IPyth public immutable pyth;

    /// @notice Default acceptable staleness (seconds).
    uint256 public constant DEFAULT_STALENESS = 60;

    event PriceRead(bytes32 indexed feedId, int64 price, uint256 publishTime);

    error PriceTooStale(bytes32 feedId, uint256 publishTime, uint256 now_);
    error FeeMismatch(uint256 sent, uint256 required);

    constructor(address pyth_) {
        pyth = IPyth(pyth_);
    }

    /**
     * @notice Update Pyth with fresh data then return current price.
     * @param feedId      bytes32 Pyth feed id (e.g. NVDA = 0xb1073854ed24cbc7...)
     * @param priceUpdate raw price update payloads from Hermes
     * @param staleness   max age in seconds (0 → use DEFAULT_STALENESS)
     * @return price 8-dec (Pyth standard) price struct
     */
    function updateAndRead(
        bytes32 feedId,
        bytes[] calldata priceUpdate,
        uint256 staleness
    ) external payable returns (PythStructs.Price memory price) {
        uint256 fee = pyth.getUpdateFee(priceUpdate);
        if (msg.value < fee) revert FeeMismatch(msg.value, fee);

        pyth.updatePriceFeeds{ value: fee }(priceUpdate);

        uint256 age = staleness == 0 ? DEFAULT_STALENESS : staleness;
        price = pyth.getPriceNoOlderThan(feedId, age);

        emit PriceRead(feedId, price.price, price.publishTime);
    }

    /**
     * @notice Read price WITHOUT updating (cheap view; reverts if stale).
     */
    function readNoOlderThan(bytes32 feedId, uint256 staleness)
        external
        view
        returns (PythStructs.Price memory)
    {
        uint256 age = staleness == 0 ? DEFAULT_STALENESS : staleness;
        return pyth.getPriceNoOlderThan(feedId, age);
    }

    /// @notice Fee preview helper for off-chain callers / tests.
    function getUpdateFee(bytes[] calldata priceUpdate) external view returns (uint256) {
        return pyth.getUpdateFee(priceUpdate);
    }
}
