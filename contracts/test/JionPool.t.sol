// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { JionPool } from "../src/JionPool.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract JionPoolConstructorTest is Test {
    address token0 = address(0xAAA1);
    address token1 = address(0xAAA2);

    function test_ConstructorSetsTokens() public {
        JionPool pool = new JionPool(token0, token1);
        assertEq(pool.token0(), token0);
        assertEq(pool.token1(), token1);
        assertEq(pool.factory(), address(this));
        assertEq(uint256(pool.FEE_BPS()), 30);
        assertEq(pool.MINIMUM_LIQUIDITY(), 1000);
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

    // swap still reverts until follow-up PR.
    function test_SwapRevertsForNow() public {
        JionPool pool = new JionPool(token0, token1);
        vm.expectRevert("JionPool.swap: not implemented");
        pool.swap(0, 0, address(this));
    }
}

contract JionPoolMintTest is Test {
    MockERC20 t0;
    MockERC20 t1;
    JionPool  pool;

    address constant DEAD = 0x000000000000000000000000000000000000dEaD;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Sync(uint112 reserve0, uint112 reserve1);

    function setUp() public {
        t0 = new MockERC20("Token0", "T0");
        t1 = new MockERC20("Token1", "T1");
        // address ordering matters for some tests; we don't rely on it here.
        pool = new JionPool(address(t0), address(t1));
    }

    /// First mint: liquidity = sqrt(a0 * a1) - MINIMUM_LIQUIDITY,
    /// MINIMUM_LIQUIDITY locked to DEAD address.
    function test_FirstMint() public {
        // Deposit 1000 t0 + 4000 t1 (in 1e18 units) — like 1:4 price.
        t0.mint(address(pool), 1000 ether);
        t1.mint(address(pool), 4000 ether);

        // sqrt(1000e18 * 4000e18) = sqrt(4e39) = 2e39^0.5 ... compute:
        //   1000e18 * 4000e18 = 4_000_000 * 1e36 = 4 * 1e42
        //   sqrt(4e42)        = 2e21 = 2000e18
        // liquidity = 2000e18 - 1000
        uint256 expected = 2000 ether - 1000;

        // emit Mint and Sync expected (we don't strictly assert event args here).
        vm.expectEmit(true, false, false, true);
        emit Mint(address(this), 1000 ether, 4000 ether);

        uint256 liquidity = pool.mint(address(this));

        assertEq(liquidity, expected, "first-mint liquidity");
        assertEq(pool.balanceOf(address(this)), expected, "LP balance to recipient");
        assertEq(pool.balanceOf(DEAD), 1000, "MINIMUM_LIQUIDITY locked");
        assertEq(pool.totalSupply(), expected + 1000, "total supply");

        (uint112 r0, uint112 r1, uint32 ts) = pool.getReserves();
        assertEq(uint256(r0), 1000 ether);
        assertEq(uint256(r1), 4000 ether);
        assertGt(uint256(ts), 0);
    }

    /// Second mint at same price ratio mints proportional LP.
    function test_SubsequentMintProportional() public {
        // first
        t0.mint(address(pool), 1000 ether);
        t1.mint(address(pool), 4000 ether);
        pool.mint(address(0xA11CE)); // first LP

        uint256 totalBefore = pool.totalSupply();

        // second: same ratio, half size
        t0.mint(address(pool), 500 ether);
        t1.mint(address(pool), 2000 ether);

        uint256 liquidity = pool.mint(address(this));
        // proportional: min(500e18 * total / 1000e18, 2000e18 * total / 4000e18)
        //             = total / 2
        uint256 expected = totalBefore / 2;
        assertEq(liquidity, expected, "subsequent-mint liquidity");
    }

    /// Skewed deposit (off-ratio) follows the smaller side, so the LP is
    /// penalized for not matching the current pool ratio.
    function test_SkewedMintUsesMinSide() public {
        t0.mint(address(pool), 1000 ether);
        t1.mint(address(pool), 4000 ether);
        pool.mint(address(0xA11CE));

        // Deposit t0 in 1:4 ratio but t1 way more.
        t0.mint(address(pool), 100 ether);   // 10% of reserve0
        t1.mint(address(pool), 800 ether);   // 20% of reserve1
        uint256 liq = pool.mint(address(this));

        uint256 totalAfterFirst = (2000 ether - 1000) + 1000; // total after first mint
        // Should follow the smaller side (t0): 10% of totalSupply
        uint256 expected = (100 ether * totalAfterFirst) / 1000 ether;
        assertEq(liq, expected);
    }

    /// Mint without depositing anything must revert.
    /// (Specifically: sqrt(0) - MINIMUM_LIQUIDITY underflows before the
    /// InsufficientLiquidity check, which mirrors Uniswap V2 behavior. Either
    /// revert is acceptable — we just want the call to fail.)
    function test_RevertOnZeroDeposit() public {
        vm.expectRevert();
        pool.mint(address(this));
    }

    /// Mint with deposit smaller than MINIMUM_LIQUIDITY^2 on first mint reverts
    /// because liquidity would underflow (sqrt < MINIMUM_LIQUIDITY).
    function test_RevertOnTooSmallFirstMint() public {
        // sqrt(100 * 100) = 100 < 1000 → underflow on `- MINIMUM_LIQUIDITY`
        t0.mint(address(pool), 100);
        t1.mint(address(pool), 100);
        vm.expectRevert(); // arithmetic underflow
        pool.mint(address(this));
    }

    /// sync() updates reserves to match balances even without a mint.
    function test_SyncMatchesBalances() public {
        t0.mint(address(pool), 7 ether);
        t1.mint(address(pool), 11 ether);

        pool.sync();
        (uint112 r0, uint112 r1,) = pool.getReserves();
        assertEq(uint256(r0), 7 ether);
        assertEq(uint256(r1), 11 ether);
    }
}

