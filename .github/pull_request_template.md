## Ticket

<!-- T1 ~ T6 또는 Phase 0 / 공유 -->

## What changed

<!-- 한 줄 요약 -->

## Scope

- [ ] `apps/web/` (UI/페이지/컴포넌트)
- [ ] `apps/web/app/api/` (API routes)
- [ ] `apps/web/app/api/cron/` (cron jobs)
- [ ] `contracts/` (Solidity)
- [ ] `packages/types/` 또는 `packages/mocks/` (SHARED — 리뷰 필요)
- [ ] `docs/` / root config

## Checklist

- [ ] `bun run typecheck` 통과
- [ ] `bun run lint` 통과 (web 있으면)
- [ ] contracts 바뀌면 `forge test` 통과
- [ ] 공유 타입 수정 → 다른 담당자에게 핑
- [ ] PR 사이즈 ≤ 1일치 작업

## Screenshots / Notes
