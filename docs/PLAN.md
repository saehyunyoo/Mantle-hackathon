# Jion — 일일 거래량 Top 10 RWA 토큰화 + AI 라우팅 플랫폼

> **출품 해커톤:** Mantle Turing Test Hackathon 2026 — Phase 2 (AI Awakening) / **AI × RWA 트랙**
> **제출 마감:** 2026-06-15 · **데모 데이:** 2026-07-02 ~ 03 · **수상:** 2026-07-10
> **팀:** 2명 (PM/기획 1 + 개발/배포 1) + Claude (코드 작성 위임)

---

## 1. 한 줄 요약

**Jion은 매일 시장별 거래량 Top 10 주식을 자동으로 토큰화하고, AI가 Mantle DeFi 전체에서 최적 거래/유동성 경로를 찾아주는 RWA × AI 플랫폼이다.**

---

## 2. 문제와 해결책

### 2.1 문제

- **TradFi → DeFi 진입장벽:** 주식 트레이더가 크립토로 넘어올 때, 익숙한 자산(주식)이 온체인에 없음. "내가 아는 종목"을 온체인에서 거래할 길이 거의 없음.
- **합성주식 토큰의 문제:** 기존 합성주식 토큰(Synthetix sTSLA 등)은 사용자가 직접 발행 종목을 선택해야 하고, 유동성이 분산돼 사실상 일부 대형주만 거래 가능.
- **유동성 비효율:** 같은 자산이 여러 DEX에 흩어져 있어 최적 라우트를 사람이 찾기 어렵고, LP 수익률도 어디에 공급할지 판단이 힘듦.

### 2.2 해결책 (Jion의 답)

1. **큐레이션 자동화** — 매일 시장 개장 +1시간 시점 거래량 Top 10을 자동 스냅샷 → 스마트컨트랙트 자동 배포. 사용자는 "선택"이 아니라 "오늘의 트렌딩"을 받음.
2. **AI 라우팅** — 발행된 합성 토큰을 Mantle DeFi(Fluxion / Merchant Moe / Agni Finance) 전체에서 멀티홉 포함 최저 슬리피지 경로로 거래.
3. **AI LP 옵티마이저** — 매일 새로 발행된 토큰 중 어디에 유동성 공급하면 수익 최대인지 AI가 예측하고 자동 배분/추천.
4. **동적 생명주기** — 거래량 임계치($10K/24h) 기준 자동 유예/정산. 살아남은 종목만 계속 존재 (자연 도태).

---

## 3. 핵심 컨셉

| 항목 | 내용 |
|---|---|
| **장기 비전** | 합성토큰(가격 추종, Synthetix/GMX 스타일) |
| **MVP 컨셉** | 시뮬레이션 + 오라클 페깅 (mock 데이터 일부) |
| **체인** | Mantle (EVM L2) **Sepolia 테스트넷 우선 배포** (메인넷은 제출 이후 후순위) |
| **타겟 유저** | TradFi ↔ DeFi 브릿지 (양쪽 다) |
| **차별점** | "큐레이션 자동화 + AI 라우팅" — 사용자는 종목 고를 필요 없음. AI가 알아서 매수/LP 분배까지 |

---

## 4. 토큰 메커니즘

### 4.1 발행 (Issuance)

- **트리거:** 각 시장 개장 +1시간 자동 (KRX 10:00 KST / NASDAQ 10:30 ET / TSE 10:00 JST 등)
- **선정 기준:** 직전 1시간 거래량 Top 10
- **토큰 표준:** ERC-20 (`mTICKER-YYYYMMDD` 형식 → 예: `mTSLA-20260601`)
- **발행가:** 오라클(Pyth Network) 시세 = 1 토큰 가격
- **초기 유동성:** 프로토콜이 시드 풀 자동 생성 (Uniswap V2 fork AMM)

### 4.2 거래 (Trading)

- **발행 직후:** AMM 풀에서 자유 거래 (수요공급 기반 가격)
- **결과:** 오라클 가격과 괴리 발생 가능 → 차익거래 기회 (자연스러운 페깅 압력)
- **사용자 행동:** Swap (매수/매도) + LP 공급

### 4.3 생명주기 (Lifecycle) — 동적 폐기

