// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import { Settlement } from "../src/Settlement.sol";
import { Distributor } from "../src/Distributor.sol";

/**
 * @notice Deploy Settlement v3 (voluntary-redemption model per PLAN §4.4)
 *         and wire it into the existing Distributor.
 *
 * Background:
 *   - Settlement v1 (PR #20) shipped with the deprecated force-settle model and
 *     a zero-USDC wiring.
 *   - Settlement v2 (PR #28) re-wired the MockUSDC pairing, but the address
 *     recorded in addresses.ts has no bytecode on-chain (`cast code` returns
 *     `0x`) — the deploy never actually landed.
 *   - This script ships v3: the same contract now extended with the
 *     `redeem(token, amount)` flow + admin `setOraclePrice`, and registers
 *     the new Settlement on the Distributor so it can call
 *     `unwindProportional`.
 *
 * Steps:
 *   1. Deploy fresh Settlement(usdc, distributor, deployer, deployer)
 *
 * Note: we intentionally do NOT call distributor.setSettlement here. The
 * already-deployed Distributor at the canonical address was compiled BEFORE
 * the unwind/setSettlement plumbing was added, so it lacks that selector.
 * Settlement.redeem still works correctly: its try/catch around
 * `distributor.unwindProportional` swallows the revert and the redemption is
 * paid entirely from Settlement's own USDC reserve — the documented
 * best-effort fallback. When the Distributor is itself re-deployed (separate
 * PR), the operator runs `distributor.setSettlement(<this Settlement>)` once
 * to re-enable the on-chain unwind path.
 *
 * Leaves untouched: TokenFactory, OracleAdapter, AgentLogger, JionRouter,
 * Distributor (state preserved — only `settlement` field updated), all
 * adapters, MockUSDC, and the old Settlement v1/v2 records (now strictly
 * orphaned).
 *
 * After running:
 *   - copy the printed Settlement address into
 *     `packages/types/src/addresses.ts` (`Settlement` field)
 *   - update `contracts/verify-sepolia.sh` Settlement entry to the same
 *   - re-run verify
 *
 * Usage:
 *   source ../.env
 *   forge script script/DeploySettlementV3.s.sol:DeploySettlementV3 \
 *     --rpc-url $MANTLE_SEPOLIA_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeploySettlementV3 is Script {
    // Existing addresses on Mantle Sepolia (chain 5003).
    address constant EXISTING_DISTRIBUTOR =
        0x28656c984aC361Fe1a31cD4e13c28D97dC838CF6;
    address constant EXISTING_MOCK_USDC =
        0x9719D0F8e2B766B842D8c810a314aCe9dE9f6e28;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        Settlement settlement = new Settlement(
            EXISTING_MOCK_USDC,
            Distributor(EXISTING_DISTRIBUTOR),
            deployer, // feeVault
            deployer  // initialOwner
        );

        vm.stopBroadcast();

        console.log("=== Settlement v3 deploy ===");
        console.log("Deployer:    ", deployer);
        console.log("Settlement:  ", address(settlement));
        console.log("Distributor: ", EXISTING_DISTRIBUTOR);
        console.log("USDC:        ", EXISTING_MOCK_USDC);
        console.log("");
        console.log("Next:");
        console.log("  1. packages/types/src/addresses.ts -> Settlement field");
        console.log("  2. contracts/verify-sepolia.sh    -> Settlement address");
        console.log("  3. forge verify-contract / verify-sepolia.sh re-run");
    }
}
