# Jion Integration Examples

> Three worked examples of `IJionAdapter` implementations — one per venue kind.
> Each is ~50 lines of Solidity and is meant to be a copy-and-modify starting
> point, not a production reference. See [`TOKEN_STANDARD.md`](./TOKEN_STANDARD.md)
> for the interface contract.

---

## 1. DEX adapter (AMM)

Wrap your Uniswap-V2-style pool. The adapter holds an LP position keyed by pool
address; the position id is the pool address itself, encoded as `bytes32`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IJionAdapter } from "jion/adapters/IJionAdapter.sol";

interface IMyDexFactory { function getPair(address a, address b) external view returns (address); }
interface IMyDexPair { function mint(address to) external returns (uint256 lp); function burn(address to) external returns (uint256, uint256); }

contract MyDexJionAdapter is IJionAdapter {
    IMyDexFactory public immutable factory;

    constructor(address factory_) { factory = IMyDexFactory(factory_); }

    function name() external pure returns (string memory) { return "MyDex-V1"; }
    function kind() external pure returns (uint8) { return 0; } // AMM

    function list(address token, address quote, uint256 amountToken, uint256 amountQuote)
        external returns (bytes32 positionId)
    {
        address pair = factory.getPair(token, quote);
        require(pair != address(0), "pair missing");
        IERC20(token).transfer(pair, amountToken);
        IERC20(quote).transfer(pair, amountQuote);
        IMyDexPair(pair).mint(address(this));
        return bytes32(uint256(uint160(pair)));
    }

    function withdraw(bytes32 positionId)
        external returns (uint256 amountTokenOut, uint256 amountQuoteOut)
    {
        address pair = address(uint160(uint256(positionId)));
        IERC20(pair).transfer(pair, IERC20(pair).balanceOf(address(this)));
        (amountTokenOut, amountQuoteOut) = IMyDexPair(pair).burn(msg.sender);
    }

    function volume24h(address token) external view returns (uint256) { /* read your subgraph mirror */ }
    function isHealthy() external pure returns (bool) { return true; }
}
```

Notes:
- Distributor transfers reserves to the adapter *first*, then calls `list()`.
  The Uniswap-V2 pattern of "push then `mint(to)`" maps cleanly.
- `volume24h` should read an on-chain rolling counter. If you only have an
  off-chain mirror, expose an owner-settable setter and have your indexer push.

---

## 2. Lending adapter (collateral listing)

Register the new token as a collateral asset; deposit the initial supply as
seed liquidity. The position id encodes the lending market id.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IJionAdapter } from "jion/adapters/IJionAdapter.sol";

interface IMyLending {
    function registerAsset(address asset, uint16 ltvBps) external returns (uint64 marketId);
    function supply(uint64 marketId, uint256 amount) external returns (uint256 shares);
    function redeem(uint64 marketId, uint256 shares) external returns (uint256 amount);
}

contract MyLendingJionAdapter is IJionAdapter {
    IMyLending public immutable pool;
    uint16 public constant DEFAULT_LTV_BPS = 4000; // 40% conservative

    constructor(address pool_) { pool = IMyLending(pool_); }

    function name() external pure returns (string memory) { return "MyLending-V1"; }
    function kind() external pure returns (uint8) { return 1; } // LENDING

    function list(address token, address quote, uint256 amountToken, uint256 /*amountQuote*/)
        external returns (bytes32 positionId)
    {
        uint64 marketId = pool.registerAsset(token, DEFAULT_LTV_BPS);
        IERC20(token).approve(address(pool), amountToken);
        uint256 shares = pool.supply(marketId, amountToken);
        return bytes32((uint256(marketId) << 192) | shares);
    }

    function withdraw(bytes32 positionId)
        external returns (uint256 amountTokenOut, uint256 amountQuoteOut)
    {
        uint64 marketId = uint64(uint256(positionId) >> 192);
        uint256 shares  = uint256(positionId) & ((1 << 192) - 1);
        amountTokenOut = pool.redeem(marketId, shares);
        IERC20(/*tokenOf(marketId)*/ address(0)).transfer(msg.sender, amountTokenOut);
        // quote stays untouched in a pure-collateral listing
    }

    function volume24h(address token) external view returns (uint256) { /* utilization × 24h */ }
    function isHealthy() external view returns (bool) { return address(pool).code.length > 0; }
}
```

