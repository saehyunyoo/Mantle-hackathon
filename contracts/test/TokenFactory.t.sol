// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TokenFactory.sol";

contract TokenFactoryTest is Test {
    TokenFactory factory;

    function setUp() public {
        factory = new TokenFactory();
    }

    function test_RevertWhenNotImplemented() public {
        vm.expectRevert("not implemented");
        factory.createToken("mNVDA-20260518", "NVDA", 10_000 ether);
    }
}