매일 다음 발행 시점(개장 +1시간)에 직전 24h 풀 거래량 측정:

- **≥ $10,000:** 24시간 유예 연장 (영구 존속 가능)
- **< $10,000:** **강제 정산**
  - 정산 시점 오라클 가격으로 토큰 보유자에게 **USDC 환산 분배**
  - LP는 자동 유동성 회수 (스테이블 + 잔여 USDC)
  - 컨트랙트는 종결 상태로 이동

**근거:** $10K = DexScreener 풀 노출 최소 유동성 기준선, Mantle DEX 풀 "활성/비활성" 분기점.

### 4.4 수익 모델

| 수익원 | 비율 | 비고 |
|---|---|---|
| **거래 수수료** | 0.05% (프로토콜 fee) | Uniswap 모델 (전체 수수료 중 일부, 나머지는 LP) |
| **정산 수수료** | 0.5% | 강제 정산 시 토큰홀더 정산금에서 차감 |
| **발행 수수료** | **무료** | 접근성 우선 — 프로토콜이 시드 |

---

## 5. AI 시스템

### 5.1 역할

**5.1.1 AI 라우팅 (A)**
- 사용자가 "이 토큰 사고 싶다"고 하면 → AI가 Mantle DeFi 전체 스캔 → 최저 슬리피지 멀티홉 경로 도출.
- 비교 DEX: Fluxion / Merchant Moe / Agni Finance.
- 결과는 **자연어 설명** 동반 ("Fluxion 직스왑이 Agni 경유보다 슬리피지 0.3% 낮음").

**5.1.2 AI LP 옵티마이저 (B)**
- 오늘 발행된 Top 10 토큰 중 어디에 유동성 공급 시 수익률 최대인지 예측.
- 입력: 발행 시점 시세, 직전 시장 거래량 패턴, 풀 깊이.
- 출력: LP 배분 추천 (예: "$1000을 mNVDA 60%, mTSLA 30%, mAAPL 10%로 분배").

### 5.2 아키텍처

**5.2.1 모델 베이스 (MVP)**
- **휴리스틱 + LLM** — 실제 라우트 계산은 그래프 탐색 (다익스트라 기반), LLM은:
  - 사용자 의도 파싱 (자연어 → 거래 의도)
  - 라우트/LP 추천 결과 자연어 설명
  - 에이전트 오케스트레이션 (실패 시 재시도, 다중 후보 비교)
- **컨셉 슬로건:** "Explainable AI Router"

**5.2.2 실행 위치**
- **추론은 오프체인** (백엔드 서버)
- **모든 의사결정은 온체인 이벤트로 기록** — `AgentDecision(routeId, reason, txHash)` 이벤트 emit
- 셀링 포인트: "Verifiable Agent on Mantle"

**5.2.3 LLM 공급자**
- **개발용:** Claude API (Anthropic) — 한국어/구현 편의성
- **데모/심사용:** Z.ai (Mantle 스폰서) — 가점 어필
- 추상화 레이어로 swap 가능하게 설계

### 5.3 로드맵 진화 경로

MVP (D) → 성숙 단계 (C):
- 휴리스틱 → 시계열 학습 모델 (LP 수익률 예측 정교화)
- 단순 LLM 설명 → 멀티 에이전트 오케스트레이션 (Allora Network 같은 검증 가능 추론 통합)

---

## 6. 기술 스택

| 레이어 | 도구 | 비고 |
|---|---|---|
| 스마트컨트랙트 | **Solidity + Foundry** | Mantle EVM 호환, 빠른 테스트 |
| AMM | **Uniswap V2 fork** | V3는 한 달 스코프 벗어남 |
| 오라클 | **Pyth Network** | Mantle 지원, 주식 시세 피드 보유 |
| 백엔드 | **Next.js 14 API Routes + TypeScript** | 프론트 일체형 |
| DB | **Supabase Postgres** | 토큰 메타 / 거래 이력 / AI 결정 로그 |
| 데이터 소스 | **Polygon.io** | 주식 시세/거래량 API |
| 프론트 | **Next.js 14 App Router + Tailwind + shadcn/ui** | 빠른 프로토타입 |
| 지갑 | **RainbowKit + wagmi + viem** | 표준 |
| LLM | **Claude API (dev) / Z.ai (demo)** | 하이브리드 |
| 배포 | **Vercel (app) + Mantle 메인넷 (contracts)** | |
| 패키지 매니저 | **bun** | practice 프로젝트와 통일 |

