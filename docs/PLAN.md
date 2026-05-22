# Jion — 일일 거래량 Top 10 RWA 토큰화 + AI 분배 라우팅 인프라

> **출품 해커톤:** Mantle Turing Test Hackathon 2026 — Phase 2 (AI Awakening) / **AI × RWA 트랙**
> **제출 마감:** 2026-06-15 · **데모 데이:** 2026-07-02 ~ 03 · **수상:** 2026-07-10
> **팀:** 2명 (PM/기획 1 + 개발/배포 1) + Claude (코드 작성 위임)

---

## 📌 Revision History

> ### 🛟 2026-05-22 — **Force-settle 폐기 → Voluntary Redemption Right**
>
> **이전:** 24h 통합 거래량 < $10K → `Settlement` 컨트랙트가 모든 어댑터에서 일괄 회수 + 0.5% fee 차감 + 보유자 pro-rata claim (시스템 자동 트리거).
>
> **이후:** 자동 force-settle 폐기. 대신 홀더가 **언제든** `Settlement.redeem(token, amount)`를 호출해 **오라클 시세로 직접 환매** 가능 (GMX/Synthetix 스타일).
>
> **왜 바꿨나:**
> - "Jion은 인프라, 외부 venue가 거래" 피봇 이후 — 외부 venue(MerchantMoe, Lendle)의 LP/포지션 사용자한테 강제 unwind 트리거하는 건 강압적이고 정합성 깨짐
> - 어댑터의 `volume24h()` self-report 신뢰성 낮음. lending market은 "volume" 개념 자체가 없음 (utilization)
> - mTICKER 재사용 모델(ticker당 토큰 1개)과 매일 burn 트리거가 모순
> - 그러나 force-settle 그냥 폐기하면 **거래량 죽었을 때 홀더가 갇힘** → voluntary redemption으로 *영구* exit 보장
>
> **재설계 플로우:**
> ```
> holder calls Settlement.redeem(mNVDA, amount)
>   → Pyth oracle로 NVDA/USD 시세 읽음
>   → Distributor.unwindProportional(token, fraction)
>     → IJionAdapter.withdraw() 모든 venue에서 비례 회수
>   → 회수한 USDC를 holder에게 (best-effort, partial-fill 가능)
>   → holder의 mTICKER 양만큼 burn
>   → Redeemed(token, holder, amount, usdcOut, oraclePrice) 이벤트
> ```
>
> **영향:**
> - **§4.4 동적 생명주기** — 자동 정산 트리거 삭제, 홀더 redemption 섹션 추가
> - **§5.2 수수료** — 0.5% 정산 수수료 → "redemption fee" 로 의미 재정의 (세현 결정: 유지/면제)
> - **§7 자동화 잡** — `daily-volume-check` / `settle-expired` 잡 제거
> - **부록 A 컨트랙트 구조** — `Settlement.sol` 함수 시그니처 변경 (`settle/claim` 제거, `redeem` 추가), `Distributor.unwindProportional` 추가
> - **`IJionAdapter.volume24h()` 용도 재정의** — kill 트리거가 아니라 **router scoring + 분석용** (어댑터 시그니처는 유지)
>
> **세현(@saehyunyoo) 영향:**
> - Settlement.sol + Distributor.sol 재설계 + Sepolia 재배포 필요
> - 6개 의사결정 항목은 이슈 #33 체크박스 참고 (방향성 동의 확인됨, 세부는 그쪽에서)
>
> ### 🏷️ 2026-05-21 — **토큰 명명 규칙 변경 (재발행 X)**
>
> **이전:** 매일 top10 → `mTICKER-YYYYMMDD` 형식으로 매일 새 ERC-20 발행. 같은 ticker라도 발행일 다르면 별개 토큰.
>
> **이후:** **Ticker 1개당 토큰 1개** 유지. 토큰 명명 `mTICKER` (날짜 없음).
> - 매일 top10 측정 → **새로 진입한 ticker만** 발행. 기존 ticker가 top10에 있으면 유지 (재발행 X)
> - **이탈한 ticker** → 24h grace period 후 24h 거래량 < $10K이면 정산
> - 유동성이 한 풀에 집중. 유저 경험 자연스러움 (어제 산 토큰 = 오늘 산 토큰)
>
> **영향 섹션:**
> - §4.1 발행 (재발행 로직 추가)
> - §4.4 생명주기 (top10 이탈 + grace + 거래량 미달 조합)
> - 부록 A: `TokenFactory.sol` (skip-if-exists 로직 필요 — 세현 영향)
> - 부록 B: `issue-tokens` 잡 (delta 계산 — 새 진입만 발행)
>
> **세현(@saehyunyoo) 주의:** `TokenFactory` 컨트랙트 + `issue-tokens` 잡이 매일 발행 가정이라면 변경 필요. 자세한 건 이슈 #5 코멘트.

