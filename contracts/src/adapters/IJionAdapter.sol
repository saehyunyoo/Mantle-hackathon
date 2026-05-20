// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IJionAdapter — common interface every DeFi venue adapter implements
 *
 * Why an interface:
 *   The Distributor doesn't care if the venue is the self-hosted JionPool, an
 *   external DEX (Merchant Moe / Fluxion / Agni), or a lending market (Lendle /
 *   Init Capital). It just calls `list(...)` to deposit and `withdraw(...)` to
 *   pull back, and reads `volume24h(...)` to know whether the token is alive.
 *
 *   Phase 1: SelfPoolAdapter (real) + 5 external adapters (stub).
 *   Phase 2+: external adapters get real implementations.
 *
 *   This matches the "Jion-Issued RWA Token Standard" surfaced in T7 — any
 *   DeFi protocol can ship an adapter to integrate with Jion's distribution.
 */
interface IJionAdapter {
    /// @notice Human-readable adapter name (e.g. "SelfPool", "MerchantMoe-V1").
    function name() external view returns (string memory);

    /// @notice Adapter kind — used by the AI router for scoring.
    ///         AMM = 0, LENDING = 1, PERP = 2, OPTIONS = 3.
    function kind() external view returns (uint8);

    /**
     * @notice List `amountToken` of `token` (paired with `amountQuote` of `quote`)
     *         on this venue. Caller (Distributor) must transfer tokens to this
     *         adapter BEFORE calling list().
     * @return positionId opaque id the adapter uses to track this listing
     *                    (pool address, account id, vault token, ...).
     */
    function list(
        address token,
        address quote,
        uint256 amountToken,
        uint256 amountQuote
    ) external returns (bytes32 positionId);

    /**
     * @notice Withdraw a previously created listing. Returns recovered amounts
     *         back to the caller.
     */
    function withdraw(bytes32 positionId)
        external
        returns (uint256 amountTokenOut, uint256 amountQuoteOut);

    /// @notice Read 24-hour traded volume in USD-equivalent for `token` on
    ///         this venue. Used by Settlement to decide force-settle.
    function volume24h(address token) external view returns (uint256 usdVolume);

    /// @notice Health check — returns false if the underlying venue is
    ///         unavailable (paused / not deployed yet / RPC errors).
    function isHealthy() external view returns (bool);
}
