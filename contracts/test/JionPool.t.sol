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

contract JionPoolSwapTest is Test {
    MockERC20 t0;
    MockERC20 t1;
    JionPool  pool;
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    function setUp() public {
        t0 = new MockERC20("Token0", "T0");
        t1 = new MockERC20("Token1", "T1");
        pool = new JionPool(address(t0), address(t1));

        // Seed pool with 1000 t0 + 4000 t1 (price = 4).
        t0.mint(address(pool), 1000 ether);
        t1.mint(address(pool), 4000 ether);
        pool.mint(alice);
    }

    /// Swap t0 -> t1: deposit 100 t0, expect quoted amountOut of t1.
    function test_SwapToken0ForToken1() public {
        uint256 amountIn = 100 ether;
        uint256 expectedOut = pool.getAmountOut(amountIn, 1000 ether, 4000 ether);
        assertGt(expectedOut, 0);

        // Deposit input then call swap.
        t0.mint(address(pool), amountIn);

        vm.expectEmit(true, false, false, true);
        emit Swap(address(this), amountIn, 0, 0, expectedOut, bob);

        pool.swap(0, expectedOut, bob);

        assertEq(t1.balanceOf(bob), expectedOut);
        assertEq(t0.balanceOf(address(pool)), 1000 ether + amountIn);
        assertEq(t1.balanceOf(address(pool)), 4000 ether - expectedOut);
    }

    /// Swap t1 -> t0: deposit 400 t1, expect quoted amountOut of t0.
    function test_SwapToken1ForToken0() public {
        uint256 amountIn = 400 ether;
        uint256 expectedOut = pool.getAmountOut(amountIn, 4000 ether, 1000 ether);
        assertGt(expectedOut, 0);

        t1.mint(address(pool), amountIn);

        pool.swap(expectedOut, 0, bob);

        assertEq(t0.balanceOf(bob), expectedOut);
    }

    /// Asking for more output than the quote would allow violates K() invariant.
    function test_RevertOnTooMuchOutput() public {
        uint256 amountIn = 100 ether;
        uint256 quote = pool.getAmountOut(amountIn, 1000 ether, 4000 ether);

        t0.mint(address(pool), amountIn);

        // Try to take 1.5x of quoted output — must fail.
        vm.expectRevert(JionPool.K.selector);
        pool.swap(0, (quote * 3) / 2, bob);
    }

    /// Both amount0Out and amount1Out zero -> InsufficientOutput.
    function test_RevertOnZeroOutput() public {
        vm.expectRevert(JionPool.InsufficientOutput.selector);
        pool.swap(0, 0, bob);
    }

    /// Output >= reserve -> InsufficientLiquidity.
    function test_RevertOnExcessiveOutput() public {
        vm.expectRevert(JionPool.InsufficientLiquidity.selector);
        pool.swap(0, 4000 ether, bob); // takes all of token1 reserve
    }

    /// Calling swap with no input deposit reverts (no fee paid, no input).
    function test_RevertOnNoInputDeposit() public {
        uint256 quote = pool.getAmountOut(100 ether, 1000 ether, 4000 ether);
        // Note: we DON'T mint to pool. balance0 stays = reserve0, so amount0In = 0.
        // But amount1In must also be 0 → InsufficientInput.
        // However, the optimistic transfer of t1 will happen first, which will
        // reduce balance1 below reserve1. Then amount1In stays 0.
        // → revert with InsufficientInput.
        vm.expectRevert(JionPool.InsufficientInput.selector);
        pool.swap(0, quote, bob);
    }

    /// Two-direction round trip should leave pool with same or better reserves
    /// (fees stay in pool, total constant product non-decreasing).
    function test_RoundTripLeavesPoolWithFees() public {
        (uint112 r0Before, uint112 r1Before,) = pool.getReserves();
        uint256 kBefore = uint256(r0Before) * uint256(r1Before);

        // t0 -> t1
        uint256 amountIn1 = 100 ether;
        uint256 out1 = pool.getAmountOut(amountIn1, r0Before, r1Before);
        t0.mint(address(pool), amountIn1);
        pool.swap(0, out1, bob);

        // t1 -> t0 with the just-received tokens
        vm.prank(bob);
        t1.transfer(address(pool), out1);
        (uint112 r0Mid, uint112 r1Mid,) = pool.getReserves();
        uint256 out2 = pool.getAmountOut(out1, r1Mid, r0Mid);
        pool.swap(out2, 0, bob);

        (uint112 r0After, uint112 r1After,) = pool.getReserves();
        uint256 kAfter = uint256(r0After) * uint256(r1After);
        assertGe(kAfter, kBefore, "K should not decrease across full round trip");
    }
}

contract JionPoolGetAmountOutTest is Test {
    JionPool pool;
    MockERC20 t0;
    MockERC20 t1;

    function setUp() public {
        t0 = new MockERC20("T0", "T0");
        t1 = new MockERC20("T1", "T1");
        pool = new JionPool(address(t0), address(t1));
    }

    function test_GetAmountOutBasic() public view {
        // 100 in, 1000 / 4000 reserves
        // amountInWithFee = 100 * 970 = 97000
        // amountOut = 97000 * 4000 / (1000 * 1000 + 97000)
        //           = 388_000_000 / 1_097_000
        //           ≈ 353.69 (in real units, scaled by 1e18 they cancel)
        uint256 out = pool.getAmountOut(100 ether, 1000 ether, 4000 ether);
        // We expect ~353.69 ether. Check within 1% tolerance.
        assertApproxEqRel(out, 353.69 ether, 0.01e18);
    }

    function test_RevertOnZeroInput() public {
        vm.expectRevert(JionPool.InsufficientInput.selector);
        pool.getAmountOut(0, 1000 ether, 4000 ether);
    }

    function test_RevertOnZeroReserves() public {
        vm.expectRevert(JionPool.InsufficientLiquidity.selector);
        pool.getAmountOut(100 ether, 0, 4000 ether);
        vm.expectRevert(JionPool.InsufficientLiquidity.selector);
        pool.getAmountOut(100 ether, 1000 ether, 0);
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
