# Jion-Issued RWA Token Standard

> A minimal contract surface every Jion-issued daily-synthetic token exposes, plus
> the adapter interface external Mantle DeFi protocols implement to receive
> distribution flow. Designed so any DEX, lending market, or perp/options venue can
> integrate in a single Solidity file.

**Network:** Mantle Sepolia (chain id `5003`). Mainnet target post-hackathon.
**License:** MIT.

---

## 1. Overview

Jion issues one synthetic ERC-20 per high-volume stock per market per day. Each
token is automatically fanned out to one or more Mantle DeFi venues via an
**adapter** contract. The Distributor never talks to a venue directly — it only
talks to adapters implementing `IJionAdapter`.

That gives external protocols a single integration point:

```
┌────────────┐   issues    ┌──────────────┐   distribute()   ┌──────────────┐
│TokenFactory│ ──────────▶ │ JionToken    │ ◀──────────────  │  Distributor │
└────────────┘             └──────────────┘                  └──────┬───────┘
                                                                    │ list()
                                                                    ▼
                                                            ┌──────────────┐
                                                            │ IJionAdapter │  ← you implement this
                                                            └──────┬───────┘
                                                                    │
                                                                    ▼
                                                            ┌──────────────┐
                                                            │  Your venue  │  ← DEX / lending / perp / options
                                                            └──────────────┘
```

If your protocol can hold a pair of ERC-20 tokens and return some position handle,
you can implement an adapter. Examples in
[`INTEGRATION_EXAMPLES.md`](./INTEGRATION_EXAMPLES.md).

---

## 2. JionToken — what every Jion-issued token exposes

`JionToken` is a vanilla OpenZeppelin `ERC20` + `Ownable` plus four view fields
that pin its real-world identity. The token symbol convention is **`mTICKER`**
(e.g. `mNVDA`, `mTSLA`) — one symbol per underlying ticker, no date suffix
(re-issuance reuses the same contract).

### 2.1 View functions

