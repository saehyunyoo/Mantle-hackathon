# Jion — Demo Script & Filming Guide (2-Minute, judging-optimized)

> **출품:** Mantle Turing Test Hackathon 2026 · **AI × RWA 트랙**
> **길이:** 2:00 (20 Deployment Award "demo video ≥ 2min" 충족) · 60초 티저 별도
> **VO 언어:** 영어 (UI 영어 + 국제 심사). 한국어 버전 필요하면 요청.
> **녹음:** 화면녹화 + 보이스오버 분리. §5 풀 VO 그대로 읽으면 ≈2:00.
> **서사 (외워둘 것):** "합성주식"이 아니라 — **"AI가 매일 트렌딩 주식을 자동 큐레이션 → 라우팅 → LP까지"** 하나의 자동화 파이프라인. (Innovation 방어)

## 0. 한 줄 정의 (첫 12초에)
> **"Today's trending stocks — auto-curated, AI-routed across Mantle DeFi, and logged on-chain."**

---

## 1. 🚨 촬영 전 필수 (하나라도 빠지면 데모 망함 — 녹화 시작 전 반드시 확인)
- [ ] **① AgentLogger 시드 실행** (`EmitAgentDecisions.s.sol`, DEPLOYER 키) → explorer 로그탭에 `AgentDecision` 이벤트가 떠야 함. **안 하면 1:18 머니샷(View on-chain)이 빈 화면 → 최대 강점 죽음.**
- [ ] **② public URL 로 녹화** (`*.vercel.app`). **localhost 녹화 절대 금지** (Product Completeness 감점 + Deployment Award 요건 위반)
- [ ] **③ Z.ai 켜기** (`LLM_PROVIDER=zai` + `ZAI_API_KEY`) → route 배지 **"Z.ai · live"** 떠야 스폰서 가점. 안 되면 Claude로라도 라이브 (fallback 텍스트로 녹화 금지)
- [ ] Pyth **"live 30/30"** 배지 확인 (Hermes 503이면 잘 나올 때 미리 녹화)
- [ ] 모든 페이지 미리 1회 로드 (Next.js 첫 컴파일 지연 제거)

> 위 ①②③ 안 된 상태로 녹화하면 심사위원이 클릭했을 때 빈 화면/localhost가 나와서 **오히려 감점**. 시간 없으면 이거부터.

---

## 2. 핵심 강점 (심사위원에게 각인시킬 것)
| # | 강점 | 왜 강력한가 |
|---|---|---|
| 0 | **유동성이 수요를 따라옴** | 매일 거래량 1등 종목만 다시 토큰화 → 가장 수요 큰 자산에 유동성 집중, stale 토큰 분산 X. "새 토큰 유동성 어디서?" 질문 선제 방어 |
| 1 | **자연어 인터페이스 (Ask Jion)** | "Show me today's hot stocks" 처럼 말로 조작 → 응답 스트리밍. **UI/UX·AI Interaction 직격** |
| 2 | **Explainable AI** | 블랙박스 아님 — 라우팅 이유를 실시간 자연어 + **점수 바**(volume×volatility×liquidity)로 시각화 |
| 3 | **Verifiable Agent (온체인)** | `AgentLogger`가 결정을 온체인 emit → explorer에서 재생. Allora/Z.ai 심사 정조준 |
| 4 | **실데이터 (Pyth 30/30 라이브)** | 대부분 데모 100% mock. NVDA·Toyota·Samsung 진짜 시세 |
| 5 | **Infra-not-venue + Adapter 표준** | 자체 거래소 아님. 외부 DeFi가 `IJionAdapter` 1개로 통합. 생태계에 공급 |

## 3. 트랙 매핑 (AI × RWA)
트랙 공식: *"Dynamic yield strategies and automated risk management … on Mantle's RWA infrastructure"*
| 트랙 키워드 | Jion 대응 (데모에서 짚을 것) |
|---|---|
| RWA | 주식 토큰화 (NVDA / Toyota / Samsung — 인지도 높은 실자산) |
| Dynamic yield strategies | AI 분배 라우팅 + **LP 옵티마이저** (큐레이션→라우팅→LP) |
| Automated risk management | Voluntary redemption(홀더 영구 exit) + rank-tier supply |
| Mantle RWA infrastructure | Pyth 오라클 + 5개 DeFi 어댑터 + AgentLogger 온체인 기록 |
심사 라인업: Allora Network · Nansen · Z.ai · Animoca Brands · DoraHacks

