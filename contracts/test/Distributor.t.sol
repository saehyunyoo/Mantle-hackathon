// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { Distributor } from "../src/Distributor.sol";
import { IJionAdapter } from "../src/adapters/IJionAdapter.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

/**
 * Minimal in-memory adapter for testing — records what it received.
 */
contract RecordingAdapter is IJionAdapter {
    string public override name;
    uint8 public override kind;
    uint256 public lastAmountToken;
    uint256 public lastAmountQuote;
    address public lastTokenAddr;
    address public lastQuoteAddr;
    uint256 public listCallCount;

    constructor(string memory n, uint8 k) {
        name = n;
        kind = k;
    }

    function list(
        address token,
        address quote,
        uint256 amountToken,
        uint256 amountQuote
    ) external returns (bytes32 positionId) {
        listCallCount++;
        lastTokenAddr = token;
        lastQuoteAddr = quote;
        lastAmountToken = amountToken;
        lastAmountQuote = amountQuote;
        return keccak256(abi.encodePacked(token, quote, address(this), listCallCount));
    }

    function withdraw(bytes32) external pure returns (uint256, uint256) {
        return (0, 0);
    }

    function volume24h(address) external pure returns (uint256) {
        return 0;
    }

    function isHealthy() external pure returns (bool) {
        return true;
    }
}

contract DistributorTest is Test {
    Distributor dist;
    MockERC20 token;
    MockERC20 quote;
    RecordingAdapter adapterA;
    RecordingAdapter adapterB;
    address owner = address(0xA11CE);

    event AdapterAdded(address indexed adapter, string name);
    event TokenDistributed(
        address indexed token,
        address indexed adapter,
        uint256 amountToken,
        uint256 amountQuote,
        uint16 weightBps,
        bytes32 positionId
    );

    function setUp() public {
        vm.prank(owner);
        dist = new Distributor(owner);

        token = new MockERC20("mNVDA", "mNVDA");
        quote = new MockERC20("USDC", "USDC");

        adapterA = new RecordingAdapter("SelfPool", 0);
        adapterB = new RecordingAdapter("Lendle-mock", 1);

        vm.startPrank(owner);
        dist.addAdapter(address(adapterA));
        dist.addAdapter(address(adapterB));
        vm.stopPrank();

        // Pre-fund the Distributor with the full supply it will fan out.
        token.mint(address(dist), 10_000 ether);
        quote.mint(address(dist), 10_000 ether);
    }

    function test_AdaptersWhitelisted() public view {
        assertTrue(dist.isAdapter(address(adapterA)));
        assertTrue(dist.isAdapter(address(adapterB)));
        assertFalse(dist.isAdapter(address(0xDEAD)));
    }

    function test_DistributeSplitByWeights() public {
        address[] memory adapters = new address[](2);
        adapters[0] = address(adapterA);
        adapters[1] = address(adapterB);

        uint16[] memory weights = new uint16[](2);
        weights[0] = 7_000; // 70%
        weights[1] = 3_000; // 30%

        vm.prank(owner);
        dist.distribute(
            address(token),
            address(quote),
            10_000 ether,
            10_000 ether,
            adapters,
            weights
        );

        // Adapter A receives 70%
        assertEq(token.balanceOf(address(adapterA)), 7_000 ether);
        assertEq(quote.balanceOf(address(adapterA)), 7_000 ether);

        // Adapter B receives 30%
        assertEq(token.balanceOf(address(adapterB)), 3_000 ether);
        assertEq(quote.balanceOf(address(adapterB)), 3_000 ether);

        // Recording adapter saw the right args
        assertEq(adapterA.lastAmountToken(), 7_000 ether);
        assertEq(adapterB.lastAmountToken(), 3_000 ether);

        // Position ids recorded
        assertTrue(dist.positionOf(address(token), address(adapterA)) != bytes32(0));
        assertTrue(dist.positionOf(address(token), address(adapterB)) != bytes32(0));

        // venuesOf
        address[] memory venues = dist.venuesOf(address(token));
        assertEq(venues.length, 2);
        assertEq(venues[0], address(adapterA));
        assertEq(venues[1], address(adapterB));
    }

    function test_RevertOnNonAdapter() public {
        address[] memory adapters = new address[](1);
        adapters[0] = address(0xDEAD);
        uint16[] memory weights = new uint16[](1);
        weights[0] = 5_000;

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Distributor.NotAdapter.selector, address(0xDEAD))
        );
        dist.distribute(address(token), address(quote), 1_000 ether, 1_000 ether, adapters, weights);
    }

    function test_RevertOnWeightsOver100Pct() public {
        address[] memory adapters = new address[](2);
        adapters[0] = address(adapterA);
        adapters[1] = address(adapterB);
        uint16[] memory weights = new uint16[](2);
        weights[0] = 7_000;
        weights[1] = 4_000; // sums to 110%

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Distributor.WeightsExceedMax.selector, 11_000)
        );
        dist.distribute(address(token), address(quote), 1_000 ether, 1_000 ether, adapters, weights);
    }

    function test_RevertOnLengthMismatch() public {
        address[] memory adapters = new address[](2);
        adapters[0] = address(adapterA);
        adapters[1] = address(adapterB);
        uint16[] memory weights = new uint16[](1);
        weights[0] = 5_000;

        vm.prank(owner);
        vm.expectRevert(Distributor.LengthMismatch.selector);
        dist.distribute(address(token), address(quote), 1_000 ether, 1_000 ether, adapters, weights);
    }

    function test_RevertOnEmptyPlan() public {
        address[] memory adapters = new address[](0);
        uint16[] memory weights = new uint16[](0);

        vm.prank(owner);
        vm.expectRevert(Distributor.EmptyPlan.selector);
        dist.distribute(address(token), address(quote), 1_000 ether, 1_000 ether, adapters, weights);
    }

    function test_OnlyOwnerCanDistribute() public {
        address[] memory adapters = new address[](1);
        adapters[0] = address(adapterA);
        uint16[] memory weights = new uint16[](1);
        weights[0] = 5_000;

        vm.prank(address(0xBEEF));
        vm.expectRevert();
        dist.distribute(address(token), address(quote), 1_000 ether, 1_000 ether, adapters, weights);
    }

    function test_RemoveAdapterBlocksFutureDistribute() public {
        vm.prank(owner);
        dist.removeAdapter(address(adapterA));
        assertFalse(dist.isAdapter(address(adapterA)));

        address[] memory adapters = new address[](1);
        adapters[0] = address(adapterA);
        uint16[] memory weights = new uint16[](1);
        weights[0] = 5_000;

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Distributor.NotAdapter.selector, address(adapterA))
        );
        dist.distribute(address(token), address(quote), 1_000 ether, 1_000 ether, adapters, weights);
    }
}
