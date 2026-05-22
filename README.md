# Jion

> **Today's hottest stocks, AI-routed where they perform best.**
> Daily auto-tokenization of top-volume equities, distributed across Mantle DeFi by an
> explainable AI router. Submission for **Mantle Turing Test Hackathon 2026 · AI × RWA**.

[![Track](https://img.shields.io/badge/Track-AI%20%C3%97%20RWA-7c3aed)](https://dorahacks.io/)
[![Chain](https://img.shields.io/badge/Chain-Mantle%20Sepolia-22c55e)](https://explorer.sepolia.mantle.xyz/)
[![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%C2%B7%20Foundry%20%C2%B7%20Pyth-3b82f6)](#stack)

---

## What Jion does

Every market open, Jion takes the day's **top-10 volume stocks** from NASDAQ, KRX, and TSE
and **auto-mints a synthetic ERC-20** for each one on Mantle. A heuristic + LLM router
then fans those tokens out to the Mantle DeFi venues where they'll **perform best** —
tighter spreads on AMMs, deeper LP yield, leverage on lending markets.

Jion is **infrastructure, not a venue.** We never run a trading UI. External DeFi
protocols implement the `IJionAdapter` interface and automatically receive flow.

**Holders always have an exit:** at any time, they can call `Settlement.redeem()` to
swap their tokens back for USDC at the oracle price — no force-burn, no dead bags.

```
            Today's top stocks                   Mantle DeFi venues
       NASDAQ #1 NVDA  ──┐                     ┌── Merchant Moe (AMM)
       NASDAQ #2 TSLA  ──┤   ┌────────────┐    ├── Lendle (collateral)
       KRX    #1 Samsung──├──▶│  AI router  │────┤── Fluxion (AMM)
       TSE    #1 Toyota──┤   │  + adapter  │    ├── Agni (AMM)
       ...               └──▶│   pattern   │    └── Init Capital (lending)
                              └────────────┘
                       heuristic decides    +  LLM narrates the why
                            On-chain via AgentLogger
```

## Live demo

| Surface | URL |
| --- | --- |
| Trending (T1 home) | http://localhost:3000/ |
| Reasoning dashboard | http://localhost:3000/reasoning |
| Per-token deep dive (live Claude) | http://localhost:3000/route/mNVDA |
| Performance matrix | http://localhost:3000/performance |
| Oracle live feed | http://localhost:3000/feed |
| Developer integration guide | http://localhost:3000/integrate |
| Distribution API | http://localhost:3000/api/distribution/mNVDA |

Vercel deployment URL: _added after submission build_

## How it works — 3 pillars

| | What it means |
| --- | --- |
| 📈 **Top-10 volume stocks** | The day's most-traded names from NASDAQ, KRX, TSE — auto-tokenized one hour after market open. One ticker, one `mTICKER` contract, mint-only re-issuance. |
| ✨ **LLM narrative** | A reasoning LLM (Claude on dev, Z.ai on submission demo) explains in plain language *why* each token went to which venue. Never decides — only narrates the heuristic's choice. |
| ⛓️ **On-chain logged** | Every routing decision is emitted via `AgentLogger` on Mantle. Verifiable agent — replay any decision straight from chain history. |

## Supply policy — rank-tier issuance

Per [docs/TOKEN_STANDARD.md §2.3](docs/TOKEN_STANDARD.md#23-supply-policy--rank-tier-issuance):

| Daily rank | Multiplier | Initial supply | Why |
| --- | --- | --- | --- |
| **#1** | 3× | 3,000,000 mTICKER | Whale — the day's single market leader |
| **#2 – #3** | 2× | 2,000,000 mTICKER | Head — high-volume followers |
| **#4 – #10** | 1× | 1,000,000 mTICKER | Base — long tail of the top-10 |

Per-market daily total **14M mTICKER** → **42M mTICKER/day** across the three markets.
Source of truth: [`packages/types/src/supply.ts`](packages/types/src/supply.ts).

## Mantle Sepolia deployment

| Contract | Address |
| --- | --- |
| TokenFactory | [`0x2eb123aedc45b26a5a04247af3790c5df113e2ae`](https://explorer.sepolia.mantle.xyz/address/0x2eb123aedc45b26a5a04247af3790c5df113e2ae) |
| Distributor | [`0x28656c984ac361fe1a31cd4e13c28d97dc838cf6`](https://explorer.sepolia.mantle.xyz/address/0x28656c984ac361fe1a31cd4e13c28d97dc838cf6) |
| Settlement (v2) | [`0xe11527fe1939c8827cc09690fd62b03950dda3ef`](https://explorer.sepolia.mantle.xyz/address/0xe11527fe1939c8827cc09690fd62b03950dda3ef) |
| OracleAdapter | [`0xcd847aa6e047a4c9121ad1e868e847322aaed29b`](https://explorer.sepolia.mantle.xyz/address/0xcd847aa6e047a4c9121ad1e868e847322aaed29b) |
| AgentLogger | [`0x77edbfacfc302f01aba5d25ece57c5dc69dcb2e5`](https://explorer.sepolia.mantle.xyz/address/0x77edbfacfc302f01aba5d25ece57c5dc69dcb2e5) |
| SelfPoolAdapter (real) | [`0x6e9bcc3409efaf8b220d549125973cb0f180b7e2`](https://explorer.sepolia.mantle.xyz/address/0x6e9bcc3409efaf8b220d549125973cb0f180b7e2) |
| MerchantMoeMockAdapter | [`0xde7d132a2eeb0222fdfca58ea9e25ae78a47e9e4`](https://explorer.sepolia.mantle.xyz/address/0xde7d132a2eeb0222fdfca58ea9e25ae78a47e9e4) |
| LendleMockAdapter | [`0x7582ccc516ee587b3cc09541d8630ae4ebf8be9b`](https://explorer.sepolia.mantle.xyz/address/0x7582ccc516ee587b3cc09541d8630ae4ebf8be9b) |
| MockUSDC | [`0x9719d0f8e2b766b842d8c810a314ace9de9f6e28`](https://explorer.sepolia.mantle.xyz/address/0x9719d0f8e2b766b842d8c810a314ace9de9f6e28) |
| Pyth (Hermes) | [`0x98046Bd286715D3B0BC227Dd7a956b83D8978603`](https://explorer.sepolia.mantle.xyz/address/0x98046Bd286715D3B0BC227Dd7a956b83D8978603) |

External integrators: implement [`IJionAdapter`](contracts/src/adapters/IJionAdapter.sol)
and PR your address into [`packages/types/src/addresses.ts`](packages/types/src/addresses.ts).
Full spec: [docs/TOKEN_STANDARD.md](docs/TOKEN_STANDARD.md).

## Stack <a id="stack"></a>

| Layer | Tool |
| --- | --- |
| Chain | Mantle Sepolia (chain id 5003) · mainnet target post-submission |
| Contracts | Solidity 0.8.24 + Foundry |
| Oracle | Pyth Network (Hermes feeds) |
| Web | Next.js 16 · React 19 · Tailwind 4 |
| Backend | Next.js API routes + Supabase (Postgres) |
| AI | Anthropic Claude (dev) · Z.ai for submission demo |
| Data | Polygon.io (US equity volume) |
| Package manager | bun (workspaces) |

## Repo layout

```
packages/
├─ types/          shared domain types + addresses + supply policy
├─ mocks/          mock data so UI works without backend
└─ integrations/   Polygon ingest + Pyth snapshot service

apps/
└─ web/            Next.js — UI + API routes + cron handlers
   ├─ app/
   │  ├─ /             (T1) Trending top-10 dashboard
   │  ├─ /reasoning    aggregate routing-reasoning view (15 tokens)
   │  ├─ /route/[s]    per-token deep dive with live LLM reasoning
   │  ├─ /performance  cross-DeFi TVL & volume matrix
   │  ├─ /feed         oracle live feed
   │  ├─ /integrate    developer integration guide
   │  └─ api/
   │     ├─ distribution/[s]   live routing JSON
   │     └─ cron/snapshot      daily Polygon → Supabase ingest
   └─ lib/ai/        heuristic router + Claude explainer

contracts/
├─ src/
│  ├─ JionToken.sol        ERC-20 + RWA metadata (underlying, market, pythFeedId)
│  ├─ TokenFactory.sol     daily issuer
│  ├─ Distributor.sol      fan out tokens across adapters by AI weights
│  ├─ Settlement.sol       voluntary holder redemption (oracle-priced)
│  ├─ AgentLogger.sol      on-chain trace of every routing decision
│  └─ adapters/
│     ├─ IJionAdapter.sol  the standard external venues implement
│     ├─ SelfPoolAdapter   real Phase-1 fallback (Uni-V2 fork)
│     └─ mocks/            Sepolia-deployed mock external venues (T8)
└─ script/                 forge deploy scripts

docs/
├─ PLAN.md                full strategic plan + Q&A history
├─ TOKEN_STANDARD.md      Jion-Issued RWA Token Standard (Phase 1)
├─ INTEGRATION_EXAMPLES.md AMM / lending / options adapter samples
├─ RESEARCH.md            external venue / Sepolia availability findings
├─ SUPABASE_SCHEMA.md     snapshot DB schema
└─ DEMO.md                demo-day scenarios
```

## Quick start

```bash
bun install

cp .env.example .env
# Required:
#   ANTHROPIC_API_KEY     for live LLM reasoning on /route/[symbol]
#   NEXT_PUBLIC_BASE_URL  (optional) for client-side fetches
# Recommended for full snapshot:
#   POLYGON_IO_API_KEY    NASDAQ volume top-10
#   SUPABASE_URL          snapshot store
#   SUPABASE_SERVICE_ROLE_KEY
#   CRON_SECRET           inbound cron auth

cd apps/web
bun run dev      # http://localhost:3000
```

Smoke test that the LLM router is live:

```bash
curl -s http://localhost:3000/api/distribution/mNVDA | jq '.meta'
# { "claudeEnabled": true, "generatedBy": "claude+heuristic" }
```

## Track fit — AI × RWA

Official prompt: _"dynamic yield strategies and automated risk management for assets
including USDY and mETH."_ Jion maps 1:1 —

- **RWA**: synthetic top-volume equities (NASDAQ + KRX + TSE).
- **AI**: heuristic + LLM router for venue distribution, on-chain logged.
- **Dynamic yield**: rank-tier supply + LP routing per-token per-day.
- **Risk management**: voluntary oracle-priced redemption right + `isHealthy()` gating.

## Roadmap

- **Phase 1 (this submission)** — Sepolia, SelfPoolAdapter, two mock external adapters,
  Claude live reasoning, redemption right.
- **Phase 2 (post-submission)** — mainnet on one market, real adapter integrations for
  Merchant Moe / Lendle, holder UI for redemption, Z.ai swap for demo.
- **Phase 3+** — multi-market issuance cron on Vercel, dynamic LP rebalancing, DAO
  for adapter whitelisting.

## Team

- **Youngin** ([@Youngin-Lee](https://github.com/Youngin-Lee)) — product + frontend + integration spec
- **Sehyun** ([@saehyunyoo](https://github.com/saehyunyoo)) — contracts + Sepolia deployment + cron
- AI agent: **Claude Code** (Anthropic Opus 4.7) for implementation pairing

## Key dates

| Milestone | Date |
| --- | --- |
| Submission deadline | 2026-06-15 |
| Demo Day | 2026-07-02 ~ 03 |
| Winners announced | 2026-07-10 |

## License

MIT. See [`contracts/src/JionToken.sol`](contracts/src/JionToken.sol) header for the
on-chain license declaration each issued token inherits.
