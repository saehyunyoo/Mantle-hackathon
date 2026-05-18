// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { AgentLogger } from "../src/AgentLogger.sol";

contract AgentLoggerTest is Test {
    AgentLogger logger;
    address owner = address(0xA11CE);
    address bot   = address(0xB0B);

    event AgentDecision(
        address indexed caller,
        bytes32 indexed kind,
        bytes32 indexed routeId,
        string reason,
        uint256 timestamp
    );

    function setUp() public {
        logger = new AgentLogger(owner);
    }

    function test_OwnerAuthorizedByDefault() public view {
        assertTrue(logger.authorized(owner));
    }

    function test_OwnerCanAuthorizeOthers() public {
        vm.prank(owner);
        logger.setAuthorized(bot, true);
        assertTrue(logger.authorized(bot));
    }

    function test_AuthorizedCanLog() public {
        vm.prank(owner);
        logger.setAuthorized(bot, true);

        bytes32 kind    = keccak256("ROUTE");
        bytes32 routeId = keccak256("test-route");

        vm.expectEmit(true, true, true, false);
        emit AgentDecision(bot, kind, routeId, "fake reason", 0);

        vm.prank(bot);
        logger.log(kind, routeId, "fake reason");
    }

    function test_UnauthorizedReverts() public {
        bytes32 kind    = keccak256("ROUTE");
        bytes32 routeId = keccak256("x");

        vm.prank(address(0xDEAD));
        vm.expectRevert(
            abi.encodeWithSelector(AgentLogger.NotAuthorized.selector, address(0xDEAD))
        );
        logger.log(kind, routeId, "nope");
    }
}
