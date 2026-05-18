# Jion

> Daily auto-tokenization of top-volume stocks with AI routing & LP optimization.
> Built for **Mantle Turing Test Hackathon 2026** · AI × RWA Track.

매일 시장별 거래량 Top 10 주식을 자동으로 합성토큰화하고, AI가 Mantle DeFi 전체에서 최적 거래/유동성 경로를 찾아주는 RWA × AI 플랫폼.

---

## Stack

| Layer | Tool |
| --- | --- |
| Chain | Mantle Sepolia (testnet) |
| Contracts | Solidity + Foundry |
| AMM | Merchant Moe integration (Mantle native) |
| Oracle | Pyth Network |
| Web | Next.js 14 + Tailwind + shadcn/ui + wagmi/viem |
| Backend | Next.js API Routes + Supabase (Postgres) |
| AI | Anthropic Claude (dev) / Z.ai (demo) |
| Data | Polygon.io (stock volume) |
| Package manager | bun |

---

## Repo Layout

```
web/                        # Next.js app (FE + API + cron jobs)
├─ app/
│  ├─ (public)/             # 영인 — pages
│  └─ api/                  # 세현 — API routes
├─ components/              # 영인 — UI
└─ lib/                     # 세현 — pyth, polygon, claude, db, contracts, types

contracts/                  # 세현 — Foundry
├─ src/
├─ test/
└─ script/

docs/                       # 영인 — PLAN, DEMO, deck
scripts/                    # ABI export, helpers
.github/workflows/          # CI
```

---

## Team & Areas

| Area | Owner |
| --- | --- |
| `web/app/(public)`, `web/components` | 영인 |
| `web/app/api`, `web/lib/{ai,db,jobs}` | 세현 |
| `contracts/` | 세현 |
| `docs/` | 영인 |
| `web/lib/{contracts,types}` | shared (PR-reviewed) |

---

## Quick Start

```bash
# 1. install root deps
bun install

# 2. web deps
cd web && bun install && cd ..

# 3. contracts deps (Foundry must be installed: https://book.getfoundry.sh/)
cd contracts && forge install OpenZeppelin/openzeppelin-contracts --no-commit && cd ..

# 4. env
cp .env.example .env

# 5. dev
bun run dev               # web on :3000
bun run test:contracts    # forge test
```

---

## Branch & PR Policy

- All work on feature branches: `feat/<initial>/<thing>` (e.g. `feat/sh/token-factory`).
- Open PR to `main`. Self-merge OK for own-area changes.
- Shared changes (`web/lib/types/*`, `web/lib/contracts/*`, root configs) require the other person's review.
- Keep PRs small (≤ 1 day of work).

---

## Key Dates

| Milestone | Date |
| --- | --- |
| Submission deadline | 2026-06-15 |
| Demo Day | 2026-07-02 ~ 03 |
| Winners announced | 2026-07-10 |

See `docs/PLAN.md` for full plan.
