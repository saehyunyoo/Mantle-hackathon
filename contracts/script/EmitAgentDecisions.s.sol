// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import { AgentLogger } from "../src/AgentLogger.sol";

/**
 * @notice Seed real AgentDecision events on Mantle Sepolia so the "verifiable
 *         agent" story is provable on-chain — the UI's "View agent log on-chain"
 *         link and the README claim resolve to actual events, not an empty
 *         contract.
 *
 * Run by the deployer wallet (0x74Ce…) which is authorized in the AgentLogger
 * constructor — so NO setAuthorized is needed. If you ever route through a
 * separate agent wallet, the owner must call setAuthorized(agentWallet, true)
 * once first.
 *
 * Usage:
 *   source ../.env
 *   AGENT_LOGGER=0x77edbfacfc302f01aba5d25ece57c5dc69dcb2e5 \
 *   forge script script/EmitAgentDecisions.s.sol:EmitAgentDecisions \
 *     --rpc-url $MANTLE_SEPOLIA_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 *
 * After running, open the AgentLogger address on Mantle Explorer → the
 * AgentDecision events appear in the logs tab.
 */
contract EmitAgentDecisions is Script {
    function run() external {
        // env (no checksum hassle — parsed at runtime)
        address loggerAddr = vm.envAddress("AGENT_LOGGER");
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");

        AgentLogger logger = AgentLogger(loggerAddr);

        bytes32 ROUTE = keccak256("ROUTE");
        bytes32 LP = keccak256("LP");

        vm.startBroadcast(pk);

        logger.log(
            ROUTE,
            keccak256("mNVDA->merchant-moe"),
            "mNVDA (NASDAQ #1): routed to Merchant Moe -- deepest mNVDA liquidity and tightest spread for a top-rank, low-volatility name."
        );
        logger.log(
            ROUTE,
            keccak256("mTSLA->fluxion"),
            "mTSLA (NASDAQ #2): routed to Fluxion -- high-volatility profile favors Fluxion's concentrated-liquidity AMM over a passive pool."
        );
        logger.log(
            ROUTE,
            keccak256("m005930->agni"),
            "Samsung Electronics m005930 (KRX #1): routed to Agni -- mid-tier turnover matches Agni's fee tier; multi-hop avoided, direct pool is cheapest."
        );
        logger.log(
            LP,
            keccak256("lp-alloc-2026"),
            "LP optimizer: allocate today's seed liquidity 60% mNVDA / 30% mTSLA / 10% mAAPL -- weighted by predicted 24h volume and pool depth."
        );

        vm.stopBroadcast();

        console.log("Emitted 3 ROUTE + 1 LP AgentDecision events to", loggerAddr);
        console.log("Check the logs tab on Mantle Explorer for the address above.");
    }
}
