# @jion/web

Jion 의 UI + API Routes + cron jobs. Next.js 16 + React 19 + Tailwind 4 + Turbopack.

## Layout

```
app/
├─ page.tsx         # T1 — 오늘의 핫스톡 대시보드 (시장 탭 + Top10 카드)
├─ layout.tsx       # root, 한국어, 다크 톤
└─ globals.css      # Tailwind 4

components/
├─ market-tabs.tsx  # use client — 시장 탭 전환
└─ token-card.tsx   # 토큰 카드

lib/
└─ format.ts        # 통화/거래량 포맷터
```

향후 추가 예정: `app/swap/` (T2), `app/lp/` (T3), `app/api/` + `app/api/cron/` (T4~T6).

## Dev

```bash
# 루트에서
bun install
bun run dev          # http://localhost:3000

# 또는 이 디렉토리에서
bun run dev
bun run typecheck
bun run lint
```

## 공유 패키지

- `@jion/types` — 도메인 타입 (`packages/types`)
- `@jion/mocks` — UI 단독 작업용 mock 데이터 (`packages/mocks`)

`next.config.ts`의 `transpilePackages`로 워크스페이스 ts 소스를 직접 import.
