# Jion Contracts

Solidity + Foundry. Mantle Sepolia (testnet 5003).

## Setup (한 번만)

Install Foundry: https://book.getfoundry.sh/getting-started/installation

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup

cd contracts
forge install foundry-rs/forge-std --no-commit --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-commit --no-git
forge install pyth-network/pyth-sdk-solidity --no-commit --no-git
```

## Build & Test

```bash
forge build
forge test -vv
```

## Deploy to Mantle Sepolia

```bash
cp ../.env.example ../.env
# fill DEPLOYER_PRIVATE_KEY and MANTLE_SEPOLIA_RPC in ../.env

source ../.env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $MANTLE_SEPOLIA_RPC \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

배포 후, console 출력에 찍힌 주소를 `apps/web/lib/chain/addresses.ts`에 박는다.

## Contracts

| File | Role | Status |
| --- | --- | --- |
| `JionToken.sol` | Daily synthetic ERC-20 (`mTICKER-YYYYMMDD`) | ✅ skeleton |
| `TokenFactory.sol` | Batch issuer, called by cron once per day | ✅ skeleton |
| `OracleAdapter.sol` | Pyth Network pull-oracle wrapper | ✅ skeleton |
| `JionPool.sol` | Uniswap V2-style AMM (Sepolia substitute for Merchant Moe) | ⚠️ stub — W2 impl |
| `JionRouter.sol` | User-facing entry point (swap / addLiquidity) | ⚠️ stub — W2 impl |
| `AgentLogger.sol` | On-chain AI decision events | ✅ skeleton |

## Pyth — Mantle 주소

- **Mantle Sepolia**: `0x98046Bd286715D3B0BC227Dd7a956b83D8978603`
- Mantle Mainnet:    `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729`

Pyth feed IDs (US equities + KR equities) → `docs/RESEARCH.md` §1.2~1.3.

## 진행 상태

- [x] Foundry scaffolding (foundry.toml, remappings, .gitignore)
- [x] 6 contract skeletons (JionToken / TokenFactory / OracleAdapter / JionPool / JionRouter / AgentLogger)
- [x] Unit tests (TokenFactory, AgentLogger, JionPool surface)
- [x] Deploy script (DeployScript)
- [x] CI workflow (`.github/workflows/ci.yml`)
- [ ] **W2**: JionPool 실제 V2 math 구현 (mint / burn / swap)
- [ ] **W2**: TokenFactory batch issue + LP seed
- [ ] **W2**: OracleAdapter Pyth 통합 fork 테스트
- [ ] **W2**: Mantle Sepolia first deploy

## 디렉토리

```
src/
├─ JionToken.sol
├─ TokenFactory.sol
├─ JionPool.sol
├─ OracleAdapter.sol
├─ JionRouter.sol
└─ AgentLogger.sol
test/
├─ TokenFactory.t.sol
├─ AgentLogger.t.sol
└─ JionPool.t.sol
script/
└─ Deploy.s.sol
foundry.toml
remappings.txt
.gitignore
```
