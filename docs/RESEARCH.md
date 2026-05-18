# W1 Research Findings — Jion

> 작성: 2026-05-18 · 세현
> 영역: API / Contracts critical-path 검증

---

## ✅ 검증 결과 요약

| # | 가설 | 결과 | 후속 |
| --- | --- | --- | --- |
| 1 | Pyth가 Mantle Sepolia에서 NVDA·TSLA 등 주식 피드 제공? | **✅ 완전 통과** | 즉시 통합 가능 |
| 2 | Polygon.io 무료 티어로 매일 거래량 Top 10 폴링 가능? | **✅ 통과 (한계 인지)** | 종가/거래량만, 가격은 Pyth |
| 3 | Mantle Sepolia 인프라 (RPC + faucet + explorer) 준비됨? | **✅ 완전 통과** | 환경변수만 채우면 끝 |
| 4 | Pyth 컨트랙트 통합 패턴 명확? | **✅ pull-oracle 패턴 확정** | W2 컨트랙트 설계 진행 |
| 5 | Merchant Moe Sepolia 통합 가능? | **🔴 미지원 (메인넷만)** | 자체 AMM v2 fork 필요 |

→ **종합 판단: 기획서 그대로 진행. 단 LP/AMM 전략 1가지 수정.**

---

## 1. Pyth Network — 주식 피드 가용성

### 1.1 컨트랙트 주소

| 네트워크 | 주소 |
| --- | --- |
| Mantle Mainnet | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| **Mantle Sepolia** | **`0x98046Bd286715D3B0BC227Dd7a956b83D8978603`** |

> Source: https://docs.pyth.network/price-feeds/contract-addresses/evm

### 1.2 주식 피드 — 미국

Hermes API 직접 호출로 확인. 우리 타깃 종목 **전부 사용 가능**:

| 종목 | 정규시장 Feed ID (앞 16자) |
| --- | --- |
| NVDA | `b1073854ed24cbc7` |
| TSLA | `713631e41c06db40` |
| AAPL | `8c320e4cd87c6cef` |
| MSFT | `556b3e4dcc1c6644` |
| MSTR | `c3055f49e1dc863a` |
| AMD  | `6969003ef4c5fbb3` |
| GOOGL | `07d24bb76843496a` |
| META | `ce0999c4f22f35f0` |
| AMZN | `82c59e36a8e0247e` |

각 종목당 4개 피드: 정규(`Equity.US.{T}/USD`) + POST + PRE + ON. 데모에서는 정규시장 피드 쓰면 충분.

> Source: `curl https://hermes.pyth.network/v2/price_feeds?asset_type=equity`

### 1.3 주식 피드 — 한국 (보너스 발견 🎉)

```
Equity.KR.005930/KRW  삼성전자        id=58082ed1358b8e7c...
Equity.KR.000660/KRW  SK하이닉스      id=189f0b6276a37a09...
Equity.KR.352820/KRW  HYBE           id=fe9dc190a935c61b...
```

→ **기획서의 "멀티 시장 확장" 로드맵 신빙성 ↑**. 데모 단계에서도 K-stock 토큰화 즉시 가능.

### 1.4 컨트랙트 통합 패턴 — Pull Oracle

```solidity
// 핵심 패턴
function consumePrice(bytes[] calldata priceUpdate) public payable {
    uint fee = pyth.getUpdateFee(priceUpdate);
    pyth.updatePriceFeeds{value: fee}(priceUpdate);
    PythStructs.Price memory p = pyth.getPriceNoOlderThan(feedId, 60);
}
```

**핵심 함의:**
- 트랜잭션 호출자가 **update fee를 같이 보내야 함** (msg.value).
- Hermes(off-chain)에서 `priceUpdate` payload를 받아 트랜잭션에 같이 전달.
- "staleness" 파라미터(예: 60초) — 그보다 오래된 가격이면 revert.

