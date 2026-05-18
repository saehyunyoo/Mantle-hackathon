// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title Minimal Pyth interface — local copy
 *
 * NOTE: this is a minimal stand-in for `@pythnetwork/pyth-sdk-solidity/IPyth.sol`.
 * The upstream package ships with NatSpec tags that Solidity 0.8.24 rejects
 * when consumed via remappings inside this CI setup. To keep CI green and
 * unblock W2 work we inline only the parts of the interface we actually call.
 *
 * Wire-compatible with the on-chain Pyth contract at:
 *   - Mantle Sepolia: 0x98046Bd286715D3B0BC227Dd7a956b83D8978603
 *   - Mantle Mainnet: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
 *
 * In W2, swap this for the real SDK once we pin a compatible version.
 */

library PythStructs {
    struct Price {
        int64  price;
        uint64 conf;
        int32  expo;
        uint256 publishTime;
    }
}

interface IPyth {
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256);

    function updatePriceFeeds(bytes[] calldata updateData) external payable;

    function getPriceNoOlderThan(bytes32 id, uint256 age)
        external
        view
        returns (PythStructs.Price memory);

    function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory);
}
