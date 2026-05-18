## What changed

<!-- one-liner -->

## Area

- [ ] `web/app/(public)` or `web/components` (FE — 영인)
- [ ] `web/app/api` or `web/lib/{ai,db,jobs}` (API — 세현)
- [ ] `contracts/` (Solidity — 세현)
- [ ] `web/lib/{types,contracts}` (SHARED — needs review)
- [ ] `docs/` / root config

## Checklist

- [ ] CI green (forge test + next build)
- [ ] If shared types changed → 다른 사람에게 핑
- [ ] If contracts changed → `bun run export-abi` 실행, ABI 함께 commit
- [ ] PR size ≤ 1 day of work

## Screenshots / Notes