---

## 4. Shot-by-shot (Time · 화면 · 내레이션 · 노리는 점수)

### 🎬 0:00–0:12 — Hook
- **화면:** 홈 `/` 풀샷 → "Pyth · live" 배지
- **VO:** *"Every day, trillions trade in stocks. But when those traders come to crypto, the names they know aren't on-chain. Jion fixes that — automatically."*
- **점수:** 문제 정의 · 실데이터 신뢰

### 🎬 0:12–0:32 — Curate = 유동성 자석 (Ask Jion 자연어)
- **화면:** 홈 **Ask Jion** 바에 `Show me today's hot stocks` 입력 → 응답 스트리밍 + 토큰 칩
- **VO:** *"No manual listings. Every market open, Jion auto-tokenizes the day's top-ten most-traded stocks — the names with the most real demand right now. That's the key: by always listing what the market is already trading hardest, liquidity follows demand instead of fragmenting across stale, hand-picked tokens. All priced live by Pyth — and you just ask, in plain English."*
- **점수:** **Innovation 25%**(자동 큐레이션 = 유동성 부트스트랩) · **AI Interaction 25%** · Ecosystem(Pyth)
- **💡 강조 포인트:** "매일 거래량 1등 종목만 다시 올린다 → 수요가 가장 큰 자산에 유동성이 자연히 몰린다"를 또박또박. (심사위원 단골 질문 "새 토큰 유동성 어디서?" 선제 방어)

### 🎬 0:30–1:00 — Route (설명가능 AI)
- **화면:** Ask Jion `Why did mNVDA route to Merchant Moe?` → `/route/mNVDA` → **reasoning 타이핑** + **점수 바 애니메이션**
- **VO:** *"Then an AI router decides where each token performs best across Mantle DeFi — and explains why, live. mNVDA: rank one, deep liquidity — Merchant Moe wins on spread. You see the exact factors it weighed — volume, volatility, liquidity. Not a black box. An explainable agent."*
- **점수:** **Technical Depth 30%** · AI Interaction · Innovation

### 🎬 1:00–1:20 — LP (자동화 3단계 완성, 유동성 회수)
- **화면:** `/reasoning` 집계 뷰 (또는 Ask Jion `Where should I provide liquidity today?`)
- **VO:** *"And it deepens that liquidity automatically. The same agent concentrates LP capital into the highest-demand names — allocating each day's seed by predicted volume, so depth pools where trading actually happens. Curate, route, and provide liquidity — one automated pipeline, every single day."*
- **점수:** Innovation(서사 완성: 큐레이션→라우팅→**LP**) · 트랙 "dynamic yield"

### 🎬 1:18–1:40 — On-chain verifiable agent ⭐ (머니샷)
- **화면:** route 페이지 **"View this decision on-chain ↗"** → **Mantle Explorer** AgentLogger 로그탭, `AgentDecision` 이벤트(reason 텍스트 줌인)
- **VO:** *"And every decision is written on-chain. This is the agent's actual routing log on Mantle — its reasoning, permanent and verifiable by anyone. Not in our database. On Mantle."*
- **점수:** **Technical Depth 30%** · **Mantle Ecosystem 25%** · Allora/Z.ai 정조준

### 🎬 1:40–1:55 — Infra-not-venue + 생태계
- **화면:** `/integrate` 의 `IJionAdapter` 코드 스니펫
- **VO:** *"Jion never runs a trading venue. It feeds tokens to Merchant Moe, Agni, Fluxion, Lendle — any protocol that implements one adapter interface. We don't compete with Mantle DeFi. We supply it."*
- **점수:** **Mantle Ecosystem 25%** · Innovation(새 패러다임)

### 🎬 1:55–2:00 — Close
- **화면:** 홈 로고 + 한 줄 카피
- **VO:** *"Jion. Today's trending stocks — auto-curated, AI-routed, logged on-chain. On Mantle."*

---

