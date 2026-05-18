// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { JionPool } from "../src/JionPool.sol";

contract JionPoolTest is Test {
    address token0 = address(0xAAA1);
    address token1 = address(0xAAA2);

    function test_ConstructorSetsTokens() public {
        JionPool pool = new JionPool(token0, token1);
        assertEq(pool.token0(), token0);
        assertEq(pool.token1(), token1);
        assertEq(pool.factory(), address(this));
        assertEq(uint256(pool.FEE_BPS()), 30);
    }

    function test_ConstructorRevertsOnInvalidPair() public {
        vm.expectRevert(JionPool.InvalidPair.selector);
        new JionPool(address(0), token1);

        vm.expectRevert(JionPool.InvalidPair.selector);
        new JionPool(token0, token0);
    }

    function test_GetReservesIsZeroInitially() public {
        JionPool pool = new JionPool(token0, token1);
        (uint112 r0, uint112 r1, uint32 ts) = pool.getReserves();
        assertEq(uint256(r0), 0);
        assertEq(uint256(r1), 0);
        assertEq(uint256(ts), 0);
    }

    // mint/burn/swap revert until W2. Placeholder tests to lock the surface.
    function test_MintRevertsForNow() public {
        JionPool pool = new JionPool(token0, token1);
        vm.expectRevert("JionPool.mint: not implemented");
        pool.mint(address(this));
    }
}
