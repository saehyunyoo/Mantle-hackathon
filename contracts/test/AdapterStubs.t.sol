// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { MerchantMoeAdapter } from "../src/adapters/stubs/MerchantMoeAdapter.sol";
import { FluxionAdapter } from "../src/adapters/stubs/FluxionAdapter.sol";
import { AgniAdapter } from "../src/adapters/stubs/AgniAdapter.sol";
import { LendleAdapter } from "../src/adapters/stubs/LendleAdapter.sol";
import { InitCapitalAdapter } from "../src/adapters/stubs/InitCapitalAdapter.sol";

/**
 * Phase 1 stubs must compile + satisfy the IJionAdapter interface but
 * report unhealthy and revert on writes. These tests lock the surface.
 */
contract AdapterStubsTest is Test {
    function test_MerchantMoeStubMetadata() public {
        MerchantMoeAdapter a = new MerchantMoeAdapter();
        assertEq(a.name(), "MerchantMoe-V1");
        assertEq(a.kind(), 0);
        assertFalse(a.isHealthy());
        assertEq(a.volume24h(address(0x1)), 0);

        vm.expectRevert();
        a.list(address(0x1), address(0x2), 1, 1);
        vm.expectRevert();
        a.withdraw(bytes32(0));
    }

    function test_FluxionStubMetadata() public {
        FluxionAdapter a = new FluxionAdapter();
        assertEq(a.name(), "Fluxion");
        assertEq(a.kind(), 0);
        assertFalse(a.isHealthy());
    }

    function test_AgniStubMetadata() public {
        AgniAdapter a = new AgniAdapter();
        assertEq(a.name(), "Agni-Finance");
        assertEq(a.kind(), 0);
        assertFalse(a.isHealthy());
    }

    function test_LendleStubMetadata() public {
        LendleAdapter a = new LendleAdapter();
        assertEq(a.name(), "Lendle");
        assertEq(a.kind(), 1); // LENDING
        assertFalse(a.isHealthy());
    }

    function test_InitCapitalStubMetadata() public {
        InitCapitalAdapter a = new InitCapitalAdapter();
        assertEq(a.name(), "Init-Capital");
        assertEq(a.kind(), 1); // LENDING
        assertFalse(a.isHealthy());
    }
}
