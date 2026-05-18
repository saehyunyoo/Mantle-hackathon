// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentLogger — on-chain breadcrumb for AI decisions
 * @notice The AI router / LP optimizer emits decision events through this
 *         contract. Verifiable agent record per PLAN.md §5.2.2.
 *
 *         No business logic — just structured event emission so off-chain
 *         indexers (Supabase / The Graph) can mirror.
 *
 * Decision kinds:
 *   - "ROUTE"   : AI router's swap path + reason
 *   - "LP"      : LP optimizer's allocation choice + reason
 *   - "SETTLE"  : Settlement contract's force-settle trigger
 *   - "ISSUE"   : TokenFactory issuance
 */
contract AgentLogger is Ownable {
    /// @notice Whitelisted callers that may emit decision events.
    mapping(address => bool) public authorized;

    event AgentDecision(
        address indexed caller,
        bytes32 indexed kind, // keccak256("ROUTE") etc.
        bytes32 indexed routeId,
        string reason,
        uint256 timestamp
    );

    event AuthorizationChanged(address indexed who, bool allowed);

    error NotAuthorized(address caller);

    constructor(address initialOwner_) Ownable(initialOwner_) {
        authorized[initialOwner_] = true;
        emit AuthorizationChanged(initialOwner_, true);
    }

    function setAuthorized(address who, bool allowed) external onlyOwner {
        authorized[who] = allowed;
        emit AuthorizationChanged(who, allowed);
    }

    /**
     * @notice Emit a decision event.
     * @param kind     decision category (use keccak256("ROUTE") etc.)
     * @param routeId  unique id (e.g. hash of input → output → venues)
     * @param reason   short human-readable rationale (≤ 256 chars recommended)
     */
    function log(bytes32 kind, bytes32 routeId, string calldata reason) external {
        if (!authorized[msg.sender]) revert NotAuthorized(msg.sender);
        emit AgentDecision(msg.sender, kind, routeId, reason, block.timestamp);
    }
}
