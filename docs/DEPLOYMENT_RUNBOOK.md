# Deployment Runbook — 20 Project Deployment Award

해커톤 *20 Project Deployment Award* (심사 없는 체크리스트, 선착순 20팀) 요건을 닫기 위한 실행 가이드.
forge / Vercel 크레덴셜이 필요한 단계라 **유세가 실행**한다.

## 현재 체크리스트 현황

| 요건 | 상태 |
| --- | --- |
| Smart contract deployed on Mantle (Testnet) | ✅ Sepolia 배포 완료 |
| At least one AI function callable on-chain | ✅ `AgentLogger.log()` (라우팅 reasoning 온체인 기록) |
| Open-source GitHub repo + README | ✅ repo public + README |
| **Contract verified on Mantle Explorer** | 🟡 아래 1단계 |
| **Frontend publicly accessible (not localhost)** | 🟡 아래 2단계 |
| Deployment address in DoraHacks submission | ⬜ 외부 (3단계) |
| Demo video (≥ 2 min) | ⬜ 외부 (3단계) |

---

## 1. 컨트랙트 verify (Blockscout)

forge 설치된 환경에서:

```bash
cd contracts
forge build              # 먼저 통과 확인 (lib 없으면 forge install)
./verify-sepolia.sh      # 배포된 11개 일괄 verify
```

- 컴파일러 설정(0.8.24 / optimizer 200)은 `foundry.toml` 에서 자동
- Blockscout 은 API 키 불필요
- ⚠️ 실행 시점에 Mantle Explorer 가 살아있어야 함 (간헐적 503 관측됨)
- `compiler version` 으로 실패하면 스크립트의 `--compiler-version` 을 full 버전
  (예: `v0.8.24+commit.e11b9ed9`) 으로 바꿔 재시도

완료 기준: 각 컨트랙트가 `https://explorer.sepolia.mantle.xyz/address/<addr>` 에서 green check.

---

## 2. 프론트(apps/web) Vercel public 배포

bun 모노레포라 **대시보드 import** 가 가장 깔끔.

1. vercel.com → **Add New → Project** → `Youngin-Lee/Mantle-hackathon` import
2. **Root Directory = `apps/web`** ⚠️핵심 (Vercel 이 bun workspace 감지 → repo 루트에서 install)
3. Framework: **Next.js** 자동 감지, 빌드/출력 기본값
4. **Environment Variables**:

   필수 (없으면 라이브 LLM 페이지 `/route/*` 만 깨지고 나머진 mock 으로 동작):
   ```
   ANTHROPIC_API_KEY=<키>
   NEXT_PUBLIC_CHAIN_ID=5003
   NEXT_PUBLIC_CHAIN_NAME=Mantle Sepolia
   NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.mantle.xyz
   NEXT_PUBLIC_EXPLORER_URL=https://explorer.sepolia.mantle.xyz
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<walletconnect id>
   ```
   선택 (스냅샷/정산 라이브까지):
   ```
   POLYGON_IO_API_KEY=  SUPABASE_URL=  SUPABASE_ANON_KEY=  SUPABASE_SERVICE_ROLE_KEY=
   ZAI_API_KEY=  CRON_SECRET=
   ```
5. Deploy

> CLI 선호 시: repo 루트에서 `vercel login` → `vercel link` → 프로젝트 설정에서
> Root Directory=`apps/web` 지정 → `vercel --prod`.

완료 기준: public URL 에서 `/`, `/reasoning`, `/route/mNVDA` 접속 OK.

---

## 3. 제출 마무리 (프론트 URL 나온 뒤)

- [ ] README "Live demo" 표의 `localhost:3000` → 실제 Vercel URL 로 교체
- [ ] **DoraHacks 제출 폼**에 프론트 URL + 컨트랙트 주소 기입
- [ ] 데모 영상 **≥ 2분** 녹화 (지갑연결 → 스왑 → Explorer 에서 `AgentDecision` 이벤트 확인 흐름)

---

## ⚠️ 데모 전 필수 — AgentLogger에 실제 결정 시드(emit)

**현재 코드는 `AgentLogger.log()` 를 자동 호출하지 않는다.** 컨트랙트는 배포돼 있고 UI가
주소를 링크하지만, emit된 `AgentDecision` 이벤트가 0개 → "View agent log on-chain ↗" 링크가
**빈 컨트랙트**로 연결됨. "검증 가능한 에이전트" 강점이 데모에서 증명 불가.

→ 데모 전에 **실제 라우팅 결정 몇 개를 온체인에 emit**한다:

```bash
cd contracts
AGENT_LOGGER=0x77edbfacfc302f01aba5d25ece57c5dc69dcb2e5 \
forge script script/EmitAgentDecisions.s.sol:EmitAgentDecisions \
  --rpc-url $MANTLE_SEPOLIA_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

- [ ] 실행 후 Explorer 의 AgentLogger 주소 → **logs 탭에 AgentDecision 이벤트** 확인
- [ ] UI "View agent log on-chain ↗" 링크가 실제 결정으로 연결되는지

**setAuthorized 는 필요 없다** — 배포자 지갑(`0x74Ce…`)은 생성자에서 자동 authorize 됨. (별도
에이전트 지갑을 쓸 때만 owner 가 `setAuthorized(wallet, true)` 1회 호출.)

> 참고: 이 스크립트는 데모용 **시드**다. "매 결정마다 자동 기록"하는 풀 파이프라인(크론이
> 서버 사이너로 `log()` 호출)은 제출 이후 스트레치. 데모/심사엔 시드로 충분.
