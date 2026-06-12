// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { Settlement } from "../src/Settlement.sol";
import { Distributor } from "../src/Distributor.sol";
import { IJionAdapter } from "../src/adapters/IJionAdapter.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

/**
 * Configurable adapter: returns pre-set (token, quote) amounts on withdraw
 * AND transfers them from its own balance to msg.sender (Settlement).
 *
 * Setup pattern in tests:
 *   1. mint token + usdc directly to the adapter (simulating what it would
 *      hold via list()).
 *   2. configureWithdraw to declare how much it will return.
 *   3. forceSettle → adapter.withdraw transfers from adapter to Settlement.
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

    function list(address, address, uint256, uint256) external returns (bytes32 positionId) {
        positionId = keccak256(abi.encodePacked(address(this), block.timestamp, withdrawCallCount));
        lastPositionId = positionId;
        return positionId;
    }

    /// @dev Transfers from the adapter's own balance — caller must have
    ///      pre-funded the adapter with both tokens.
    function withdraw(bytes32 positionId)
        external
        returns (uint256 amountTokenOut, uint256 amountQuoteOut)
    {
        positionId; // silence
        withdrawCallCount++;

        if (withdrawAmountToken > 0) {
            require(
                MockERC20(tokenContract).transfer(msg.sender, withdrawAmountToken),
                "venue: token transfer failed"
            );
        }
        if (withdrawAmountQuote > 0) {
            require(
                MockERC20(quoteContract).transfer(msg.sender, withdrawAmountQuote),
                "venue: quote transfer failed"
            );
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
    MockERC20 token;
    MockERC20 usdc;
    VenueAdapter venueA;
    VenueAdapter venueB;

    address owner = address(0xA11CE);
    address feeVault = address(0xFEE5);
    address holder1 = address(0xBABE);

    /// Oracle price stamped for display (USDC per 1e18 token).
    uint256 constant ORACLE_PRICE = 100 ether;

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

        // Mint to the Distributor so distribute() can fan tokens out.
        // We pretend the token has totalSupply = 1_000 (all initially with Distributor).
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
        venueA.setVolume(11_000 * 1e6);
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
        venueA.setVolume(2_000 * 1e6);
        venueB.setVolume(3_000 * 1e6);

        // Venue A holds 600 token + 600 USDC from distribute().
        // Make A return 60 token + 100 USDC and B return 40 + 80.
        venueA.configureWithdraw(address(token), address(usdc), 60 ether, 100 ether);
        venueB.configureWithdraw(address(token), address(usdc), 40 ether, 80 ether);

        vm.prank(owner);
        settlement.forceSettle(address(token), ORACLE_PRICE);

        // Recovered: 100 token + 180 USDC.
        // fee = 180e18 * 50 / 10000 = 0.9e18
        uint256 fee = (180 ether * 50) / 10_000;
        uint256 netUsdc = 180 ether - fee;

        assertEq(settlement.settled(address(token)), true);
        assertEq(settlement.settlementPriceUsdc(address(token)), ORACLE_PRICE);
        assertEq(settlement.settlementPool(address(token)), netUsdc);
        assertEq(usdc.balanceOf(feeVault), fee);

        // circulating = totalSupply - recoveredToken = 1000 - 100 = 900
        assertEq(settlement.circulatingAtSettle(address(token)), 900 ether);

        // Settlement now holds the recovered tokens + (net) USDC.
        assertEq(token.balanceOf(address(settlement)), 100 ether);
        assertEq(usdc.balanceOf(address(settlement)), netUsdc);

        // Both adapters were called once.
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
    // claim path — pro-rata of recovered USDC by circulating share
    // -------------------------------------------------------------------

    function _settleWithRecovery() internal {
        venueA.setVolume(2_000 * 1e6);
        venueB.setVolume(3_000 * 1e6);
        venueA.configureWithdraw(address(token), address(usdc), 60 ether, 100 ether);
        venueB.configureWithdraw(address(token), address(usdc), 40 ether, 80 ether);
        vm.prank(owner);
        settlement.forceSettle(address(token), ORACLE_PRICE);
    }

    function test_HolderClaimProRata() public {
        _settleWithRecovery();

        // Give holder1 some tokens (simulate pre-settle balance from circulating supply).
        // We mint extra — totalSupply now climbs but circulatingAtSettle was stamped earlier
        // at 900, so the pro-rata math uses 900 even if we mint after.
        token.mint(holder1, 90 ether); // 10% of circulating snapshot

        uint256 poolBefore = settlement.settlementPool(address(token));
        // expected = balance * pool / circ = 90e18 * 179.1e18 / 900e18 = 17.91e18
        uint256 expected = (90 ether * poolBefore) / 900 ether;

        vm.startPrank(holder1);
        token.approve(address(settlement), 90 ether);
        uint256 received = settlement.claim(address(token));
        vm.stopPrank();

        assertEq(received, expected);
        assertEq(usdc.balanceOf(holder1), expected);
        assertEq(token.balanceOf(holder1), 0);

        // Pool + circ decremented.
        assertEq(settlement.settlementPool(address(token)), poolBefore - expected);
        assertEq(settlement.circulatingAtSettle(address(token)), 900 ether - 90 ether);
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

    function test_ZeroBalanceClaimIsNoOp() public {
        _settleWithRecovery();
        vm.prank(holder1);
        uint256 received = settlement.claim(address(token));
        assertEq(received, 0);
    }

    function test_TwoHoldersTotalToPool() public {
        _settleWithRecovery();
        uint256 poolBefore = settlement.settlementPool(address(token));

        // holder1 gets 90, holder2 gets 90 ether.
        address holder2 = address(0xCAFE);
        token.mint(holder1, 90 ether);
        token.mint(holder2, 90 ether);

        vm.startPrank(holder1);
        token.approve(address(settlement), 90 ether);
        uint256 got1 = settlement.claim(address(token));
        vm.stopPrank();

        vm.startPrank(holder2);
        token.approve(address(settlement), 90 ether);
        uint256 got2 = settlement.claim(address(token));
        vm.stopPrank();

        // Each gets ~10% of pool. Together ~20%.
        assertEq(got1 + got2, (poolBefore * 180 ether) / 900 ether);
        assertGt(got1, 0);
        assertGt(got2, 0);
    }

    // -------------------------------------------------------------------
    // Voluntary redemption (PLAN §4.4)
    // -------------------------------------------------------------------

    // Price in USDC raw units per WHOLE token. With our mock USDC at 18
    // decimals in this test (MockERC20 default), match scale on both sides.
    uint256 constant REDEEM_PRICE = 145 ether; // 145 USDC per 1 mNVDA

    function _seedSettlementUsdc(uint256 amount) internal {
        // Pre-fund Settlement so it can pay redemptions out of its own balance
        // (matches production where the protocol vault seeds the contract).
        vm.prank(owner);
        usdc.mint(address(settlement), amount);
    }

    function test_SetOraclePriceOwnerOnly() public {
        vm.prank(owner);
        settlement.setOraclePrice(address(token), REDEEM_PRICE);
        assertEq(
            settlement.oraclePriceUsdcPerWholeToken(address(token)),
            REDEEM_PRICE
        );

        vm.prank(holder1);
        vm.expectRevert();
        settlement.setOraclePrice(address(token), 1);
    }

    function test_RedeemHappyPath() public {
        // Holder receives 10 tokens from the day's distribution mock-up.
        token.mint(holder1, 10 ether);

        vm.prank(owner);
        settlement.setOraclePrice(address(token), REDEEM_PRICE);

        // Solvency seed.
        _seedSettlementUsdc(2_000 ether);

        // Redeem 5 tokens → grossUsdc = 5 * 145 = 725, fee 0.5% = 3.625,
        // net = 721.375
        uint256 grossUsdc = (5 ether * REDEEM_PRICE) / 1 ether; // 725 ether
        uint256 fee = (grossUsdc * 50) / 10_000;
        uint256 expectedNet = grossUsdc - fee;

        vm.startPrank(holder1);
        token.approve(address(settlement), 5 ether);
        uint256 got = settlement.redeem(address(token), 5 ether);
        vm.stopPrank();

        assertEq(got, expectedNet);
        assertEq(usdc.balanceOf(holder1), expectedNet);
        assertEq(usdc.balanceOf(feeVault), fee);
        // Tokens are locked in Settlement (effective burn / retired supply).
        assertEq(token.balanceOf(address(settlement)), 5 ether);
        assertEq(token.balanceOf(holder1), 5 ether);
        // Analytics
        assertEq(settlement.totalRedeemed(address(token)), 5 ether);
        assertEq(settlement.totalUsdcRedeemed(address(token)), expectedNet);
    }

    function test_RedeemRevertsZeroAmount() public {
        vm.prank(owner);
        settlement.setOraclePrice(address(token), REDEEM_PRICE);

        vm.prank(holder1);
        vm.expectRevert(Settlement.ZeroAmount.selector);
        settlement.redeem(address(token), 0);
    }

    function test_RedeemRevertsNoOraclePrice() public {
        token.mint(holder1, 5 ether);
        _seedSettlementUsdc(1_000 ether);

        vm.startPrank(holder1);
        token.approve(address(settlement), 5 ether);
        vm.expectRevert(
            abi.encodeWithSelector(
                Settlement.NoOraclePrice.selector,
                address(token)
            )
        );
        settlement.redeem(address(token), 5 ether);
        vm.stopPrank();
    }

    function test_RedeemRevertsInsufficientLiquidity() public {
        token.mint(holder1, 10 ether);
        vm.prank(owner);
        settlement.setOraclePrice(address(token), REDEEM_PRICE);
        // Intentionally do NOT seed Settlement USDC.

        vm.startPrank(holder1);
        token.approve(address(settlement), 5 ether);
        vm.expectRevert(); // InsufficientLiquidity custom error
        settlement.redeem(address(token), 5 ether);
        vm.stopPrank();
    }

    function test_RedeemSetOraclePricesBatch() public {
        MockERC20 token2 = new MockERC20("mTSLA", "mTSLA");

        address[] memory tokens = new address[](2);
        tokens[0] = address(token);
        tokens[1] = address(token2);
        uint256[] memory prices = new uint256[](2);
        prices[0] = REDEEM_PRICE;
        prices[1] = 230 ether;

        vm.prank(owner);
        settlement.setOraclePrices(tokens, prices);

        assertEq(
            settlement.oraclePriceUsdcPerWholeToken(address(token)),
            REDEEM_PRICE
        );
        assertEq(
            settlement.oraclePriceUsdcPerWholeToken(address(token2)),
            230 ether
        );
    }
}
