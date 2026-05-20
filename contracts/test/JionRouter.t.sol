// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { JionRouter } from "../src/JionRouter.sol";
import { JionPool } from "../src/JionPool.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract JionRouterTest is Test {
    JionRouter router;
    MockERC20 tA;
    MockERC20 tB;

    address admin = address(0xA11CE);
    address lp    = address(0xBABE);
    address user  = address(0xC0DE);
    address recv  = address(0xDEAD);

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        uint256 pairIndex
    );

    function setUp() public {
        router = new JionRouter(admin);
        tA = new MockERC20("TokenA", "TA");
        tB = new MockERC20("TokenB", "TB");
    }

    // -----------------------------------------------------------------
    // createPair
    // -----------------------------------------------------------------

    function test_CreatePair() public {
        address pool = router.createPair(address(tA), address(tB));
        assertTrue(pool != address(0));
        assertEq(router.allPairsLength(), 1);
        assertEq(router.pairOf(address(tA), address(tB)), pool);
        assertEq(router.pairOf(address(tB), address(tA)), pool); // symmetric
    }

    function test_CreatePairRevertsOnDuplicate() public {
        router.createPair(address(tA), address(tB));
        vm.expectRevert(JionRouter.PoolAlreadyExists.selector);
        router.createPair(address(tA), address(tB));
        // reverse order also blocked
        vm.expectRevert(JionRouter.PoolAlreadyExists.selector);
        router.createPair(address(tB), address(tA));
    }

    function test_CreatePairRevertsOnInvalid() public {
        vm.expectRevert(JionRouter.InvalidPair.selector);
        router.createPair(address(tA), address(tA));
        vm.expectRevert(JionRouter.InvalidPair.selector);
        router.createPair(address(0), address(tB));
    }

    // -----------------------------------------------------------------
    // addLiquidity
    // -----------------------------------------------------------------

    function _seedPool() internal returns (address pool) {
        pool = router.createPair(address(tA), address(tB));

        // LP gets some tokens and approves router.
        tA.mint(lp, 10_000 ether);
        tB.mint(lp, 40_000 ether);

        vm.startPrank(lp);
        tA.approve(address(router), type(uint256).max);
        tB.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    function test_AddLiquidityFirstMint() public {
        address pool = _seedPool();

        vm.prank(lp);
        uint256 liquidity = router.addLiquidity(
            address(tA),
            address(tB),
            1000 ether,
            4000 ether,
            lp
        );

        // sqrt(1000e18 * 4000e18) - 1000 = 2000e18 - 1000
        assertEq(liquidity, 2000 ether - 1000);
        assertEq(JionPool(pool).balanceOf(lp), liquidity);
        assertEq(tA.balanceOf(pool), 1000 ether);
        assertEq(tB.balanceOf(pool), 4000 ether);
    }

    function test_AddLiquidityRevertsWithoutPool() public {
        tA.mint(lp, 1000 ether);
        tB.mint(lp, 1000 ether);

        vm.startPrank(lp);
        tA.approve(address(router), type(uint256).max);
        tB.approve(address(router), type(uint256).max);
        vm.expectRevert(JionRouter.PoolNotFound.selector);
        router.addLiquidity(address(tA), address(tB), 100, 100, lp);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------
    // swapExactTokensForTokens
    // -----------------------------------------------------------------

    function _seedAndAddLiquidity() internal returns (address pool) {
        pool = _seedPool();
        vm.prank(lp);
        router.addLiquidity(address(tA), address(tB), 1000 ether, 4000 ether, lp);
    }

    function test_SwapExactTokensTAforTB() public {
        address pool = _seedAndAddLiquidity();

        // user has 100 tA, approves router
        tA.mint(user, 100 ether);
        vm.startPrank(user);
        tA.approve(address(router), type(uint256).max);

        uint256 quoted = router.getAmountOut(address(tA), address(tB), 100 ether);
        assertGt(quoted, 0);

        uint256 received = router.swapExactTokensForTokens(
            address(tA),
            address(tB),
            100 ether,
            quoted, // exact min
            recv
        );
        vm.stopPrank();

        assertEq(received, quoted);
        assertEq(tB.balanceOf(recv), quoted);
        assertEq(tA.balanceOf(user), 0);
        assertEq(tA.balanceOf(pool), 1000 ether + 100 ether);
    }

    function test_SwapRevertsOnSlippage() public {
        _seedAndAddLiquidity();

        tA.mint(user, 100 ether);
        vm.startPrank(user);
        tA.approve(address(router), type(uint256).max);

        uint256 quoted = router.getAmountOut(address(tA), address(tB), 100 ether);

        // demand 10% more than quoted → should revert
        vm.expectRevert(JionRouter.InsufficientOutput.selector);
        router.swapExactTokensForTokens(
            address(tA),
            address(tB),
            100 ether,
            (quoted * 110) / 100,
            recv
        );
        vm.stopPrank();
    }

    function test_SwapRevertsWithoutPool() public {
        tA.mint(user, 100 ether);
        vm.startPrank(user);
        tA.approve(address(router), type(uint256).max);
        vm.expectRevert(JionRouter.PoolNotFound.selector);
        router.swapExactTokensForTokens(address(tA), address(tB), 100 ether, 0, recv);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------
    // getAmountOut quoting
    // -----------------------------------------------------------------

    function test_GetAmountOutMatchesPool() public {
        address pool = _seedAndAddLiquidity();
        uint256 routerQuote = router.getAmountOut(address(tA), address(tB), 100 ether);
        (uint112 r0, uint112 r1,) = JionPool(pool).getReserves();
        // tA might be token0 or token1 depending on address sort; resolve both.
        uint256 poolQuote = address(tA) < address(tB)
            ? JionPool(pool).getAmountOut(100 ether, uint256(r0), uint256(r1))
            : JionPool(pool).getAmountOut(100 ether, uint256(r1), uint256(r0));
        assertEq(routerQuote, poolQuote);
    }

    function test_GetAmountOutRevertsWithoutPool() public {
        vm.expectRevert(JionRouter.PoolNotFound.selector);
        router.getAmountOut(address(tA), address(tB), 100 ether);
    }
}
