// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";

/**
 * @notice Deploy all Jion core contracts to Mantle Sepolia.
 * Usage: forge script script/Deploy.s.sol:DeployScript --rpc-url $MANTLE_SEPOLIA_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        TokenFactory factory = new TokenFactory();
        console.log("TokenFactory deployed:", address(factory));

        // TODO(W2): OracleAdapter, Settlement, AgentLogger, Router

        vm.stopBroadcast();
    }
}
