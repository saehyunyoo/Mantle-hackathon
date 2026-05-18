// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { JionToken } from "./JionToken.sol";

/**
 * @title TokenFactory — batch issuer of daily synthetic tokens
 * @notice Called by the off-chain cron (`apps/web/app/api/cron/issue`) once per
 *         market per day. Mints `JionToken` for each (ticker, date) pair and
 *         emits an event for indexing.
 *
 * Lifecycle:
 *   - W1: skeleton (this file). Cron + Pyth wiring stays as TODO.
 *   - W2: real batch issuance + LP seeding via JionRouter.
 *
 * Authorization:
 *   - Owner = deploy key (signer wallet).
 *   - In production a multisig / signer set governs.
 */
contract TokenFactory is Ownable {
    /// @notice Maps a deterministic key (symbol hash) → deployed token address.
    mapping(bytes32 => address) public tokenOf;

    /// @notice Append-only list of issued tokens for off-chain indexing.
    address[] public tokens;

    event TokenIssued(
        address indexed token,
        string symbol,
        string underlying,
        string market,
        uint256 initialSupply,
        bytes32 pythFeedId
    );

    error TokenAlreadyExists(bytes32 key);

    constructor(address initialOwner_) Ownable(initialOwner_) {}

    /**
     * @notice Issue a new daily synthetic token + mint initial supply to caller.
     * @dev Owner only. Real impl will:
     *      - validate (ticker, date) hasn't been issued already
     *      - deploy JionToken with deterministic CREATE2 salt
     *      - mint initial supply to caller (factory deployer wallet)
     *      - caller forwards to JionRouter.addLiquidity in same tx
     *
     * @param name_         display name
     * @param symbol_       short symbol (used as unique key)
     * @param underlying_   ticker
     * @param market_       "NASDAQ" / "KRX" / "TSE"
     * @param pythFeedId_   bytes32 Pyth feed id
     * @param initialSupply initial mint amount (wei)
     */
    function issue(
        string calldata name_,
        string calldata symbol_,
        string calldata underlying_,
        string calldata market_,
        bytes32 pythFeedId_,
        uint256 initialSupply
    ) external onlyOwner returns (address tokenAddr) {
        bytes32 key = keccak256(bytes(symbol_));
        if (tokenOf[key] != address(0)) revert TokenAlreadyExists(key);

        JionToken token = new JionToken(
            name_,
            symbol_,
            underlying_,
            market_,
            pythFeedId_,
            address(this)
        );
        token.mint(msg.sender, initialSupply);

        tokenAddr = address(token);
        tokenOf[key] = tokenAddr;
        tokens.push(tokenAddr);

        emit TokenIssued(tokenAddr, symbol_, underlying_, market_, initialSupply, pythFeedId_);
    }

    /// @notice Count of all issued tokens (across all days).
    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }
}
