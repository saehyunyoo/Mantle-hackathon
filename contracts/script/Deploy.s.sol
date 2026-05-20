// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import { TokenFactory } from "../src/TokenFactory.sol";
import { OracleAdapter } from "../src/OracleAdapter.sol";
import { AgentLogger } from "../src/AgentLogger.sol";
import { JionRouter } from "../src/JionRouter.sol";
import { Distributor } from "../src/Distributor.sol";
import { SelfPoolAdapter } from "../src/adapters/SelfPoolAdapter.sol";

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

        vm.stopBroadcast();

        console.log("=== Jion - Mantle Sepolia ===");
        console.log("Deployer:       ", deployer);
        console.log("TokenFactory:   ", address(factory));
        console.log("OracleAdapter:  ", address(oracle));
        console.log("AgentLogger:    ", address(logger));
        console.log("JionRouter:     ", address(router));
        console.log("Distributor:    ", address(dist));
        console.log("SelfPoolAdapter:", address(selfAdapter));
        console.log("Pyth (mantle):  ", MANTLE_SEPOLIA_PYTH);
    }
}
