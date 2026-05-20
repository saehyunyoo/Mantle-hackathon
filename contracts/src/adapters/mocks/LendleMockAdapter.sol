// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IJionAdapter } from "../IJionAdapter.sol";

/**
 * @title LendleMockAdapter — demo-only mock of a Lendle-style lending market
 *
 * Same demo-only spirit as MerchantMoeMockAdapter — Lendle is mainnet-only
 * (Aave V3 fork on Mantle). We ship a self-contained mock so the Distributor
 * can route the same token into "AMM + LENDING" venues at the same time and
 * the demo can show multi-venue listing in one transaction.
 *
 * `kind() = 1` so the AI router weighs this differently from AMMs.
 *
 * Demo behavior:
 *   - list(): records the position; tokens stay in the adapter as "supplied
 *     collateral".
 *   - withdraw(): returns the originally supplied amount (no interest accrual
 *     simulated — keeping the math obvious for demo).
 */
contract LendleMockAdapter is IJionAdapter {
    address public immutable controller;

    struct Position {
        address token;
        address quote;
        uint256 amountToken;
        uint256 amountQuote;
        bool active;
    }
    mapping(bytes32 => Position) public positions;
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

    function name() external pure returns (string memory) {
        return "Lendle-Mock";
    }

    function kind() external pure returns (uint8) {
        return 1; // LENDING
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

    function setVolume24h(address token, uint256 usd) external onlyController {
        _volume24h[token] = usd;
    }
}
