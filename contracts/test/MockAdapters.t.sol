// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { Distributor } from "../src/Distributor.sol";
import { MerchantMoeMockAdapter } from "../src/adapters/mocks/MerchantMoeMockAdapter.sol";
import { LendleMockAdapter } from "../src/adapters/mocks/LendleMockAdapter.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

/**
 * T8 integration test — Distributor fans a single token into BOTH a mock
 * AMM (MerchantMoe-Mock) and a mock LENDING (Lendle-Mock) in the same
 * transaction. Verifies that multi-venue listing works end-to-end through
 * the IJionAdapter interface.
 */
contract MockAdaptersTest is Test {
    Distributor dist;
    MerchantMoeMockAdapter moe;
    LendleMockAdapter lendle;
    MockERC20 token;
    MockERC20 usdc;

    address owner = address(0xA11CE);

    function setUp() public {
        vm.startPrank(owner);
        dist = new Distributor(owner);
        moe = new MerchantMoeMockAdapter(owner);
        lendle = new LendleMockAdapter(owner);
        dist.addAdapter(address(moe));
        dist.addAdapter(address(lendle));
        vm.stopPrank();

        token = new MockERC20("mNVDA", "mNVDA");
        usdc = new MockERC20("USDC", "USDC");

        // Pre-fund Distributor.
        token.mint(address(dist), 1_000 ether);
        usdc.mint(address(dist), 1_000 ether);
    }

    function test_DistributeAcrossMoeAndLendleInOneTx() public {
        address[] memory adapters = new address[](2);
        adapters[0] = address(moe);
        adapters[1] = address(lendle);
        uint16[] memory weights = new uint16[](2);
        weights[0] = 6_000; // 60% to AMM mock
        weights[1] = 4_000; // 40% to LENDING mock

        vm.prank(owner);
        dist.distribute(
            address(token),
            address(usdc),
            1_000 ether,
            1_000 ether,
            adapters,
            weights
        );

        // Each adapter received its weighted share.
        assertEq(token.balanceOf(address(moe)), 600 ether);
        assertEq(usdc.balanceOf(address(moe)), 600 ether);
        assertEq(token.balanceOf(address(lendle)), 400 ether);
        assertEq(usdc.balanceOf(address(lendle)), 400 ether);

        // venuesOf and positionOf both populated.
        address[] memory venues = dist.venuesOf(address(token));
        assertEq(venues.length, 2);
        assertTrue(dist.positionOf(address(token), address(moe)) != bytes32(0));
        assertTrue(dist.positionOf(address(token), address(lendle)) != bytes32(0));

        // Adapter kinds differ — AI router can use this to weight differently.
        assertEq(moe.kind(), 0); // AMM
        assertEq(lendle.kind(), 1); // LENDING
    }

    function test_MoeMockListRecordsPosition() public {
        // List directly (bypassing Distributor for unit test).
        token.mint(address(moe), 100 ether);
        usdc.mint(address(moe), 100 ether);

        bytes32 posId = moe.list(address(token), address(usdc), 100 ether, 100 ether);

        (
            address t,
            address q,
            uint256 at,
            uint256 aq,
            bool active
        ) = moe.positions(posId);
        assertEq(t, address(token));
        assertEq(q, address(usdc));
        assertEq(at, 100 ether);
        assertEq(aq, 100 ether);
        assertTrue(active);
    }

    function test_MoeMockWithdrawReturnsToCaller() public {
        token.mint(address(moe), 100 ether);
        usdc.mint(address(moe), 100 ether);
        bytes32 posId = moe.list(address(token), address(usdc), 100 ether, 100 ether);

        (uint256 a, uint256 b) = moe.withdraw(posId);
        assertEq(a, 100 ether);
        assertEq(b, 100 ether);
        // Tokens returned to this test contract (caller of withdraw).
        assertEq(token.balanceOf(address(this)), 100 ether);
        assertEq(usdc.balanceOf(address(this)), 100 ether);
    }

    function test_MoeMockWithdrawTwiceReverts() public {
        token.mint(address(moe), 50 ether);
        usdc.mint(address(moe), 50 ether);
        bytes32 posId = moe.list(address(token), address(usdc), 50 ether, 50 ether);

        moe.withdraw(posId);
        vm.expectRevert(
            abi.encodeWithSelector(MerchantMoeMockAdapter.AlreadyClosed.selector, posId)
        );
        moe.withdraw(posId);
    }

    function test_LendleMockIsLendingKind() public view {
        assertEq(lendle.kind(), 1);
        assertEq(lendle.name(), "Lendle-Mock");
        assertTrue(lendle.isHealthy());
    }

    function test_ControllerCanPushVolume() public {
        vm.prank(owner);
        moe.setVolume24h(address(token), 12_345);
        assertEq(moe.volume24h(address(token)), 12_345);

        vm.prank(owner);
        lendle.setVolume24h(address(token), 6_789);
        assertEq(lendle.volume24h(address(token)), 6_789);
    }

    function test_NonControllerCannotPushVolume() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(MerchantMoeMockAdapter.NotController.selector);
        moe.setVolume24h(address(token), 1);

        vm.prank(address(0xBEEF));
        vm.expectRevert(LendleMockAdapter.NotController.selector);
        lendle.setVolume24h(address(token), 1);
    }
}
