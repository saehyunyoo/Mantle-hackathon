// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { Settlement } from "../src/Settlement.sol";
import { Distributor } from "../src/Distributor.sol";
import { IJionAdapter } from "../src/adapters/IJionAdapter.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

/**
 * Configurable adapter for Settlement tests:
 *  - volume24h() returns a controllable value
 *  - withdraw(positionId) returns pre-set (token, quote) amounts AND transfers
 *    them to msg.sender (the Settlement contract) so the contract can take
 *    the fee + custody the rest.
 */
contract VenueAdapter is IJionAdapter {
    string public override name;
    uint8 public override kind;
    uint256 public configuredVolume;
    uint256 public withdrawAmountToken;
    uint256 public withdrawAmountQuote;
    address public tokenContract;
    address public quoteContract;
    bytes32 public lastPositionId;
    uint256 public withdrawCallCount;

    constructor(string memory n) {
        name = n;
        kind = 0;
    }

    function configureWithdraw(
        address token,
        address quote,
        uint256 amountToken,
        uint256 amountQuote
    ) external {
        tokenContract = token;
        quoteContract = quote;
        withdrawAmountToken = amountToken;
        withdrawAmountQuote = amountQuote;
    }

    function setVolume(uint256 v) external {
        configuredVolume = v;
    }

    function list(address, address, uint256, uint256)
        external
        returns (bytes32 positionId)
    {
        positionId = keccak256(abi.encodePacked(address(this), block.timestamp));
        lastPositionId = positionId;
        return positionId;
    }

    function withdraw(bytes32 positionId)
        external
        returns (uint256 amountTokenOut, uint256 amountQuoteOut)
    {
        positionId; // silence
        withdrawCallCount++;
        if (withdrawAmountToken > 0) {
            MockERC20(tokenContract).mint(msg.sender, withdrawAmountToken);
        }
        if (withdrawAmountQuote > 0) {
            MockERC20(quoteContract).mint(msg.sender, withdrawAmountQuote);
        }
        return (withdrawAmountToken, withdrawAmountQuote);
    }

    function volume24h(address) external view returns (uint256) {
        return configuredVolume;
    }

    function isHealthy() external pure returns (bool) {
        return true;
    }
}

