# Jion — 해커톤 데모 스크립트 & 촬영 가이드

> **출품:** Mantle Turing Test Hackathon 2026 · **AI × RWA 트랙**
> **목표 길이:** 2분 30초 ~ 3분 (티저는 60초 버전 별도)
> **상태 기준:** 2026-05-23 main (`bbc5435`) — Pyth 30/30 라이브, retail home, T7, supply policy

---

## 0. 한 줄 정의 (외워서 첫 15초에)

> **"매일 가장 많이 거래된 주식을 자동 토큰화하고, AI가 Mantle DeFi 전역에 어디로 분배할지 결정하면서 그 이유를 설명한다 — 온체인으로 검증 가능하게."**

---

## 1. 핵심 강점 — 무엇을 내세울까

대부분의 해커톤 프로젝트가 못 하는 것 위주로:

| # | 강점 | 왜 강력한가 |
|---|---|---|
| 1 | **실 데이터로 작동** | Pyth 30/30 라이브 가격. 대부분 데모는 100% mock. NVDA, Toyota, Samsung 진짜 시세 |
| 2 | **Explainable AI** | 블랙박스 아님. 모든 라우팅 결정을 자연어로 설명 (Claude / Z.ai) |
| 3 | **Verifiable Agent (온체인)** | AgentLogger가 결정을 온체인 emit → explorer에서 재생 가능. **Allora 심사위원 정조준** |
| 4 | **Mantle 생태계 친화** | 자체 거래소 아님 — 외부 DeFi에 토큰을 *먹여줌*. Adapter 패턴으로 누구나 1개 파일로 통합 |
| 5 | **실배포 컨트랙트** | Sepolia에 9개 컨트랙트 deployed. mock UI 아니라 진짜 |

---

## 2. 트랙 매핑 (AI × RWA)

트랙 공식 설명: *"Dynamic yield strategies and automated risk management ... built on Mantle's RWA infrastructure"*

| 트랙 키워드 | Jion 대응 (데모에서 짚을 것) |
|---|---|
| RWA | 주식 토큰화 (NVDA / Toyota / Samsung — 인지도 높은 실자산) |
| Dynamic yield strategies | AI 분배 라우팅 — 토큰별 최적 venue 결정 |
| Automated risk management | Voluntary redemption (홀더 영구 exit) + rank-tier supply |
| Mantle RWA infrastructure | Pyth 오라클 + 5개 DeFi 어댑터 패턴 |

심사 라인업: Allora Network · Nansen · Z.ai · Animoca Brands · DoraHacks

---

## 3. 데모 스크립트 (shot-by-shot)

### 🎬 Shot 1 — Hook (0:00–0:20)
- **화면:** 홈 `/` — "Pyth · live 30/30" 배지 클로즈업
- **나레이션:**
  > "주식 트레이더가 크립토로 넘어올 때, 아는 종목이 온체인에 없어요. Jion은 매일 거래량 top-10 주식을 자동 토큰화해서 Mantle DeFi 전역에 AI가 배치합니다. 지금 보시는 가격, 전부 Pyth 오라클 실시간이에요."
- **액션:** 마우스로 "Pyth · live 30/30" 가리키기 → NVDA 가격 가리키며 "실제 NVIDIA 시세"

### 🎬 Shot 2 — 문제 + 큐레이션 (0:20–0:45)
- **화면:** 마켓 탭 전환 NASDAQ → KRX → TSE
- **나레이션:**
  > "기존 합성주식은 사용자가 직접 종목을 골라야 하고 유동성이 흩어집니다. Jion은 '선택'이 아니라 '오늘의 트렌딩'을 줍니다. NASDAQ, 한국, 일본 — 세 시장 모두."
- **액션:** 탭 넘기며 Samsung, Toyota 보여주기 (글로벌 어필)

### 🎬 Shot 3 — AI 라우팅 (핵심, 0:45–1:30)
- **화면:** 토큰 카드 "Why this route →" 클릭 → `/route/mNVDA`
- **나레이션:**
  > "각 토큰을 어느 DeFi에 보낼지 AI가 결정합니다. mNVDA는 거래량 1위, 변동성 높음 → Fluxion 집중유동성 + Lendle 담보. 그리고 **왜** 그렇게 했는지 자연어로 설명합니다."
- **액션:** Routing reasoning 박스 읽어주기 → 대안 비교 매트릭스 스크롤 → "블랙박스가 아니라 설명 가능한 AI"

### 🎬 Shot 4 — Cross-DeFi + 인프라 컨셉 (1:30–2:00)
- **화면:** `/performance` → `/integrate`
- **나레이션:**
  > "Jion은 거래소가 아닙니다. 토큰을 발행하고 분배만 해요. 외부 DeFi는 `IJionAdapter` 인터페이스 하나만 구현하면 새 RWA 토큰을 자동으로 받습니다. Mantle 생태계와 경쟁이 아니라 공급하는 인프라죠."
- **액션:** `/integrate` 의 어댑터 코드 스니펫 가리키기

