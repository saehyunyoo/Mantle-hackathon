// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IJionAdapter } from "../IJionAdapter.sol";

/**
 * @title MerchantMoeMockAdapter — *demo-only* mock of an external V2 AMM
 *
 * Why this exists (T8 #17):
 *   Merchant Moe is mainnet-only — there is no Sepolia instance. To show the
 *   *adapter pattern actually works on multiple venues at the same time*
 *   without faking it in the UI, we ship a self-hosted simulation contract
 *   that satisfies IJionAdapter.
 *
 *   It is NOT real Merchant Moe. It does not interact with any real protocol.
 *   The token + quote stay inside this adapter contract for the demo's
 *   lifetime. Settlement.withdraw returns them as-is.
 *
 * Demo UI labelling rule (per T7):
 *   The Frontend MUST display "Mock — Phase 2+" next to any token routed
 *   via this adapter. Honesty > narrative.
 */
contract MerchantMoeMockAdapter is IJionAdapter {
    /// @notice owner address allowed to push synthetic volume readings.
    address public immutable controller;

    /// @notice positionId → (token, quote, amountToken, amountQuote)
    struct Position {
        address token;
        address quote;
        uint256 amountToken;
        uint256 amountQuote;
        bool active;
    }
    mapping(bytes32 => Position) public positions;

    /// @notice synthetic 24h volume (USD-equivalent) per token.
    mapping(address => uint256) internal _volume24h;

    uint256 internal _nonce;

    error NotController();
    error UnknownPosition(bytes32 positionId);
    error AlreadyClosed(bytes32 positionId);

    constructor(address controller_) {
        controller = controller_;
    }

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    // ---- IJionAdapter ----

    function name() external pure returns (string memory) {
        return "MerchantMoe-Mock";
    }

    function kind() external pure returns (uint8) {
        return 0; // AMM
    }

    function list(
        address token,
        address quote,
        uint256 amountToken,
        uint256 amountQuote
    ) external returns (bytes32 positionId) {
        positionId = keccak256(
            abi.encodePacked(token, quote, address(this), ++_nonce)
        );
        positions[positionId] = Position({
            token: token,
            quote: quote,
            amountToken: amountToken,
            amountQuote: amountQuote,
            active: true
        });
    }

    /// @notice Return the entire position to the caller. For the demo we
    ///         hand back exactly what was deposited (no slippage / no IL).
    function withdraw(bytes32 positionId)
        external
        returns (uint256 amountTokenOut, uint256 amountQuoteOut)
    {
        Position storage pos = positions[positionId];
        if (pos.token == address(0)) revert UnknownPosition(positionId);
        if (!pos.active) revert AlreadyClosed(positionId);

        amountTokenOut = pos.amountToken;
        amountQuoteOut = pos.amountQuote;
        pos.active = false;

        if (amountTokenOut > 0) {
            require(
                IERC20(pos.token).transfer(msg.sender, amountTokenOut),
                "mock: token transfer failed"
            );
        }
        if (amountQuoteOut > 0) {
            require(
                IERC20(pos.quote).transfer(msg.sender, amountQuoteOut),
                "mock: quote transfer failed"
            );
        }
    }

    function volume24h(address token) external view returns (uint256) {
        return _volume24h[token];
    }

    function isHealthy() external pure returns (bool) {
        return true;
    }

    // ---- Controller-only knobs ----

    /// @notice Push a synthetic 24h volume so Settlement can decide.
    ///         Off-chain cron (or demo script) sets this.
    function setVolume24h(address token, uint256 usd) external onlyController {
        _volume24h[token] = usd;
    }
}