Notes:
- For pure-collateral listings (no quote-side deposit), keep `amountQuote`
  un-touched and let the Distributor sit on a tiny stable balance. That's fine.
- `kind() = 1` (LENDING) tells the AI router not to expect AMM-style spreads
  — it'll score collateral-fit and LTV instead.

---

## 3. Options adapter (vault listing)

Spin up a covered-call vault on the new token, deposit the seed as the
underlying, and use the quote as the strike collateral. Position id is the
vault address.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IJionAdapter } from "jion/adapters/IJionAdapter.sol";

interface IMyOptionsFactory {
    function createCoveredCallVault(address underlying, address strike) external returns (address vault);
}
interface IMyOptionsVault {
    function deposit(uint256 amountUnderlying, uint256 amountStrike) external returns (uint256 vaultShares);
    function withdrawAll() external returns (uint256 underlyingOut, uint256 strikeOut);
}

contract MyOptionsJionAdapter is IJionAdapter {
    IMyOptionsFactory public immutable factory;

    constructor(address factory_) { factory = IMyOptionsFactory(factory_); }

    function name() external pure returns (string memory) { return "MyOptions-V1"; }
    function kind() external pure returns (uint8) { return 3; } // OPTIONS

    function list(address token, address quote, uint256 amountToken, uint256 amountQuote)
        external returns (bytes32 positionId)
    {
        address vault = factory.createCoveredCallVault(token, quote);
        IERC20(token).approve(vault, amountToken);
        IERC20(quote).approve(vault, amountQuote);
        IMyOptionsVault(vault).deposit(amountToken, amountQuote);
        return bytes32(uint256(uint160(vault)));
    }

    function withdraw(bytes32 positionId)
        external returns (uint256 amountTokenOut, uint256 amountQuoteOut)
    {
        address vault = address(uint160(uint256(positionId)));
        (amountTokenOut, amountQuoteOut) = IMyOptionsVault(vault).withdrawAll();
    }

    function volume24h(address token) external view returns (uint256) { /* premium notional 24h */ }
    function isHealthy() external pure returns (bool) { return true; }
}
```

Notes:
- `kind() = 3` (OPTIONS) is a hint to the router that this venue absorbs
  volatility, not spread — it gets weighted higher on high-IV days.
- A vault factory pattern lets you list arbitrarily many Jion tokens without
  per-token deploys; the position id alone is enough to reverse.

---

## 4. TypeScript: reading distribution events

Off-chain integrators that don't want to write an adapter (analytics, terminals,
portfolio trackers) can subscribe to `Distributor.TokenDistributed`:

```ts
import { createPublicClient, http, parseAbiItem } from "viem";
import { mantleSepoliaTestnet } from "viem/chains";

const client = createPublicClient({ chain: mantleSepoliaTestnet, transport: http() });

client.watchEvent({
  address: "0x28656c984ac361fe1a31cd4e13c28d97dc838cf6", // Distributor
  event: parseAbiItem(
    "event TokenDistributed(address indexed token, address indexed adapter, uint256 amountToken, uint256 amountQuote, uint16 weightBps, bytes32 positionId)",
  ),
  onLogs: (logs) => {
    for (const log of logs) {
      console.log("new listing:", log.args);
      // Index into your DB, push to Slack, etc.
    }
  },
});
```

Or hit the public read endpoint:

```
GET https://jion.app/api/distribution/mNVDA
```

Returns the routing plan + reasoning JSON shown in [§4 of TOKEN_STANDARD.md](./TOKEN_STANDARD.md#4-distribution-lifecycle--events-to-watch).
