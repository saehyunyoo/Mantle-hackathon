// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import { MockUSDC } from "../src/MockUSDC.sol";
import { Settlement } from "../src/Settlement.sol";
import { Distributor } from "../src/Distributor.sol";

/**
 * @notice Add MockUSDC + new Settlement on top of an existing deploy.
 *
 * Why: the first deploy (PR #22) wired Settlement.usdc to address(0)
 * because no real USDC exists on Mantle Sepolia. usdc is immutable, so
 * the only fix is to deploy a fresh Settlement that points at MockUSDC.
 *
 * This script:
 *   1. Deploys MockUSDC
 *   2. Deploys a NEW Settlement (pointing at the MockUSDC + the EXISTING
 *      Distributor at the address baked in here)
 *
 * Leaves untouched: TokenFactory, OracleAdapter, AgentLogger, JionRouter,
 * Distributor, SelfPoolAdapter, MerchantMoeMockAdapter, LendleMockAdapter,
 * and the old (zero-USDC) Settlement contract — which becomes a no-op.
 *
 * After running: copy MockUSDC + new Settlement addresses into
 * packages/types/src/addresses.ts (USDC, Settlement fields).
 *
 * Usage:
 *   source ../.env
 *   forge script script/DeployUsdcAndSettlement.s.sol:DeployUsdcAndSettlement \
 *     --rpc-url $MANTLE_SEPOLIA_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployUsdcAndSettlement is Script {
    /// @notice Distributor from PR #22 first deploy on Mantle Sepolia.
    address constant EXISTING_DISTRIBUTOR =
        0x28656C984Ac361FE1a31CD4e13C28d97Dc838cF6;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC(deployer);

        Settlement settlement = new Settlement(
            address(usdc),
            Distributor(EXISTING_DISTRIBUTOR),
            deployer, // feeVault
            deployer  // owner
        );

        vm.stopBroadcast();

        console.log("=== USDC + Settlement re-wire ===");
        console.log("Deployer:    ", deployer);
        console.log("MockUSDC:    ", address(usdc));
        console.log("Settlement:  ", address(settlement));
        console.log("Distributor: ", EXISTING_DISTRIBUTOR, "(existing)");
        console.log("");
        console.log("Next: update packages/types/src/addresses.ts");
        console.log("  USDC       -> MockUSDC address above");
        console.log("  Settlement -> new Settlement address above");
    }
}
