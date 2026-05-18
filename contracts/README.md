# Jion Contracts

Solidity + Foundry. Mantle (EVM L2).

**아직 init 안 됨.** Phase 1 컨트랙트 티켓 시작할 때 아래 명령으로 init.

## Init 가이드

```bash
cd contracts
forge init --no-git --no-commit .
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install pyth-network/pyth-sdk-solidity --no-commit
```

## 예정 컨트랙트 (PLAN.md 부록 A)

```
src/
├─ TokenFactory.sol      # ERC-20 합성토큰 발행
├─ JionPool.sol          # Uniswap V2 fork AMM
├─ OracleAdapter.sol     # Pyth 시세 어댑터
├─ Settlement.sol        # 임계치 미달 시 강제 정산
├─ AgentLogger.sol       # AI 의사결정 온체인 기록 (event emit)
└─ JionRouter.sol        # 외부 진입점
```

## 배포

- 메인넷 1개 시장 (NASDAQ 후보) — 실제 거래
- Sepolia 나머지 시장 — 데모 시각화
- 배포 트랜잭션 서명은 사람(세현) 수동
