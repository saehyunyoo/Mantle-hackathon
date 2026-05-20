# Supabase Schema 제안 (T4·T5·T6용)

> 영인이 Supabase 프로젝트 만들 때 참고. SQL은 *제안*이지 강제 아님.
> 변경하면 알려줘 — `@jion/integrations`의 `SnapshotStore` 인터페이스 맞춰서 update.

---

## 테이블 4개

### 1. `snapshots` — T4 결과 저장

```sql
create table snapshots (
  id text primary key,                  -- 'NASDAQ-2026-05-20'
  market text not null,                 -- 'NASDAQ' | 'KRX' | 'TSE'
  captured_at timestamptz not null,
  entries jsonb not null,               -- SnapshotEntry[]
  created_at timestamptz default now()
);

create index snapshots_market_captured_at_idx
  on snapshots (market, captured_at desc);
```

→ `@jion/integrations`의 `MarketSnapshot` 그대로 저장.
→ 영인 T1 (대시보드)이 `select * from snapshots order by captured_at desc limit 1` 로 읽음.

### 2. `tokens` — T5가 발행한 일일 토큰

```sql
create table tokens (
  symbol text primary key,              -- 'mNVDA-20260520'
  ticker text not null,
  name text not null,
  market text not null,
  address text not null unique,         -- 0x... ERC-20 컨트랙트
  pool_address text,                    -- 0x... JionPool
  issued_at timestamptz not null,
  initial_price numeric(20, 8) not null,
  current_price numeric(20, 8),
  status text not null default 'active', -- 'active' | 'settled'
  settled_at timestamptz,
  settlement_price numeric(20, 8),
  created_at timestamptz default now()
);

create index tokens_status_issued_idx
  on tokens (status, issued_at desc);
```

→ `@jion/types`의 `JionToken` 매핑.

### 3. `decisions` — AI 의사결정 로그 (AgentLogger 미러)

```sql
create table decisions (
  id bigserial primary key,
  kind text not null,                   -- 'ROUTE' | 'LP' | 'SETTLE' | 'ISSUE'
  route_id text,                        -- bytes32 hash (string form)
  reason text not null,
  tx_hash text,                         -- 온체인 AgentLogger 이벤트 TX
  payload jsonb,                        -- 자유 형태 메타데이터
  created_at timestamptz default now()
);

create index decisions_kind_created_idx on decisions (kind, created_at desc);
```

→ AgentLogger의 온체인 이벤트를 backend가 sync.

### 4. `settlements` — T6 강제 정산 이력

```sql
create table settlements (
  token_symbol text references tokens(symbol),
  settled_at timestamptz not null,
  oracle_price numeric(20, 8) not null,
  total_distributed_usdc numeric(20, 8) not null,
  tx_hash text not null,
  reason text,                          -- 'volume_below_threshold' 등
  primary key (token_symbol)
);
```

---

## RLS (Row Level Security) 제안

해커톤 데모 단계: **모두 service-role 키로 backend가 직접 접근** → RLS는 일단 disable.

```sql
alter table snapshots disable row level security;
alter table tokens disable row level security;
alter table decisions disable row level security;
alter table settlements disable row level security;
```

→ 클라이언트는 *apps/web의 API route를 거쳐서만* 접근. 직접 Supabase 호출 X.

---

## 영인 셋업 후 우리에게 알려줄 정보

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # ⚠️ backend only, 절대 client X
```

→ Vercel/Mac/EC2 환경변수에 박음. 우리 `.env.example`에 이미 자리 있음.

---

## `@jion/integrations` 와의 통합 예시

영인이 `apps/web/lib/jobs/snapshot-store.ts` 같은 파일에서:

```ts
import { createClient } from '@supabase/supabase-js';
import type { SnapshotStore } from '@jion/integrations';
import type { MarketSnapshot } from '@jion/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const supabaseSnapshotStore: SnapshotStore = {
  async saveSnapshot(s: MarketSnapshot) {
    const { error } = await supabase.from('snapshots').upsert({
      id: s.id,
      market: s.market,
      captured_at: s.capturedAt,
      entries: s.entries,
    });
    if (error) throw error;
  },
};
```

→ cron 핸들러:
```ts
import { runDailySnapshot } from '@jion/integrations';
import { supabaseSnapshotStore } from '@/lib/jobs/snapshot-store';

export async function POST() {
  const snap = await runDailySnapshot('NASDAQ', supabaseSnapshotStore);
  return Response.json({ ok: true, count: snap.entries.length });
}
```

→ 끝. 짧음.
