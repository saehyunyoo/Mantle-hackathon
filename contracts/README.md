# Jion Contracts

Foundry project for Jion smart contracts on Mantle Sepolia.

## Setup (one-time)

Install Foundry: https://book.getfoundry.sh/getting-started/installation

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

## Build & Test

```bash
forge build
forge test -vv
```

## Deploy to Mantle Sepolia

```bash
cp ../.env.example ../.env
# fill DEPLOYER_PRIVATE_KEY and MANTLE_SEPOLIA_RPC

source ../.env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $MANTLE_SEPOLIA_RPC \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

After deploy, run from repo root: `bun run export-abi` to sync ABIs to web.

## Contracts (planned)

| File | Purpose |
| --- | --- |
| `TokenFactory.sol` | Deploys daily synthetic ERC-20 tokens |
| `OracleAdapter.sol` | Pyth Network price feed wrapper |
| `Settlement.sol` | Force-settle tokens below volume threshold |
| `AgentLogger.sol` | On-chain log of AI agent decisions |
| `Router.sol` | Entrypoint for external swaps |