| Function | Type | Meaning |
| --- | --- | --- |
| `underlying()` | `string` | Underlying ticker symbol (e.g. `"NVDA"`). |
| `market()` | `string` | Market identifier — `"NASDAQ"`, `"KRX"`, or `"TSE"`. |
| `issuedAt()` | `uint256` | Unix timestamp the token contract was deployed. |
| `pythFeedId()` | `bytes32` | [Pyth Hermes](https://pyth.network) price feed id for the underlying. |

Integrators read these to (a) display the right name, (b) source a live price
without trusting Jion's own oracle, (c) decide whether the token is still alive
(see §4).

### 2.2 Authority

- `owner()` is the `TokenFactory` contract.
- `mint(address,uint256)` and `burn(address,uint256)` are `onlyOwner`.
- Holders cannot mint/burn directly. All supply changes happen through
  `TokenFactory` (mint) or `Settlement` (burn on force-settle).

### 2.3 Supply policy — rank-tier issuance

The initial mint amount is decided **off-chain by the cron signer** (the
TokenFactory itself accepts `initialSupply` as a parameter and does not enforce
the policy). The standard scales with the daily volume rank within each market,
so high-demand tickers get proportionally deeper float without changing the
USD-denominated seed:

| Daily rank | Multiplier | Initial supply | Why |
| --- | --- | --- | --- |
| **#1** | **3×** | **3,000,000 mTICKER** | Whale — the day's single market leader |
| **#2 – #3** | **2×** | **2,000,000 mTICKER** | Head — high-volume followers |
| **#4 – #10** | **1×** | **1,000,000 mTICKER** | Base — long tail of the top-10 |

Per-market daily total: `3M + 2 × 2M + 7 × 1M = 14M mTICKER`.
Across NASDAQ + KRX + TSE: **42M mTICKER/day**.

LP seed sizing is a separate decision made by the Distributor at fan-out time
(typically a small percentage of `initialSupply` paired with USDC).
`computeInitialSupply(rank)` lives in `packages/types/src/supply.ts` so every
caller (cron, scripts, tests) uses the same formula.

---

## 3. IJionAdapter — the interface you implement

```solidity
interface IJionAdapter {
    function name() external view returns (string memory);
    function kind() external view returns (uint8); // 0 AMM | 1 LENDING | 2 PERP | 3 OPTIONS
    function list(
        address token,
        address quote,
        uint256 amountToken,
        uint256 amountQuote
    ) external returns (bytes32 positionId);
    function withdraw(bytes32 positionId)
        external
        returns (uint256 amountTokenOut, uint256 amountQuoteOut);
    function volume24h(address token) external view returns (uint256 usdVolume);
    function isHealthy() external view returns (bool);
}
```

Full source with NatSpec: [`contracts/src/adapters/IJionAdapter.sol`](../contracts/src/adapters/IJionAdapter.sol).

### 3.1 Contract for `list()`

- The Distributor transfers `amountToken` of `token` and `amountQuote` of `quote`
  to the adapter **before** calling `list()`. The adapter MUST treat its own
  balance as the source of truth — do not `transferFrom` again.
- `list()` returns an opaque `bytes32 positionId`. Encode whatever you need to
  later reverse the listing (pool address, NFT id, lending account, etc.). The
  Distributor stores it verbatim.
- Reverting from `list()` cancels that adapter's slice without touching the
  others. The Distributor swallows the loss for that slice.

### 3.2 Contract for `withdraw()`

- Called by `Settlement` when a token's 24h volume drops below the
  $10K force-settle threshold (and during normal end-of-life unwinding).
- Returns the `(amountTokenOut, amountQuoteOut)` recovered. The settlement
  contract uses these to pro-rata pay back holders.
- Best-effort: if the venue is paused, an adapter MAY return `(0, 0)` instead of
  reverting so the rest of settlement can proceed.

### 3.3 `volume24h()` and `isHealthy()`

- `volume24h(token)` is read by `Settlement` to decide whether to keep the token
  alive for another day. Return USD-equivalent rounded to 6 decimals (matches
  USDC). Stale reads (>1h old) are acceptable but flag them via `isHealthy()`.
- `isHealthy()` returns `false` if your venue is paused, the oracle is stale, or
  the underlying RPC is unreachable from your contract's view. The AI router
  will skip unhealthy adapters when computing weights.

---

## 4. Distribution lifecycle — events to watch

The Distributor emits one event per slice when a new token is fanned out:

```solidity
event TokenDistributed(
    address indexed token,
    address indexed adapter,
    uint256 amountToken,
    uint256 amountQuote,
    uint16  weightBps,
    bytes32 positionId
);
```

Indexer/webhook payload schema (see `apps/web/app/api/distribution/[symbol]`):

```jsonc
{
  "tokenSymbol": "mNVDA",
  "tokenAddress": "0x...",
  "listings": [
    {
      "protocol": "merchant-moe",
      "kind": "amm-pool",
      "listingAddress": "0x...",
      "tvlUsd": 1024000,
      "volume24hUsd": 384000,
      "url": "https://merchantmoe.com/pools/mNVDA",
      "reasoning": "Volume rank fit (top) · Deep reference liquidity available"
    }
  ],
  "routingReasoning": "...",
  "generatedAt": "2026-05-22T06:59:51Z"
}
```

`AgentLogger` mirrors the routing decision on-chain as a verifiable agent trace.

---

## 5. Registering your adapter

1. Deploy your adapter implementing `IJionAdapter` on Mantle Sepolia.
2. Submit a PR to [`saehyunyoo/Mantle-hackathon`](https://github.com/saehyunyoo/Mantle-hackathon)
   adding the address + name to `packages/types/src/addresses.ts`.
3. The Jion multisig calls `Distributor.addAdapter(yourAdapter)`.
4. From the next daily issuance onward, the AI router considers your venue when
   computing per-token weights based on `kind()` + `volume24h()` + `isHealthy()`.

There is **no whitelist by team / KYC**. The only filter is the
`Distributor.isAdapter` mapping, governed by the multisig.

---

## 6. Reference deployments (Mantle Sepolia)

| Contract | Address |
| --- | --- |
| TokenFactory | `0x2eb123aedc45b26a5a04247af3790c5df113e2ae` |
| Distributor | `0x28656c984ac361fe1a31cd4e13c28d97dc838cf6` |
| Settlement | `0xe11527fe1939c8827cc09690fd62b03950dda3ef` |
| OracleAdapter | `0xcd847aa6e047a4c9121ad1e868e847322aaed29b` |
| AgentLogger | `0x77edbfacfc302f01aba5d25ece57c5dc69dcb2e5` |
| SelfPoolAdapter (real) | `0x6e9bcc3409efaf8b220d549125973cb0f180b7e2` |
| MerchantMoeMockAdapter | `0xde7d132a2eeb0222fdfca58ea9e25ae78a47e9e4` |
| LendleMockAdapter | `0x7582ccc516ee587b3cc09541d8630ae4ebf8be9b` |
| MockUSDC (quote) | `0x9719d0f8e2b766b842d8c810a314ace9de9f6e28` |
| Pyth (Hermes) | `0x98046Bd286715D3B0BC227Dd7a956b83D8978603` |

The two `*MockAdapter` contracts are stand-ins so the demo can show a
multi-venue distribution without requiring the actual external protocols to be
deployed on Sepolia. They satisfy the full `IJionAdapter` surface — read their
source to see a working reference implementation.

---

## 7. Versioning

This document tracks the Phase 1 surface. Breaking changes to `IJionAdapter`
will land behind a new interface name (`IJionAdapterV2`) so existing adapters
keep working. Non-breaking additions (new optional view functions) may be
appended to this file without a version bump.