---

## 7. MVP 범위 (Tier 2 — 권장안 채택)

### 7.1 시장 커버리지

- **Sepolia 실배포:** **1개 시장** (선정 후보: 나스닥 — 글로벌 인지도 + 데이터 풍부)
- **Mock 시각화:** 나머지 시장 (코스닥, 일본 TSE) — 데모 시각화용
- **메인넷 배포:** 제출 마감(6/15) 이후 시연/시상 단계에서 여유 있으면 추가 — Phase 1 스코프 **밖**

### 7.2 토큰 수

- 매일 Sepolia 10개 + Mock 20개 = **약 30개/일** 토큰 발행 (시연 가능 규모)

### 7.3 AI 라우팅 대상 DEX

- **Fluxion / Merchant Moe / Agni Finance** (Mantle Top 3)

### 7.4 데모 시나리오

1. **사용자가 "오늘의 핫스톡 보여줘" 입력**
   → AI가 Top 10 카드 UI로 출력 (시장별 탭)
2. **사용자가 "mNVDA 100불어치 사줘" 입력**
   → AI 라우팅이 최적 경로 찾고 자연어 설명 + 원클릭 실행
3. **사용자가 "오늘 LP 어디 공급할까?" 입력**
   → AI 옵티마이저가 배분 추천 + 원클릭 실행
4. **다음날 시연:** 임계치 미달 토큰 강제 정산 → 보유자/LP에게 USDC 환산 자동 분배

---

## 8. 일정 / 마일스톤

오늘 = 2026-05-15. 제출 마감 = 2026-06-15. **가용 기간: 31일.**

| 주차 | 기간 | 목표 |
|---|---|---|
| **W1** | 5/15 ~ 5/22 | 컨트랙트 골격 (TokenFactory, AMM fork, Oracle adapter, Settlement) + Foundry 테스트 |
| **W2** | 5/22 ~ 5/29 | 백엔드 (스냅샷 잡, Pyth 연동, Polygon.io 크롤링, Supabase 스키마) + 컨트랙트 **Sepolia first deploy** |
| **W3** | 5/29 ~ 6/5 | AI 라우팅/LP 옵티마이저 (휴리스틱 + LLM 통합) + 프론트 골격 (지갑/대시보드/스왑/LP UI) |
| **W4** | 6/5 ~ 6/12 | 통합 테스트, 데모 시나리오 리허설, Mock 시장 추가, 발표자료 |
| **버퍼** | 6/12 ~ 6/15 | 버그 수정, 영상 녹화, 제출 |
| **Demo Day** | 7/2 ~ 7/3 | 라이브 데모 시연 |

### 핵심 데드라인
- **5/29:** Sepolia 첫 토큰 실제 발행 (한 종목이라도)
- **6/5:** AI 한 사이클 end-to-end 작동
- **6/12:** 통합 데모 완료
- **6/15:** 최종 제출
- **(스트레치) 6/15 이후:** 여유 있으면 Mantle 메인넷 1개 시장 추가 배포

---

## 9. 팀 & R&R

| 역할 | 담당 |
|---|---|
| 기획 / PM / 발표 | 본인 (Youngin) |
| 검토 / 배포 / 매뉴얼 작업 (트랜잭션 서명, 키 관리, API 키 결제) | 언니 |
| 코드 작성 (컨트랙트, 백엔드, 프론트, AI 통합) | Claude (Code) |
| 발표용 데모 데이터 큐레이션 | 본인 |

**Claude가 못 하는 부분 (사람 필요):**
- Sepolia 컨트랙트 배포 트랜잭션 서명 (faucet으로 가스 충당)
- 외부 API 키 발급/결제 (Polygon.io, Anthropic, Supabase)
- AI 에이전트 지갑 프라이빗 키 관리
- 데모 데이 라이브 시연
- (스트레치) 제출 후 메인넷 배포 시 USDC 시드 + 가스

---

## 10. 해커톤 컨텍스트

### 10.1 행사 정보

