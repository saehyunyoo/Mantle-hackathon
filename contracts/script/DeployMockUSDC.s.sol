// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import { MockUSDC } from "../src/MockUSDC.sol";

/**
 * @notice Deploy ONLY MockUSDC on Mantle Sepolia.
 *
 * Used when the main deploy already happened and we just need to add a
 * mock USDC after the fact. Update Settlement.usdc separately by
 * redeploying Settlement (it's immutable on the existing one) or, for the
 * Phase-1 demo, just point UI/cron flows at this MockUSDC and the next
 * full redeploy will wire it in via Deploy.s.sol.
 *
 * Usage:
 *   source ../.env
 *   forge script script/DeployMockUSDC.s.sol:DeployMockUSDC \
 *     --rpc-url $MANTLE_SEPOLIA_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployMockUSDC is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        MockUSDC usdc = new MockUSDC(deployer);
        vm.stopBroadcast();

        console.log("MockUSDC deployed:", address(usdc));
        console.log("Owner:            ", deployer);
        console.log("Decimals:         ", usdc.decimals());
    }
}
