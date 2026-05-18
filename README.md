# Jion

> Daily auto-tokenization of top-volume stocks with AI routing & LP optimization.
> Built for **Mantle Turing Test Hackathon 2026** · AI × RWA Track.

매일 시장별 거래량 Top 10 주식을 자동으로 합성토큰화하고, AI가 Mantle DeFi 전체에서 최적 거래/유동성 경로를 찾아주는 RWA × AI 플랫폼.

전체 기획은 [`docs/PLAN.md`](docs/PLAN.md) 참고.

---

## Repo Layout (모노레포)

```
packages/
├─ types/                # 공유 도메인 타입 (Market, JionToken, Pool, RouteQuote, ...)
└─ mocks/                # mock 데이터 — 백엔드/컨트랙트 없이도 UI 작업 가능

apps/
└─ web/                  # Next.js 14 (FE + API + cron). bun create로 init 예정

contracts/               # Solidity + Foundry. forge init으로 init 예정

docs/                    # 기획서, 데모 시나리오, mockup
```

### 왜 모노레포 + mocks 레이어?

- **mocks** — UI 작업이 백엔드/컨트랙트 진척에 막히지 않게. Phase 0에서 한 번 깔아두면 그 다음부턴 풀스택 티켓 단위로 자유롭게 분배 가능.
- **packages/types** — UI ↔ API ↔ 컨트랙트 호출 사이 타입 동일. 컨트랙트 인터페이스 바뀌면 한 곳만 수정.

---

## Stack

| Layer | Tool |
| --- | --- |
| Chain | Mantle (메인넷 1개 시장 / Sepolia 나머지) |
| Contracts | Solidity + Foundry |
| AMM | Fluxion / Merchant Moe / Agni (라우팅 대상) |
| Oracle | Pyth Network |
| Web | Next.js 14 + Tailwind + shadcn/ui + wagmi/viem |
| Backend | Next.js API Routes + Supabase (Postgres) |
| AI | Anthropic Claude (dev) / Z.ai (demo) |
| Data | Polygon.io (stock volume) |
| Package manager | bun |

---

## 작업 분배 — 풀스택 티켓 단위

영역(UI vs BE)이 아니라 **기능 단위로 풀스택 분배**. 각자 자기 티켓 안에서 UI/API/컨트랙트 호출까지 다 처리 (Claude가 코드 쓰니까 부담 적음).

### Phase 0 — 공동 셋업 (이 PR)

- 모노레포 골격, `packages/types`, `packages/mocks`, `.env.example`, README

### Phase 1 — 티켓 분배 (예시)

| ID | 티켓 (풀스택) | 담당 |
|---|---|---|
| T1 | 오늘의 핫스톡 대시보드 (Top 10 카드 + 시장별 탭) | **영인** |
| T2 | AI 라우팅 스왑 UI + API + 컨트랙트 호출 | **영인** |
| T3 | AI LP 옵티마이저 UI + API + 컨트랙트 호출 | **영인** |
| T4 | 스냅샷 잡 (cron + Polygon.io + Supabase) | **세현** |
| T5 | 토큰 자동 발행 잡 (TokenFactory 호출 + 메인넷 서명) | **세현** |
| T6 | 강제 정산 잡 (volume-check → Settlement → USDC 분배) | **세현** |

티켓 안에선 mocks 써서 UI 먼저 만들고, 실제 백엔드/컨트랙트 붙으면 swap. 의존성 충돌 최소화.

### Claude가 못 하는 부분 (사람 필수)

- 메인넷 컨트랙트 배포 트랜잭션 서명
- 외부 API 키 발급/결제 (Polygon.io, Z.ai)
- AI 에이전트 지갑 키 관리
- 데모 데이 라이브 시연

---

## Branch & PR Policy

- 작업은 feature 브랜치: `feat/<initial>/<ticket>` (예: `feat/yi/today-dashboard`).
- main으로 PR 열고, 본인 티켓이면 self-merge OK.
- 공유 영역(`packages/types`, `packages/mocks`, root config) 수정은 다른 사람 리뷰 1.
- PR 사이즈 ≤ 1일치 작업.

---

## Quick Start (Phase 0 시점)

```bash
# 1. 의존성 (현재는 packages/types, packages/mocks만)
bun install

# 2. 타입체크
bun run typecheck

# 3. env 복사 (실제 키는 비워둠 — 나중에 채움)
cp .env.example .env
```

`apps/web/`와 `contracts/`는 Phase 1 첫 티켓에서 각자 init (`bun create next-app` / `forge init`).

---

## Key Dates

| Milestone | Date |
| --- | --- |
| Submission deadline | 2026-06-15 |
| Demo Day | 2026-07-02 ~ 03 |
| Winners announced | 2026-07-10 |
