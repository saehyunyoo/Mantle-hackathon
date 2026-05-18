// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { TokenFactory } from "../src/TokenFactory.sol";
import { JionToken } from "../src/JionToken.sol";

contract TokenFactoryTest is Test {
    TokenFactory factory;
    address owner = address(0xA11CE);
    bytes32 constant NVDA_FEED = 0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593;

    function setUp() public {
        vm.prank(owner);
        factory = new TokenFactory(owner);
    }

    function test_OwnerIsSet() public view {
        assertEq(factory.owner(), owner);
    }

    function test_IssueMintsAndIndexes() public {
        vm.prank(owner);
        address tokenAddr = factory.issue(
            "Jion NVDA 2026-05-18",
            "mNVDA-20260518",
            "NVDA",
            "NASDAQ",
            NVDA_FEED,
            10_000 ether
        );

        assertEq(factory.tokenCount(), 1);
        assertEq(factory.tokens(0), tokenAddr);
        assertEq(factory.tokenOf(keccak256(bytes("mNVDA-20260518"))), tokenAddr);

        JionToken token = JionToken(tokenAddr);
        assertEq(token.balanceOf(owner), 10_000 ether);
        assertEq(token.totalSupply(), 10_000 ether);
        assertEq(token.underlying(), "NVDA");
        assertEq(token.market(), "NASDAQ");
        assertEq(token.pythFeedId(), NVDA_FEED);
    }

    function test_RevertsOnDuplicateSymbol() public {
        vm.startPrank(owner);
        factory.issue("a", "DUP", "X", "NASDAQ", bytes32(0), 1);

        vm.expectRevert(
            abi.encodeWithSelector(TokenFactory.TokenAlreadyExists.selector, keccak256(bytes("DUP")))
        );
        factory.issue("a", "DUP", "X", "NASDAQ", bytes32(0), 1);
        vm.stopPrank();
    }

    function test_OnlyOwnerCanIssue() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        factory.issue("a", "X", "X", "NASDAQ", bytes32(0), 1);
    }
}