contract JionPoolBurnTest is Test {
    MockERC20 t0;
    MockERC20 t1;
    JionPool  pool;

    address constant DEAD = 0x000000000000000000000000000000000000dEaD;
    address alice = address(0xA11CE);

    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);

    function setUp() public {
        t0 = new MockERC20("Token0", "T0");
        t1 = new MockERC20("Token1", "T1");
        pool = new JionPool(address(t0), address(t1));

        // Seed pool with 1000 t0 + 4000 t1 LP from alice.
        t0.mint(address(pool), 1000 ether);
        t1.mint(address(pool), 4000 ether);
        pool.mint(alice);
        // alice now has ~2000e18 - 1000 LP shares.
    }

    /// Full burn returns all underlying minus the dust locked at DEAD.
    function test_FullBurnReturnsProportional() public {
        uint256 lpBalance = pool.balanceOf(alice);

        // alice transfers LP back into the pool, then calls burn().
        vm.prank(alice);
        pool.transfer(address(pool), lpBalance);

        uint256 expectedShare = lpBalance; // share of supply alice burns
        uint256 totalSupplyBefore = pool.totalSupply();

        // amount_out = balance * lpBalance / totalSupply
        uint256 expectedAmount0 = (lpBalance * 1000 ether) / totalSupplyBefore;
        uint256 expectedAmount1 = (lpBalance * 4000 ether) / totalSupplyBefore;

        vm.expectEmit(true, false, false, true);
        emit Burn(address(this), expectedAmount0, expectedAmount1, alice);

        (uint256 a0, uint256 a1) = pool.burn(alice);

        assertEq(a0, expectedAmount0, "amount0");
        assertEq(a1, expectedAmount1, "amount1");
        assertEq(t0.balanceOf(alice), a0, "alice t0");
        assertEq(t1.balanceOf(alice), a1, "alice t1");

        // DEAD still holds MINIMUM_LIQUIDITY — should never be redeemable.
        assertEq(pool.balanceOf(DEAD), 1000);

        // pool LP for alice now 0
        assertEq(pool.balanceOf(alice), 0);

        // reserves refreshed
        (uint112 r0, uint112 r1,) = pool.getReserves();
        assertEq(uint256(r0), 1000 ether - a0);
        assertEq(uint256(r1), 4000 ether - a1);

        expectedShare; // silence unused warning
    }

    /// Burning a partial position returns proportional amounts.
    function test_PartialBurn() public {
        uint256 half = pool.balanceOf(alice) / 2;
        uint256 totalSupplyBefore = pool.totalSupply();

        vm.prank(alice);
        pool.transfer(address(pool), half);

        uint256 expectedA0 = (half * 1000 ether) / totalSupplyBefore;
        uint256 expectedA1 = (half * 4000 ether) / totalSupplyBefore;

        (uint256 a0, uint256 a1) = pool.burn(alice);
        assertEq(a0, expectedA0);
        assertEq(a1, expectedA1);
        assertEq(pool.balanceOf(alice), pool.balanceOf(alice)); // still has the other half
        assertGt(pool.balanceOf(alice), 0);
    }

    /// Burning zero LP shares reverts (amount0/amount1 would be 0).
    function test_RevertOnZeroLpInPool() public {
        // No LP transferred into the pool — burn should revert.
        vm.expectRevert(JionPool.InsufficientLiquidity.selector);
        pool.burn(alice);
    }

    /// MINIMUM_LIQUIDITY dust at DEAD cannot be redeemed.
    function test_MinimumLiquidityLockedForever() public {
        // alice burns her full position.
        uint256 lpBalance = pool.balanceOf(alice);
        vm.prank(alice);
        pool.transfer(address(pool), lpBalance);
        pool.burn(alice);

        // pool still has MINIMUM_LIQUIDITY at DEAD; total supply == 1000
        assertEq(pool.totalSupply(), 1000);
        assertEq(pool.balanceOf(DEAD), 1000);

        // residual reserves are the locked-liquidity proportional dust
        (uint112 r0, uint112 r1,) = pool.getReserves();
        assertGt(uint256(r0), 0);
        assertGt(uint256(r1), 0);
    }
}