- **명칭:** Mantle Turing Test Hackathon 2026
- **주최:** Mantle Foundation
- **코호스트:** Bybit / Byreal / Blockchain for Good Alliance (BGA)
- **지원:** DoraHacks, HackQuest
- **스폰서:** Tencent Cloud, Mirana Ventures, Orbit AI, Animoca Brands, Nansen, Elfa AI, Z.ai 등
- **총 상금:** $120,000 (Phase 1 $20K + Phase 2 $100K)

### 10.2 우리 트랙

**AI × RWA 트랙** — 공식 설명:
> *"Dynamic yield strategies and automated risk management for assets including USDY and mETH, built on Mantle's RWA infrastructure"*

### 10.3 우리 컨셉 ↔ 트랙 키워드 매핑

| 트랙 키워드 | Jion 대응 요소 |
|---|---|
| RWA | 주식 토큰화 (실세계 자산) |
| Dynamic yield strategies | AI LP 옵티마이저 |
| Automated risk management | 동적 임계치($10K) 기반 자동 폐기/정산 |
| Mantle RWA infrastructure | Pyth 오라클 + Mantle Sepolia 배포 (제출 후 메인넷 확장) |

### 10.4 심사위원 어필 포인트

심사진(Allora Network, Nansen, Z.ai, Animoca Brands, DoraHacks 등) 어필:
1. **Sepolia 실배포 + 메인넷 ready 컨트랙트** — 작동 신뢰 + 즉시 메인넷 가능한 인프라
2. **온체인 의사결정 기록** — "Verifiable Agent" 컨셉 (Allora 친화적)
3. **명확한 로드맵** — 휴리스틱 → 시계열/검증 가능 추론 진화
4. **Z.ai 통합** — 스폰서 가점

---

## 11. 로드맵 (제출 이후)

- **단기:** AI 모델 휴리스틱 → 시계열 학습 모델 교체
- **중기:** 시장 확장 (5개 시장 메인넷), 거버넌스 토큰 도입 검토
- **장기:** Allora Network 통합으로 검증 가능 추론 (zkML 또는 Allora 컨센서스)
- **사업화:** 거래 수수료 + 정산 수수료가 메인 수익원. 향후 기관 LP / 인덱스 ETF 같은 wrap product 가능

---

## 12. 리스크 / 알려진 문제

| 리스크 | 완화책 |
|---|---|
| Sepolia faucet 한도 | 가스 부족 시 다중 faucet 활용. 메인넷은 제출 후 단계 |
| 오라클 시세 신뢰성 | Pyth Sepolia 우선, 폴백으로 Chainlink |
| 주식 시장 휴장 대응 | 휴장일 발행 스킵 로직 명시 |
| AI 라우팅 정확도 | 휴리스틱 + 사전 정의 라우트 화이트리스트 |
| 시연 중 라이브 실패 | 녹화 데모 백업 준비 |
| 규제 (실 주식 가치 페깅) | "합성 토큰 / 가격 추종" 명시, 실 주식 보유 아님 |

---

## 부록 A — 컨트랙트 구조 (초안)

```
contracts/
├─ TokenFactory.sol        // ERC-20 합성토큰 발행
├─ JionPool.sol            // Uniswap V2 fork AMM
├─ OracleAdapter.sol       // Pyth 시세 어댑터
├─ Settlement.sol          // 임계치 미달 시 강제 정산
├─ AgentLogger.sol         // AI 의사결정 온체인 기록
└─ JionRouter.sol          // 외부 호출 진입점
```

## 부록 B — 백엔드 잡 스케줄

| 잡 | 트리거 | 동작 |
|---|---|---|
| `snapshot-market` | 각 시장 개장 +1시간 (cron) | Polygon.io에서 Top 10 가져옴 → DB 저장 |
| `deploy-tokens` | 스냅샷 직후 | TokenFactory 호출 → 10개 토큰 배포 |
| `daily-volume-check` | 매일 개장 +1시간 | 직전 24h 거래량 측정 → 임계치 비교 → 통과/정산 |
| `settle-expired` | volume-check가 정산 결정 시 | Settlement 컨트랙트 호출 |
| `ai-decision-log` | 모든 AI 의사결정 시 | AgentLogger 이벤트 emit + DB 동기화 |