### 🎬 Shot 5 — 온체인 검증 (2:00–2:25)
- **화면:** Mantle Sepolia Explorer (TokenFactory + AgentLogger)
- **나레이션:**
  > "모든 게 Mantle Sepolia에 실제 배포돼 있어요. 발행은 `TokenFactory`, 분배 결정은 `AgentLogger`가 온체인 이벤트로 기록 — 검증 가능한 에이전트입니다. 그리고 같은 ticker는 재발행 안 합니다. 이 한 줄이 유동성 분산을 막아요."
- **액션:** explorer에서 컨트랙트 또는 `tokenOf("mNVDA")` 보여주기

### 🎬 Shot 6 — 비전 / 클로즈 (2:25–2:50)
- **화면:** 홈으로 복귀
- **나레이션:**
  > "휴리스틱에서 시계열 학습으로, Mock 어댑터에서 실제 Mantle DeFi 통합으로. Jion은 TradFi와 DeFi를 잇는 RWA × AI 인프라입니다. 거래량이 죽어도 홀더는 언제든 오라클 시세로 환매 — 갇히지 않아요."

---

## 4. 60초 티저 버전 (소셜 / 제출 썸네일용)

1. (0:00–0:10) Hook — 홈 30/30 라이브 배지 + "오늘의 top-10 주식, 자동 토큰화"
2. (0:10–0:30) `/route/mNVDA` — "AI가 어디로 분배할지 결정하고 이유를 설명"
3. (0:30–0:45) `/integrate` + explorer — "외부 DeFi는 어댑터 1개로 통합, 온체인 검증"
4. (0:45–0:60) 클로즈 — "TradFi × DeFi 브리지, Mantle RWA 인프라"

---

## 5. 촬영 가이드

**기술 세팅**
- 화면 녹화: QuickTime (Mac) 또는 OBS, 1080p+
- 브라우저: 시크릿 창 + 확대 110~125% (글자 가독성)
- 녹화 전 `bun run dev` 띄우고 **모든 페이지 한 번씩 미리 로드** (Next.js 첫 컴파일 지연 제거)
- 마우스 커서 강조 켜기 (시선 유도)

**페이싱**
- 한 화면에 5초 이상 머물지 말기
- 가격이 라이브로 바뀌는 순간 잡으면 임팩트 ↑ (60초 revalidate — 새로고침하면 변동)
- 나레이션 미리 녹음 → 화면이랑 싱크

**구조 (해커톤 황금률)**
- 첫 15초에 "뭐 하는 건지" 명확히
- 작동하는 제품 먼저, 코드/아키텍처 나중
- 마지막에 비전 + 트랙 키워드 한 번 더

**백업**
- 라이브 시연 실패 대비 **녹화본 필수** (Pyth Hermes 503 가능성)
- 녹화는 라이브 데이터 잘 나올 때 미리 떠두기

---

## 6. ⚠️ 정직성 — 과장 금지 (심사위원이 코드/explorer 확인 가능)

| 하지 말 것 | 대신 이렇게 |
|---|---|
| "매일 자동으로 cron 돌아감" | "발행/분배 인프라 배포됨, ops가 트리거" (자동 스케줄 아직 X) |
| "거래량도 실시간" | "가격은 Pyth 라이브, 거래량/랭킹은 데모 fixture" (Polygon 키 없음) |
| "redeem 지금 작동" | "redeem 컨트랙트 함수 설계됨, 홀더 UI는 Phase 2+" (함수 미배포) |
| "외부 DeFi 실제 통합됨" | "Mock 어댑터로 패턴 증명, 실 통합 Phase 2+" (UI에 "Mock" 라벨 명시) |

→ **"지금 작동 + 명확한 로드맵"** 이 **"다 됐다고 거짓말"** 보다 훨씬 강함.

---

## 7. 데모 페이지 빠른 참조

| URL | 화면 | 데이터 |
|---|---|---|
| `/` | Trending (T1) | Pyth 라이브 가격 + mock 랭킹/볼륨 |
| `/route/mNVDA` | AI 라우팅 상세 (T2) | 라이브 가격 + LLM reasoning |
| `/route/m7203` | Toyota (TSE) | 일본 Pyth 피드 |
| `/route/m005930` | Samsung (KRX) | 한국 Pyth 피드 |
| `/reasoning` | 전 토큰 라우팅 종합 | mock 라우팅 텍스트 |
| `/performance` | Cross-DeFi (T3) | mock TVL/Volume |
| `/integrate` | 개발자 통합 (T7) | static 가이드 |
| `/feed` | Oracle 라이브 피드 | Pyth |

**배포 컨트랙트 (Mantle Sepolia, chain 5003):**
- TokenFactory · Distributor · Settlement · OracleAdapter · AgentLogger
- SelfPoolAdapter + MerchantMoeMockAdapter + LendleMockAdapter · MockUSDC
- 주소: `packages/types/src/addresses.ts` / explorer: https://explorer.sepolia.mantle.xyz
