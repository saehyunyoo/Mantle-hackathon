// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { MockUSDC } from "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC usdc;
    address owner = address(0xA11CE);
    address user = address(0xBABE);

    function setUp() public {
        usdc = new MockUSDC(owner);
    }

    function test_Metadata() public view {
        assertEq(usdc.name(), "Mock USDC");
        assertEq(usdc.symbol(), "mUSDC");
        assertEq(usdc.decimals(), 6);
        assertEq(usdc.owner(), owner);
    }

    function test_FaucetMintsToCaller() public {
        vm.prank(user);
        usdc.faucet(100 * 1e6);
        assertEq(usdc.balanceOf(user), 100 * 1e6);
    }

    function test_FaucetCapsAtLimit() public {
        vm.prank(user);
        vm.expectRevert(MockUSDC.FaucetLimitExceeded.selector);
        usdc.faucet(2_000_000 * 1e6); // 2M > 1M cap
    }

    function test_FaucetExactlyAtLimitWorks() public {
        vm.prank(user);
        usdc.faucet(1_000_000 * 1e6); // exactly cap
        assertEq(usdc.balanceOf(user), 1_000_000 * 1e6);
    }

    function test_OwnerMintNoCap() public {
        vm.prank(owner);
        usdc.mint(user, 5_000_000 * 1e6); // 5M
        assertEq(usdc.balanceOf(user), 5_000_000 * 1e6);
    }

    function test_NonOwnerCannotMint() public {
        vm.prank(user);
        vm.expectRevert();
        usdc.mint(user, 100);
    }
}