> ### 🧩 2026-05-20 저녁 — **인프라 컨셉 증명 (T7/T8 신설)**
>
> 영인 질문: \"하이브리드면 우리가 인프라/어댑터이고 외부 DeFi가 호환해서 쓸 수 있다는 걸 어떻게 보여줘?\" → 다음 추가:
> - **T7 (#16, 영인):** Developer Integration 페이지 + Jion-Issued RWA Token Standard 문서 + T1 카드 \"Mock\" 라벨링
> - **T8 (#17, 세현):** Mock 외부 어댑터 컨트랙트(`MerchantMoeMockAdapter` / `LendleMockAdapter`) Sepolia 자체 배포 → 데모에서 \"한 토큰이 셋(SelfPool + Mock MerchantMoe + Mock Lendle)에 동시 listing\" 시연
>
> 결과: 데모/심사위원에게 \"Adapter Pattern이 진짜 작동한다\" + \"외부 DeFi가 어떻게 통합하면 되는지\" 명시적으로 증명.
>
> ### 🔧 2026-05-20 PM — **하이브리드 합의 (피봇 조정)**
>
> 세현이 PR #9에서 \"Merchant Moe Sepolia 미배포\" 확인 → Sepolia에 외부 DeFi 인스턴스 없음.
>
> **타협안 (영인 결정):** Jion 자체 풀(`JionPool`) + Adapter 패턴 인프라 둘 다 유지.
> - **Phase 1 MVP:** 자체 풀(`JionPool` = `SelfPoolAdapter`) 1개 + Mock 외부 어댑터 2~3개 (T8). AI 분배 라우팅 = 어떤 어댑터에 어떤 파라미터로 listing할지 결정
> - **Phase 2+:** Mock → 실제 외부 DeFi 어댑터(MerchantMoe/Fluxion/Agni/Lendle/Init Capital) 확장 — `IJionAdapter` 인터페이스로 통일
> - `JionPool.sol` / `JionRouter.sol` 삭제 **취소**. 세현 PR #10 골격 그대로 유지
> - `Distributor.sol` + `IJionAdapter` 인터페이스 + `SelfPoolAdapter` 신설 (T5)
>
> 즉 \"외부 분배\" 컨셉의 **아키텍처(어댑터 패턴)는 유지**, MVP **구현은 자체 풀 + Mock 외부 어댑터**. Sepolia 현실 + 세현 진척 + 인프라 컨셉 증명 셋 다 만족.
>
> ### 🔄 2026-05-20 AM — **컨셉 피봇 (PIVOT)** *(하이브리드로 조정됨, 위 참고)*
>
> **이전:** Jion이 자체 AMM(JionPool, Uniswap V2 fork) 운영 + 자체 사이트에서 사용자 swap/LP UI 제공.
>
> **이후:** Jion은 **토큰화 + AI 분배 라우팅 인프라**. 자체 거래 UI 없음. 발행 직후 AI가 **(MVP) 자체 풀에 / (Phase 2+) 외부 Mantle DeFi 프로토콜**(Merchant Moe / Fluxion / Agni / Lendle / Init Capital)에 자동 상장/시드. 트레이더는 분배된 곳에서 거래, DeFi 앱 개발자는 API/구독으로 새 토큰을 가져감.
>
> **영향 받은 섹션:**
> - §2.2 해결책 (AI 라우팅 → AI 분배 라우팅)
> - §3 핵심 컨셉 표 (장기 비전 / 타겟 유저 / 차별점)
> - §4 토큰 메커니즘 — **§4.2 분배 신설**, §4.3 외부 통합 신설, §4.4 생명주기 (통합 거래량 기준), §4.5 수익 모델 (거래 수수료 → 분배 수수료)
> - §5 AI 시스템 — §5.1 역할 (스왑 라우팅/LP 옵티마이저 → 분배 라우팅/Cross-DeFi Performance), §5.2 컨셉 슬로건 ("Explainable AI Distribution")
> - §7.4 데모 시나리오 (T1~T4 전부 재정의)
> - §10.3 트랙 매핑, §10.4 어필 포인트 (다 프로토콜 통합 어필 추가)
> - **부록 A 컨트랙트 구조** ⚠️ — **JionPool.sol + JionRouter.sol 삭제**, Distributor.sol + adapters/{MerchantMoe,Fluxion,Agni,Lendle,InitCapital}Adapter.sol 추가
> - 부록 B 잡 스케줄 (`deploy-tokens` → `issue-tokens` + `compute-distribution` + `execute-distribution`)
>
> **T5(#5) 작업자(@saehyunyoo) 주의:** 부록 A 컨트랙트 구조가 가장 큰 영향 받음. 작업 시작 전 부록 A 확인 필수. 자세한 작업 항목은 [이슈 #5](https://github.com/saehyunyoo/Mantle-hackathon/issues/5) 본문 갱신본 참조.
>
> ### 🔄 2026-05-18 — 체인 정책 변경
>
> 메인넷 first deploy → **Sepolia 우선** (메인넷은 제출 후 스트레치). §3 체인, §7.1 시장 커버리지, §8 일정 영향.

---

## 1. 한 줄 요약

**Jion은 매일 시장별 거래량 Top 10 주식을 자동으로 토큰화해서 Mantle DeFi 전체에 AI가 최적 분배(상장)해주는 RWA × AI 인프라다.** 거래는 Jion이 아니라 분배된 DeFi 프로토콜(Merchant Moe / Fluxion / Agni / Lendle / Init Capital)에서 발생한다.

---

## 2. 문제와 해결책

### 2.1 문제

- **TradFi → DeFi 진입장벽:** 주식 트레이더가 크립토로 넘어올 때, 익숙한 자산(주식)이 온체인에 없음. "내가 아는 종목"을 온체인에서 거래할 길이 거의 없음.
- **합성주식 토큰의 문제:** 기존 합성주식 토큰(Synthetix sTSLA 등)은 사용자가 직접 발행 종목을 선택해야 하고, 유동성이 분산돼 사실상 일부 대형주만 거래 가능.
- **유동성 비효율:** 같은 자산이 여러 DEX에 흩어져 있어 최적 라우트를 사람이 찾기 어렵고, LP 수익률도 어디에 공급할지 판단이 힘듦.

### 2.2 해결책 (Jion의 답)

1. **큐레이션 자동화** — 매일 시장 개장 +1시간 시점 거래량 Top 10을 자동 스냅샷 → 합성 토큰(ERC-20) 자동 발행. 사용자는 "선택"이 아니라 "오늘의 트렌딩"을 받음.
2. **AI 분배 라우팅 (Distribution Routing)** — 발행 직후 각 토큰을 어느 DeFi 프로토콜(AMM/렌딩/담보)에 어떤 파라미터로 상장할지 AI가 결정. 토큰 특성(거래량/변동성/시가총액)에 따라 최적 분배 전략 자동 실행.
3. **Cross-DeFi 통합 카탈로그** — 트레이더는 "어디서 거래 가능한지" 명단을 한 곳에서. DeFi 앱은 API/구독으로 새 토큰을 자동 통합.
4. **자연 청산 + 홀더 보호** — 컨트랙트는 영구. 거래량 죽으면 시장이 알아서 정리(LP 빠짐 / lending idle). 홀더는 언제든 `Settlement.redeem()`으로 오라클 시세 환매 가능 — 갇히지 않음. 🛟 *2026-05-22 force-settle 폐기*

---

## 3. 핵심 컨셉

| 항목 | 내용 |
|---|---|
| **장기 비전** | RWA 토큰화 인프라 + AI 분배 엔진 (Mantle DeFi 표준 입구) |
| **MVP 컨셉** | 시뮬레이션 + 오라클 페깅 + 외부 DeFi 통합(Mock listing 일부) |
| **체인** | Mantle (EVM L2) **Sepolia 테스트넷 우선 배포** (메인넷은 제출 이후 후순위) |
| **타겟 유저** | (a) TradFi → DeFi 트레이더 (b) Mantle DeFi 앱 개발자 — **양방향 B2B/B2C** |
| **차별점** | "Jion에서 거래 안 함" — 발행 + 분배만. 거래는 Mantle DeFi 전체로 흩어짐. 사용자는 종목/풀 고를 필요 없고, DeFi는 새 RWA 토큰을 자동으로 받음 |

---

## 4. 토큰 메커니즘 🔄 *2026-05-20 피봇*

### 4.1 발행 (Issuance) 🏷️ *2026-05-21 명명 규칙 변경*

- **트리거:** 각 시장 개장 +1시간 자동 (KRX 10:00 KST / NASDAQ 10:30 ET / TSE 10:00 JST 등)
- **선정 기준:** 직전 1시간 거래량 Top 10
- **토큰 표준:** ERC-20 — **`mTICKER`** (예: `mNVDA`, `m005930`, `m7203`). **Ticker 1개당 토큰 1개** 유지
- **재발행 정책:** 매일 top10 측정 → **새로 진입한 ticker만** 발행. 기존 ticker가 top10에 있으면 기존 토큰 유지 (재발행 X — 유동성 분산 방지)
- **발행가:** 오라클(Pyth Network) 시세 = 1 토큰 가격
- **유통:** Jion은 직접 AMM 운영 안 함. 발행 직후 AI 라우팅 결과대로 **외부 DeFi 프로토콜에 자동 분배** (4.2 참고)

### 4.2 분배 (Distribution) — Jion의 핵심 🆕 *2026-05-20 신설 / 🔧 PM 하이브리드 조정*

발행된 토큰을 **AI가 결정한 라우팅대로 분배 대상에 자동 상장/시드**한다. 분배 대상은 `IJionAdapter` 인터페이스를 구현한 어댑터 컨트랙트(부록 A).

- **Phase 1 MVP 활성 어댑터:**
  - `SelfPoolAdapter` — Jion 자체 V2 fork `JionPool` (Sepolia에 외부 DeFi 인스턴스 부재로 자체 풀이 1차 분배 대상)
- **Phase 2+ 확장 어댑터 (현재 stub):**
  - AMM: Merchant Moe / Fluxion / Agni Finance
  - 렌딩/담보: Lendle / Init Capital
- **분배 결정 입력:** 토큰 거래량 랭크, 변동성, 시가총액, 풀 깊이, 프로토콜별 fee tier
- **분배 결정 출력:** `TokenDistribution { listings: DeFiListing[], routingReasoning: string }` — 어떤 어댑터에 어떤 kind(AMM/담보/렌딩)로 얼마 시드할지 + 자연어 설명
- **실행:** `Distributor` 컨트랙트가 `IJionAdapter`의 `list()` 함수를 일괄 호출 (Phase 1엔 SelfPoolAdapter만, Phase 2+엔 외부 어댑터 추가)
- **거래는 분배된 곳에서:** Phase 1엔 JionPool에서, Phase 2+엔 외부 Mantle DeFi에서. Jion 사이트는 카탈로그/모니터링만.

### 4.3 외부 통합 (B2B Integration)

- **API/구독:** DeFi 앱이 새 토큰을 자동 가져갈 수 있게 webhook + REST API (예: `GET /api/today` → 오늘 발행 토큰 + 분배 정보)
- **신규 DeFi 추가:** 새 프로토콜이 등록되면 다음 발행 사이클부터 라우팅 후보에 포함

### 4.4 생명주기 (Lifecycle) — 자연 청산 + Voluntary Redemption 🛟 *2026-05-22 갱신*

mTICKER 토큰은 **영구 컨트랙트** (재발행 X). 매일 새 top10 진입 ticker만 새로 발행하고, 이탈한 ticker는 강제 burn하지 않음. 자연 청산 + 홀더 보호 두 갈래로 작동:

**자연 청산 (시스템은 가만히)**

| 시나리오 | 조치 |
|---|---|
| Top 10 안에 있음 | 유지, 필요 시 추가 mint (재발행 X — 유동성 분산 방지) |
| Top 10 이탈 | 추가 mint 없음. 컨트랙트는 그대로 살아 있음 |

AMM LP는 거래 없으면 알아서 빠짐, lending market은 utilization 떨어지면 알아서 idle. 시장이 토큰을 정리함 — 시스템이 강제 burn 안 함.

**홀더 보호 — Voluntary Redemption Right** *(컨트랙트 신설, UI는 Phase 2+)*

거래량 죽었을 때 홀더가 갇히지 않도록 **언제든** 오라클 시세로 직접 환매 가능:

```
holder calls Settlement.redeem(mTICKER, amount)
  → Pyth oracle 시세 읽음
  → Distributor.unwindProportional(token, fraction)
    → IJionAdapter.withdraw() 모든 venue에서 비례 회수
  → 회수한 USDC를 holder에게 (best-effort, partial-fill 가능)
  → holder의 mTICKER 양만큼 burn
  → Redeemed(...) 이벤트
```

> **데모/제출 범위:** 컨트랙트 함수(`Settlement.redeem`)는 **배포 + 테스트 케이스로 입증**하되, 홈 카드에 "Redeem at oracle" 버튼은 **넣지 않음**. 이유: 데모 viewer가 AI 라우팅 핵심 메시지 대신 "어떻게 redeem 받지?"에 시선 뺏김. 홀더 UI는 **Phase 2+ 스코프**.

**이전 force-settle 정책과 비교:**

| | Before (force-settle, deprecated) | After (voluntary redeem) |
|---|---|---|
| 트리거 | 24h vol < $10K → 시스템 자동 burn | 홀더가 원할 때 |
| 외부 venue 영향 | 강제 unwind (LP/포지션 강탈) | 비례 unwind만 |
| 홀더 exit 보장 | 정산 후에만 | 항상 (오라클 시세) |
| `volume24h()` 용도 | kill 트리거 | **router scoring + 분석용**으로 재정의 |

**근거:** "Jion은 인프라, 외부 venue가 거래" 피봇 이후 force-settle은 외부 venue 사용자에 대해 강압적이고 자가당착 (`mTICKER` 재사용 모델과도 모순). 이슈 #33에서 합의.

### 4.5 수익 모델

| 수익원 | 비율 | 비고 |
|---|---|---|
| **분배 수수료** | 0.1% | 분배된 DeFi 풀의 거래 수수료 일부를 Jion 프로토콜이 retainer로 수령 |
| **Redemption fee** | 0.5% (예정) | 홀더가 `Settlement.redeem()` 호출 시 회수 USDC에서 차감. 세현 결정에 따라 면제 가능 (#33) |
| **B2B API** | 향후 유료 tier | DeFi 앱 대상 webhook/SLA — Phase 2 이후 |
| **발행 수수료** | **무료** | 접근성 우선 — 프로토콜이 시드 |

---

## 5. AI 시스템 🔄 *2026-05-20 피봇*

### 5.1 역할

**5.1.1 AI 분배 라우팅 (Distribution Routing) — 핵심**
- 신규 발행된 각 토큰을 **어느 DeFi 프로토콜에 어떤 kind(AMM/담보/렌딩)로, 어떤 파라미터로 상장할지** 결정.
- 입력: 거래량 랭크, 변동성, 시가총액, 각 프로토콜의 풀 깊이/fee tier/지원 자산
- 출력: `TokenDistribution { listings: [{ protocol, kind, listingAddress, tvlUsd, reasoning }], routingReasoning }` — 어디에 얼마 시드할지 + 자연어 설명
- 예: "mNVDA는 거래량 1위 → Merchant Moe(가장 깊은 USDC 페어) 메인 풀 + Lendle 담보 등록. mTSLA는 변동성 큼 → Fluxion 집중유동성 메인 + Agni 보조 풀 (cross-venue arb)"

**5.1.2 Cross-DeFi Performance Monitor**
- 분배된 토큰들이 각 DeFi에서 어떻게 거래되고 있는지 실시간 추적
- TVL / 24h volume / unique trader 수 / fee retainer
- 다음 발행 사이클의 분배 라우팅 입력으로 피드백 (학습 루프)

### 5.2 아키텍처

**5.2.1 모델 베이스 (MVP)**
- **휴리스틱 + LLM** — 실제 분배 결정은 룰베이스 스코어링 (volume × depth × volatility), LLM은:
  - 분배 결정 결과 자연어 설명 (트레이더/심사위원 readable)
  - 에이전트 오케스트레이션 (분배 실패 시 폴백 라우트)
  - 다음 사이클 입력 피드백 요약
- **컨셉 슬로건:** "Explainable AI Distribution"

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

### 7.3 AI 분배 라우팅 대상 프로토콜

- **AMM:** Merchant Moe / Fluxion / Agni Finance
- **렌딩/담보:** Lendle / Init Capital

### 7.4 데모 시나리오 🔄 *2026-05-20 피봇 — T1~T4 전부 재정의됨*

1. **Trade today's trend (T1)**
   → 오늘 발행된 토큰 카드 + 각 토큰이 어느 DeFi에 분배됐는지 칩. "Jion에서 거래 안 함, 분배된 곳으로 가서 거래" 메시지 명확.
2. **AI Distribution Routing (T2)**
   → 토큰 한 개 선택 → "왜 이 토큰이 Merchant Moe + Lendle에 갔는지" 자연어 설명 + 대안 비교 + 분배 결정 원본 데이터(스코어 테이블)
3. **Cross-DeFi Performance (T3)**
   → 분배된 토큰들의 각 DeFi 프로토콜별 TVL/24h volume/trader 수 통합 대시보드. "어디서 가장 잘 돌고 있는지" 한눈에.
4. **다음날 시연 (T6 갱신)** 🛟 *2026-05-22 force-settle 폐기*
   → 홀더가 `Settlement.redeem(mTICKER, amount)` 호출 → 모든 어댑터에서 비례 회수 → 오라클 시세 USDC 환매. 강제 burn 없음, 홀더 self-trigger

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
| Dynamic yield strategies | AI 분배 라우팅 — 토큰별 최적 DeFi 상장 전략 |
| Automated risk management | 동적 임계치($10K) 통합 거래량 기반 자동 폐기/정산 |
| Mantle RWA infrastructure | Pyth 오라클 + Mantle DeFi 5개 프로토콜 통합 (Sepolia) |

### 10.4 심사위원 어필 포인트

심사진(Allora Network, Nansen, Z.ai, Animoca Brands, DoraHacks 등) 어필:
1. **Sepolia 실배포 + 메인넷 ready 컨트랙트** — 작동 신뢰 + 즉시 메인넷 가능한 인프라
2. **Mantle DeFi 다(多) 프로토콜 통합** — 자체 AMM 운영이 아닌 외부 생태계 연결 = Mantle ecosystem 친화적 어필
3. **온체인 의사결정 기록** — "Verifiable Agent" 컨셉 (Allora 친화적)
4. **명확한 로드맵** — 휴리스틱 → 시계열/검증 가능 추론 진화
5. **Z.ai 통합** — 스폰서 가점

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

## 부록 A — 컨트랙트 구조 (초안) 🔧 *2026-05-20 PM 하이브리드 — T5 작업자(@saehyunyoo) 필독*

> ### 🔧 하이브리드 합의 (PR #10 골격 + Adapter 인터페이스 신설)
>
> | 항목 | 결정 |
> |---|---|
> | 자체 AMM `JionPool.sol` | ✅ **유지** — Sepolia 외부 DeFi 부재로 자체 풀 필요. PR #10 골격 그대로 |
> | 거래 라우터 `JionRouter.sol` | ✅ **유지** — 자체 풀 거래 진입점. PR #10 골격 그대로 |
> | 분배 컨트랙트 `Distributor.sol` | ✅ **신설** — AI 분배 결정 받아 `IJionAdapter` 일괄 호출 |
> | 어댑터 인터페이스 `IJionAdapter` | ✅ **신설** — 분배 대상 통일 인터페이스 |
> | `SelfPoolAdapter` (JionPool 래퍼) | ✅ **신설 (Phase 1 MVP)** — Distributor가 호출하는 첫 어댑터 |
> | 외부 DeFi 어댑터 (MerchantMoe/Fluxion/...) | 🔮 **Phase 2+ stub** — 인터페이스만 정의, 실 구현은 future |
>
> **이유:** Sepolia에 외부 DeFi 인스턴스 없음(세현 [PR #9 RESEARCH.md](https://github.com/saehyunyoo/Mantle-hackathon/pull/9) 확인). MVP는 자체 풀로 가되, Adapter 패턴 인프라를 미리 깔아 Phase 2+에 외부 DeFi 확장 가능하게.
>
> **T5 작업 가이드:** 세현 PR #10 골격 그대로 가도 됨. 추가로 `Distributor.sol` + `IJionAdapter.sol` + `SelfPoolAdapter.sol` 작성. 외부 어댑터는 인터페이스만 stub.

```
contracts/
├─ JionToken.sol             // ERC-20 합성토큰 (mTICKER — 2026-05-21 명명 변경)
├─ TokenFactory.sol          // 일별 배치 발행 (skip-if-exists, 새 ticker만 발행)
├─ OracleAdapter.sol         // Pyth 시세 어댑터
├─ JionPool.sol              // Uniswap V2 fork AMM (Phase 1 MVP 활성)
├─ JionRouter.sol            // 자체 풀 거래 진입점
├─ Distributor.sol           // 🆕 AI 분배 결정 → IJionAdapter 일괄 실행
├─ Settlement.sol            // 🛟 voluntary redemption (Settlement.redeem) — 오라클 시세로 홀더 환매 (force-settle deprecated)
├─ AgentLogger.sol           // AI 의사결정 온체인 기록 (TokenDistribution emit)
└─ adapters/                 // 🆕 분배 대상 어댑터 (IJionAdapter 통일)
   ├─ IJionAdapter.sol       // 인터페이스 (list / withdraw / volume24h)
   ├─ SelfPoolAdapter.sol    // 🆕 JionPool 래퍼 (Phase 1 활성)
   ├─ MerchantMoeAdapter.sol // 🔮 Phase 2+ stub
   ├─ FluxionAdapter.sol     // 🔮 Phase 2+ stub
   ├─ AgniAdapter.sol        // 🔮 Phase 2+ stub
   ├─ LendleAdapter.sol      // 🔮 Phase 2+ stub
   └─ InitCapitalAdapter.sol // 🔮 Phase 2+ stub
```

**Phase 1 (MVP) 활성 어댑터:** `SelfPoolAdapter` 1개. AI 분배 라우팅 = JionPool에 어떤 초기 시드/fee tier로 listing할지 결정.

**Phase 2+ 확장 경로:** Mantle DeFi 프로토콜 Sepolia/메인넷 인스턴스 생기면 어댑터 stub만 실 구현으로 swap. `Distributor` 로직 변경 없음.

## 부록 B — 백엔드 잡 스케줄 🔄 *2026-05-20 피봇 — `compute-distribution` + `execute-distribution` 신설*

| 잡 | 트리거 | 동작 |
|---|---|---|
| `snapshot-market` | 각 시장 개장 +1시간 (cron) | Polygon.io에서 Top 10 가져옴 → DB 저장 |
| `issue-tokens` | 스냅샷 직후 | **새 진입 ticker만** TokenFactory 호출 (기존 활성 토큰과 비교 후 delta만 발행) |
| `compute-distribution` | issue-tokens 직후 | 각 토큰의 분배 라우팅 결정 (휴리스틱+LLM) → `TokenDistribution` 산출 |
| `execute-distribution` | compute-distribution 직후 | Distributor 호출 → 각 어댑터로 외부 DeFi 풀/담보 등록 |
| ~~`daily-volume-check`~~ | ~~매일 개장 +1시간~~ | 🛟 **2026-05-22 폐기** — force-settle 정책 폐기에 따라 자동 임계치 체크 잡 제거 |
| ~~`settle-expired`~~ | ~~volume-check가 정산 결정 시~~ | 🛟 **2026-05-22 폐기** — `Settlement.redeem`은 홀더 self-trigger라서 백엔드 잡 불필요 |
| `ai-decision-log` | 모든 AI 분배 결정 시 | AgentLogger 이벤트 emit + DB 동기화 |
| `analytics-volume24h` *(선택)* | 시간당 | `IJionAdapter.volume24h()` 폴링 → router scoring + 대시보드 분석용 (kill 트리거 X) |