contract SettlementTest is Test {
    Distributor dist;
    Settlement settlement;
    MockERC20 token;       // mock JionToken (e.g. mNVDA)
    MockERC20 usdc;        // mock USDC (6 decimals would be ideal but using 18 for simpler math)
    VenueAdapter venueA;
    VenueAdapter venueB;

    address owner = address(0xA11CE);
    address feeVault = address(0xFEE5);
    address holder1 = address(0xBABE);
    address holder2 = address(0xCAFE);

    /// Helper: oracle says 1 mNVDA = 100 USDC, in (USDC base-units per 1e18 token).
    uint256 constant ORACLE_PRICE = 100 ether; // 100 USDC * 1e18 / 1e18 token = 100e18

    event Settled(
        address indexed token,
        uint256 totalVolume24h,
        uint256 oraclePriceUsdc,
        uint256 grossUsdc,
        uint256 feeUsdc,
        uint256 netUsdc,
        uint256 timestamp
    );
    event Claimed(
        address indexed token,
        address indexed holder,
        uint256 tokenAmount,
        uint256 usdcPayout
    );

    function setUp() public {
        vm.startPrank(owner);
        dist = new Distributor(owner);
        usdc = new MockERC20("USDC", "USDC");
        token = new MockERC20("mNVDA", "mNVDA");
        settlement = new Settlement(address(usdc), dist, feeVault, owner);

        venueA = new VenueAdapter("VenueA");
        venueB = new VenueAdapter("VenueB");
        dist.addAdapter(address(venueA));
        dist.addAdapter(address(venueB));

        // Pre-fund Distributor and run distribute() so positionOf[token][venue] is set.
        token.mint(address(dist), 1_000 ether);
        usdc.mint(address(dist), 1_000 ether);

        address[] memory adapters = new address[](2);
        adapters[0] = address(venueA);
        adapters[1] = address(venueB);
        uint16[] memory weights = new uint16[](2);
        weights[0] = 6_000;
        weights[1] = 4_000;
        dist.distribute(
            address(token), address(usdc), 1_000 ether, 1_000 ether, adapters, weights
        );

        vm.stopPrank();
    }

    // -------------------------------------------------------------------
    // totalVolume24h aggregator
    // -------------------------------------------------------------------

    function test_TotalVolume24hSumsAcrossAdapters() public {
        venueA.setVolume(3_000 * 1e6);
        venueB.setVolume(4_500 * 1e6);
        assertEq(settlement.totalVolume24h(address(token)), 7_500 * 1e6);
    }

    // -------------------------------------------------------------------
    // forceSettle path
    // -------------------------------------------------------------------

    function test_RevertWhenVolumeAboveThreshold() public {
        venueA.setVolume(11_000 * 1e6); // > $10K
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                Settlement.VolumeAboveThreshold.selector,
                address(token),
                11_000 * 1e6
            )
        );
        settlement.forceSettle(address(token), ORACLE_PRICE);
    }

    function test_ForceSettleHappyPath() public {
        // Volumes well under $10K → settle is allowed.
        venueA.setVolume(2_000 * 1e6);
        venueB.setVolume(3_000 * 1e6);

        // Configure venues to return some token + USDC on withdraw.
        // venue A: 60 token + 100 USDC ; venue B: 40 token + 80 USDC
        venueA.configureWithdraw(address(token), address(usdc), 60 ether, 100 ether);
        venueB.configureWithdraw(address(token), address(usdc), 40 ether, 80 ether);

        vm.prank(owner);
        settlement.forceSettle(address(token), ORACLE_PRICE);

        // tokenAsUsdc per venue = amountToken * price / 1e18
        //   A: 60e18 * 100e18 / 1e18 = 6000e18
        //   B: 40e18 * 100e18 / 1e18 = 4000e18
        // gross = (6000+4000) + (100+80) = 10_180e18
        uint256 gross = 10_180 ether;
        uint256 fee = (gross * 50) / 10_000; // 0.5% = 50.9e18
        uint256 net = gross - fee;

        assertEq(settlement.settlementPriceUsdc(address(token)), ORACLE_PRICE);
        assertEq(settlement.settled(address(token)), true);
        assertEq(settlement.settlementPool(address(token)), net);
        assertEq(usdc.balanceOf(feeVault), fee);
        assertEq(venueA.withdrawCallCount(), 1);
        assertEq(venueB.withdrawCallCount(), 1);
    }

    function test_AlreadySettledReverts() public {
        venueA.setVolume(2_000 * 1e6);
        venueB.setVolume(3_000 * 1e6);
        venueA.configureWithdraw(address(token), address(usdc), 1 ether, 1 ether);
        venueB.configureWithdraw(address(token), address(usdc), 1 ether, 1 ether);

        vm.startPrank(owner);
        settlement.forceSettle(address(token), ORACLE_PRICE);

        vm.expectRevert(
            abi.encodeWithSelector(Settlement.AlreadySettled.selector, address(token))
        );
        settlement.forceSettle(address(token), ORACLE_PRICE);
        vm.stopPrank();
    }

    function test_RevertOnNoVenues() public {
        // A token that was never distributed.
        MockERC20 ghost = new MockERC20("ghost", "G");

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Settlement.NoVenues.selector, address(ghost))
        );
        settlement.forceSettle(address(ghost), ORACLE_PRICE);
    }

    function test_OnlyOwnerCanForceSettle() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        settlement.forceSettle(address(token), ORACLE_PRICE);
    }

    // -------------------------------------------------------------------
    // claim path
    // -------------------------------------------------------------------

    function test_HolderClaimPaysOutByOraclePrice() public {
        venueA.setVolume(2_000 * 1e6);
        venueB.setVolume(3_000 * 1e6);
        venueA.configureWithdraw(address(token), address(usdc), 60 ether, 100 ether);
        venueB.configureWithdraw(address(token), address(usdc), 40 ether, 80 ether);

        vm.prank(owner);
        settlement.forceSettle(address(token), ORACLE_PRICE);

        // Give holder1 some tokens (representing pre-settlement balance).
        token.mint(holder1, 5 ether);

        vm.startPrank(holder1);
        token.approve(address(settlement), 5 ether);
        uint256 received = settlement.claim(address(token));
        vm.stopPrank();

        // expected = 5e18 * 100e18 / 1e18 = 500e18
        assertEq(received, 500 ether);
        assertEq(usdc.balanceOf(holder1), 500 ether);
        assertEq(token.balanceOf(holder1), 0);
        assertEq(token.balanceOf(address(settlement)), 5 ether);
    }

    function test_ClaimBeforeSettleReverts() public {
        token.mint(holder1, 1 ether);

        vm.startPrank(holder1);
        token.approve(address(settlement), 1 ether);
        vm.expectRevert(
            abi.encodeWithSelector(Settlement.NotSettled.selector, address(token))
        );
        settlement.claim(address(token));
        vm.stopPrank();
    }

    function test_ClaimDeductsFromPool() public {
        venueA.setVolume(2_000 * 1e6);
        venueB.setVolume(3_000 * 1e6);
        venueA.configureWithdraw(address(token), address(usdc), 60 ether, 100 ether);
        venueB.configureWithdraw(address(token), address(usdc), 40 ether, 80 ether);

        vm.prank(owner);
        settlement.forceSettle(address(token), ORACLE_PRICE);

        uint256 poolBefore = settlement.settlementPool(address(token));
        token.mint(holder1, 3 ether);

        vm.startPrank(holder1);
        token.approve(address(settlement), 3 ether);
        settlement.claim(address(token));
        vm.stopPrank();

        assertEq(settlement.settlementPool(address(token)), poolBefore - 300 ether);
    }

    function test_ZeroBalanceClaimIsNoOp() public {
        venueA.setVolume(2_000 * 1e6);
        venueB.setVolume(3_000 * 1e6);
        venueA.configureWithdraw(address(token), address(usdc), 1 ether, 1 ether);
        venueB.configureWithdraw(address(token), address(usdc), 1 ether, 1 ether);

        vm.prank(owner);
        settlement.forceSettle(address(token), ORACLE_PRICE);

        // holder1 has no tokens
        vm.prank(holder1);
        uint256 received = settlement.claim(address(token));
        assertEq(received, 0);
    }
}