**우리 적용 방안:**
- **매일 발행 cron** (`runDailySnapshot`)에서 Hermes 호출 → priceUpdate 받음 → `updatePriceFeeds` 호출 → 토큰 발행
- **스왑 시점**에는 가격 fresh 필요할 때만 갱신 (Merchant Moe 풀이 가격을 가지므로 매 스왑마다 Pyth 호출 X)
- **Settlement(강제 정산) 시점**: 다시 한 번 Pyth 호출해서 정확한 가격으로 정산

> Source: https://docs.pyth.network/price-feeds/use-real-time-data/evm

### 1.5 Sponsored Feeds on Mantle (가스 절약)

- Pyth Data Association이 *일부 피드를 자동 push* — heartbeat / deviation 기준
- Mantle 정확한 sponsored 목록은 공식 페이지 404로 못 받음. 추가 확인 필요 (담당 컨택 또는 페이지 갱신 후)
- **추정**: ETH/USD, BTC/USD, USDC/USD 등 메이저 crypto는 sponsored. 주식 피드는 sponsored 아닐 가능성 큼 → update fee 부담 전제로 설계

> 대응: 컨트랙트는 항상 `updatePriceFeeds` 가능하게 설계. sponsored면 fee 0으로 동작, 아니면 백엔드가 fee 부담.

---

## 2. Mantle Sepolia 인프라

| 항목 | 값 |
| --- | --- |
| **Chain ID** | `5003` (0x138b) |
| **Native Currency** | MNT |
| **공식 RPC** | `https://rpc.sepolia.mantle.xyz` |
| **백업 RPC** | `https://rpc.ankr.com/mantle_sepolia` · `https://mantle-sepolia.drpc.org` |
| **Explorer** | `https://explorer.sepolia.mantle.xyz` (Blockscout) |
| **공식 Faucet** | `https://faucet.sepolia.mantle.xyz` — X 인증, 일일 1,000 MNT, 4h 쿨다운 |
| **백업 Faucet** | QuickNode (`faucet.quicknode.com/mantle/sepolia`, 12h) · Chainlink (`faucets.chain.link/mantle-sepolia`) · thirdweb (0.01 MNT) |

### 2.1 권장 환경 셋업
```bash
# .env (또는 .env.local)
MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
NEXT_PUBLIC_CHAIN_ID=5003
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.mantle.xyz
NEXT_PUBLIC_EXPLORER_URL=https://explorer.sepolia.mantle.xyz
```

### 2.2 지갑 충전 절차
1. 신규 개발용 지갑 생성 (개인 자산 지갑 절대 사용 금지)
2. 공식 faucet에서 1,000 MNT 받기 (X 계정 인증 필요)
3. 부족 시 QuickNode·Chainlink·thirdweb로 보충
4. **W1 끝 목표**: 개발용 지갑에 2,000+ MNT 보유

---

## 3. Polygon.io 거래량 데이터

### 3.1 무료 티어 한계
- **5 API calls / 분**
- **데이터: 종가 + 히스토리만** (real-time 아님, 종가는 15-min 지연 가능)
- Snapshot endpoint: **한 번에 최대 250 심볼**

### 3.2 우리 케이스 적합성
- 매일 1회 폴링이면 충분 (Top 10 거래량 + 종가)
- **실시간 가격은 Pyth가 처리** → Polygon.io는 *거래량 시그널* 용도로만
- 무료 티어로 MVP 충분, 프로덕션 시 유료 ($29~/월) 전환

### 3.3 사용 패턴
```ts
// lib/polygon.ts
async function fetchTopVolume(market: 'NASDAQ', limit = 10) {
  // GET /v2/snapshot/locale/us/markets/stocks/tickers
  // → 미국 상장 전체 snapshot
  // → trading volume 기준 sort + 상위 N 추출
}
```

> Source: https://polygon.io/knowledge-base · https://massive.com/pricing (Polygon 새 도메인)

