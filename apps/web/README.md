# @jion/web

Next.js 14 (App Router) — Jion 의 UI + API Routes + cron jobs 가 들어갈 자리.

**아직 init 안 됨.** Phase 1 첫 티켓 시작할 때 아래 명령으로 init 한 뒤 작업 시작.

## Init 가이드

```bash
cd apps
bun create next-app web --typescript --tailwind --app --src-dir false --import-alias '@/*' --no-eslint=false

# 필수 의존성
cd web
bun add wagmi viem @rainbow-me/rainbowkit
bun add @anthropic-ai/sdk
bun add @supabase/supabase-js
bun add @pythnetwork/hermes-client

# 모노레포 공유 패키지
bun add @jion/types@workspace:* @jion/mocks@workspace:*
```

## 디렉토리 컨벤션 (티켓 시작 후 채워질 자리)

```
app/
├─ (public)/        # 사용자 페이지 (대시보드/스왑/LP/히스토리)
├─ api/             # API routes (REST)
│  └─ cron/         # cron 잡 (snapshot, settle 등)
└─ layout.tsx, globals.css

components/         # UI 컴포넌트 (shadcn 포함)
lib/
├─ ai/              # AI 라우팅/LP 휴리스틱
├─ chain/           # wagmi/viem config, contract 호출 헬퍼
├─ db/              # supabase client
└─ data/            # polygon.io, pyth client
```

## Mock 사용 (백엔드 붙기 전)

```ts
import { MOCK_SNAPSHOT_NASDAQ, MOCK_LP_RECOMMENDATION } from '@jion/mocks';
// UI 작업은 일단 이걸로. 실제 API 붙으면 swap.
```
