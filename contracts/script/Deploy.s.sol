// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import { TokenFactory } from "../src/TokenFactory.sol";
import { OracleAdapter } from "../src/OracleAdapter.sol";
import { AgentLogger } from "../src/AgentLogger.sol";
import { JionRouter } from "../src/JionRouter.sol";
import { Distributor } from "../src/Distributor.sol";
import { Settlement } from "../src/Settlement.sol";
import { SelfPoolAdapter } from "../src/adapters/SelfPoolAdapter.sol";
import { MerchantMoeMockAdapter } from "../src/adapters/mocks/MerchantMoeMockAdapter.sol";
import { LendleMockAdapter } from "../src/adapters/mocks/LendleMockAdapter.sol";

/**
 * @notice Deploy core Jion contracts to Mantle Sepolia.
 *
 * Usage:
 *   source ../.env
 *   forge script script/Deploy.s.sol:DeployScript \
 *     --rpc-url $MANTLE_SEPOLIA_RPC \
 *     --broadcast \
 *     --private-key $DEPLOYER_PRIVATE_KEY
 *
 * After deploy, copy logged addresses into apps/web/lib/chain/addresses.ts.
 */
contract DeployScript is Script {
    /// @notice Mantle Sepolia Pyth contract (per docs/RESEARCH.md §1.1).
    address constant MANTLE_SEPOLIA_PYTH = 0x98046Bd286715D3B0BC227Dd7a956b83D8978603;

    /// @notice USDC placeholder for Sepolia. Replace with the actual mock-USDC
    ///         address after we deploy one (or use a known Mantle Sepolia
    ///         stable). Settled tokens pay holders in this token.
    address constant SEPOLIA_USDC_PLACEHOLDER = address(0);

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        TokenFactory factory = new TokenFactory(deployer);
        OracleAdapter oracle = new OracleAdapter(MANTLE_SEPOLIA_PYTH);
        AgentLogger logger = new AgentLogger(deployer);
        JionRouter router  = new JionRouter(deployer);
        Distributor dist   = new Distributor(deployer);
        SelfPoolAdapter selfAdapter = new SelfPoolAdapter(router, address(dist));

        // Register SelfPoolAdapter as the Phase-1 active venue.
        dist.addAdapter(address(selfAdapter));

        // T8: demo-only mock adapters so the multi-venue distribution story
        // can be shown on Sepolia (Merchant Moe / Lendle don't have Sepolia
        // instances). UI must label these as "Mock - Phase 2+".
        MerchantMoeMockAdapter moeMock = new MerchantMoeMockAdapter(deployer);
        LendleMockAdapter lendleMock = new LendleMockAdapter(deployer);
        dist.addAdapter(address(moeMock));
        dist.addAdapter(address(lendleMock));

        // Settlement uses USDC as the holder-payout token. On Sepolia we
        // deploy a mock USDC separately and update this address.
        address usdcAddr = vm.envOr("SEPOLIA_USDC", SEPOLIA_USDC_PLACEHOLDER);
        Settlement settlement = new Settlement(usdcAddr, dist, deployer, deployer);

        vm.stopBroadcast();

        console.log("=== Jion - Mantle Sepolia ===");
        console.log("Deployer:       ", deployer);
        console.log("TokenFactory:   ", address(factory));
        console.log("OracleAdapter:  ", address(oracle));
        console.log("AgentLogger:    ", address(logger));
        console.log("JionRouter:     ", address(router));
        console.log("Distributor:    ", address(dist));
        console.log("SelfPoolAdapter:", address(selfAdapter));
        console.log("Settlement:     ", address(settlement));
        console.log("MoE-Mock:       ", address(moeMock));
        console.log("Lendle-Mock:    ", address(lendleMock));
        console.log("USDC:           ", usdcAddr);
        console.log("Pyth (mantle):  ", MANTLE_SEPOLIA_PYTH);
    }
}