### 3.4 대안 (백업)
- **yfinance** (무료, 무제한, 비공식)
- **Alpha Vantage** (무료 25 calls/일)
- **IEX Cloud** (유료, 메이저 실시간)

→ Polygon.io 한계 부딪히면 yfinance로 대체. 인터페이스(`lib/polygon.ts`) 동일하게 유지.

---

## 4. Merchant Moe — 🔴 Sepolia 미지원

### 4.1 메인넷 컨트랙트 (참고)

**LB 2.2 (Liquidity Book):**
| 항목 | 주소 |
| --- | --- |
| LB Factory | `0xa6630671775c4EA2743840F9A5016dCf2A104054` |
| LB Router | `0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a` |
| LB Quoter | `0x501b8AFd35df20f531fF45F6f695793AC3316c85` |

**V1 (UniV2-style):**
| 항목 | 주소 |
| --- | --- |
| MoeFactory | `0x5bef015ca9424a7c07b68490616a4c1f094bedec` |
| MoeRouter | `0xeaEE7EE68874218c3558b40063c42B82D3E7232a` |

→ 메인넷 출시 시 **MoeFactory (V1)** 가 가장 빠른 통합. V1은 UniV2 fork라 createPair / addLiquidity 인터페이스 그대로.

### 4.2 Sepolia 대응 전략 (변경)

**기존 계획**: Merchant Moe 풀에 직접 LP 시드.
**문제**: Sepolia에 Merchant Moe 배포 없음.
**새 계획**:

1. **자체 V2 fork (Uniswap V2 minimal) Sepolia 배포**
   - `contracts/src/JionPool.sol` (V2 fork) — TokenFactory와 같이 deploy
   - **인터페이스를 MoeFactory와 일치하게 짜기** → 메인넷 출시 시 라우터만 교체

2. **컨트랙트 설계:**
   ```solidity
   interface IAmmFactory {
       function createPair(address tokenA, address tokenB) external returns (address pair);
       function getPair(address tokenA, address tokenB) external view returns (address);
   }
   interface IAmmRouter {
       function addLiquidity(...) external returns (...);
       function swapExactTokensForTokens(...) external returns (...);
   }
   ```
   → 위 인터페이스로 추상화 → 데모(JionPool) ↔ 메인넷(MoeRouter) 스왑.

3. **발표 메시지:**
   > *"데모는 자체 V2 fork (Mantle Sepolia). 메인넷 출시 시 Merchant Moe V1·LB 2.2와 라우터만 교체."*

### 4.3 AMM 옵션 비교

| 옵션 | 장점 | 단점 | 결정 |
| --- | --- | --- | --- |
| Sepolia에 V2 fork 직접 deploy | 컨트롤 100% · 인터페이스 통일 | 추가 컨트랙트 코드 | **선택** |
| Sepolia에 Merchant Moe deploy 요청 | 진짜 통합 | 시간 ROI 낮음, 답변 불확실 | 패스 |
| 메인넷에서 Merchant Moe 사용 | 진짜 통합 | 가스비 · 키 부담 · 실수 위험 | 해커톤 스코프 밖 |
| Mock AMM (가짜 LP) | 가장 빠름 | 라우팅 데모 약함 | 패스 |

---

## 5. W2 작업 영향 (변경/확정)

### 5.1 컨트랙트 구조 — 확정
```
contracts/src/
├─ TokenFactory.sol        # 매일 ERC-20 발행 (mTICKER-YYYYMMDD)
├─ OracleAdapter.sol       # Pyth pull wrapper
├─ JionPool.sol            # 자체 V2 fork (Sepolia용, Moe 호환 인터페이스)
├─ JionFactory.sol         # JionPool 생성/조회
├─ JionRouter.sol          # 통합 진입점 (Moe로 swap-out 가능)
├─ Settlement.sol          # 임계치 미달 시 정산 ($10K/24h)
└─ AgentLogger.sol         # AI 의사결정 이벤트
```