## 5. 풀 보이스오버 (이어서 읽기용, ≈2:00)
> Every day, trillions trade in stocks. But when those traders come to crypto, the names they know aren't on-chain. Jion fixes that — automatically. No manual listings: every market open, Jion auto-tokenizes the day's top-ten most-traded stocks — the names with the most real demand right now. That's the key: by always listing what the market is already trading hardest, liquidity follows demand instead of fragmenting across stale, hand-picked tokens. All priced live by Pyth — and you just ask, in plain English. Then an AI router decides where each token performs best across Mantle DeFi — and explains why, live. mNVDA: rank one, deep liquidity — Merchant Moe wins on spread. You see the exact factors it weighed — volume, volatility, liquidity. Not a black box — an explainable agent. And it deepens that liquidity automatically: the same agent concentrates LP capital into the highest-demand names by predicted volume, so depth pools where trading actually happens. Curate, route, and provide liquidity — one automated pipeline, every single day. And every decision is written on-chain. This is the agent's actual routing log on Mantle — its reasoning, permanent and verifiable by anyone. Not in our database. On Mantle. Jion never runs a trading venue; it feeds tokens to Merchant Moe, Agni, Fluxion, Lendle — any protocol that implements one adapter interface. We don't compete with Mantle DeFi — we supply it. Jion: today's trending stocks, auto-curated, AI-routed, logged on-chain. On Mantle.

## 6. 60초 티저 컷 (X 홍보 / Community Voting용)
Hook(0:12) → Ask Jion 큐레이션(0:18) → mNVDA 라우팅+점수바(0:20) → 온체인 로그(0:10) → close. 자동화 서사 한 줄 + 머니샷만.

---

## 7. 촬영 가이드
**세팅:** QuickTime/OBS 1080p+, 시크릿 창 확대 110~125%, 마우스 커서 강조 ON.
**페이싱:** 한 화면 5초 이상 X. Ask Jion 입력은 **천천히** (스트리밍 타이핑 보여야 AI Interaction 점수). explorer 로그탭은 **reason 텍스트 보이게 줌인**(머니샷). 가격 라이브 변동 순간 잡으면 임팩트 ↑.
**구조 황금률:** 첫 12초에 "뭐 하는 건지", 작동 제품 먼저·코드 나중, 마지막에 트랙 키워드.
**백업:** 라이브 실패 대비 녹화본 필수 (Pyth 503 가능). 데이터 잘 나올 때 미리 떠두기.

## 8. ⚠️ 정직성 — 과장 금지 (심사위원이 코드/explorer 확인 가능)
| 하지 말 것 | 대신 이렇게 |
|---|---|
| "매일 자동 cron 돌아감" | "발행/분배 인프라 배포됨, ops가 트리거" (자동 스케줄 아직 X) |
| "거래량도 실시간" | "가격은 Pyth 라이브, 랭킹/볼륨은 데모 fixture" (Polygon 키 시) |
| "에이전트가 매 결정 자동 기록" | "결정을 온체인 emit, 데모는 **시드 스크립트로 실제 기록**, 풀 자동 파이프라인은 Phase 2+" |
| "외부 DeFi 실 통합" | "Mock 어댑터로 패턴 증명, 실 통합 Phase 2+" (UI "Mock" 라벨 명시) |

→ **"지금 작동 + 명확한 로드맵"** 이 **"다 됐다고 거짓말"** 보다 훨씬 강함.

## 9. 데모 페이지 / 컨트랙트 빠른 참조
| URL | 화면 | 데이터 |
|---|---|---|
| `/` | Trending + **Ask Jion** | Pyth 라이브 가격 + mock 랭킹 |
| `/route/mNVDA` | AI 라우팅 상세 (타이핑 reasoning + 점수바 + 온체인 링크) | 라이브 가격 + LLM |
| `/route/m7203` · `/route/m005930` | Toyota(TSE) · Samsung(KRX) | 일본·한국 Pyth |
| `/reasoning` | 전 토큰 라우팅 종합 | mock 라우팅 |
| `/performance` | Cross-DeFi | mock TVL/Vol |
| `/integrate` | 개발자 통합 (어댑터) | static |
| `/feed` | Oracle 라이브 피드 | Pyth |

**배포 컨트랙트 (Mantle Sepolia, chain 5003):** TokenFactory · Distributor · Settlement · OracleAdapter · **AgentLogger** · SelfPoolAdapter · MerchantMoe/Lendle Mock · MockUSDC — 주소 `packages/types/src/addresses.ts` · explorer https://explorer.sepolia.mantle.xyz