### 5.2 데이터 흐름 — 확정
```
[09:30 ET, NASDAQ 개장 +1h]
    ↓
1. Polygon.io: Top 10 거래량 종목  (백엔드 cron)
2. Pyth Hermes: 각 종목 priceUpdate
3. TokenFactory.createToken() × 10  (백엔드 키 서명)
4. JionFactory.createPair(mTICKER, USDC) × 10
5. JionRouter.addLiquidity() — 초기 시드 LP

[다음날 09:30 ET]
    ↓
6. Settlement.checkAndSettle() — 24h volume < $10K이면 정산
```

### 5.3 W1 후반 (5/19-5/22) 작업 큐
- [ ] Mantle Sepolia 개발용 지갑 생성 + faucet 1,000 MNT 충전
- [ ] Polygon.io 무료 API 키 발급
- [ ] Anthropic API 키 / Z.ai API 키 발급 신청
- [ ] Pyth `OracleAdapter.sol` 실제 구현 + Foundry 테스트 (Hermes 가격으로 통합 테스트)
- [ ] `lib/pyth.ts` 실제 구현 (`fetchPythPrice` + Hermes priceUpdate payload 추출)
- [ ] `lib/polygon.ts` 실제 구현 (`fetchTopVolume`)
- [ ] `JionPool.sol` + `JionFactory.sol` (Uniswap V2 minimal fork) skeleton
- [ ] Hello World deploy 검증: `forge script Deploy.s.sol --rpc-url $MANTLE_SEPOLIA_RPC --broadcast`

---

## 6. 해커톤 어필 포인트 (업데이트)

이번 리서치로 추가된 발표 카드:

1. **"Pyth 250+ 피드 활용"** — equities + commodities + FX + ETF + crypto. *기획서엔 없던* RWA 카테고리 다변화 가능.
2. **"한국 주식 즉시 지원 가능"** — 삼성/SK하이닉스/HYBE Pyth 피드 확보. K-stock 데모 추가 시 한국 심사진(Hashed) 어필.
3. **"메인넷 ready"** — Sepolia 자체 AMM + Moe 호환 인터페이스 → 출시 시 라우터 교체만으로 메인넷 통합.
4. **"Pyth pull-oracle 진짜 통합"** — Mock 오라클이 아닌 실제 Pyth `getPriceNoOlderThan` 사용. 검증 가능.

---

## 7. 미해결 / W2에서 결정할 것

| # | 미해결 | 누가 결정 |
| --- | --- | --- |
| 1 | Pyth Mantle sponsored feeds 정확한 목록 (가스 영향) | 세현 (Pyth Discord 문의) |
| 2 | OracleAdapter — pull fee 누가 부담? (백엔드 vs 사용자) | 세현 |
| 3 | Polygon.io 무료 한계 도달 시 yfinance로 폴백? | 세현 |
| 4 | Pyth 가격 staleness 임계치 — 60초 vs 300초? | 세현 |
| 5 | Settlement 가격 — 마지막 거래가 vs 오라클? (적대적 시나리오 대응) | 영인 + 세현 합의 |

---

## 8. 참고 링크 (북마크)

- Pyth Mantle: https://docs.pyth.network/price-feeds/contract-addresses/evm
- Pyth EVM 통합: https://docs.pyth.network/price-feeds/use-real-time-data/evm
- Pyth Hermes API: https://hermes.pyth.network/docs/
- Mantle 공식 RPC/Explorer: https://docs.mantle.xyz/network/for-developers/
- Mantle Faucet: https://faucet.sepolia.mantle.xyz
- Polygon.io 무료: https://massive.com/pricing (구 polygon.io)
- Merchant Moe 컨트랙트: https://docs.merchantmoe.com/resources/contracts
- Mantle Pyth 런칭 블로그: https://www.pyth.network/blog/pyth-price-oracle-on-mantle
