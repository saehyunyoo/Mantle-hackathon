#!/usr/bin/env bash
#
# Verify all deployed Jion contracts on Mantle Sepolia (Blockscout).
# 해커톤 "20 Project Deployment Award" 의 "Contract verified on Mantle Explorer" 요건 충족용.
#
# 선행조건:
#   - foundryup 으로 forge/cast 설치돼 있어야 함
#   - contracts/ 에서 `forge build` 가 통과해야 함 (lib 설치: `forge install`)
#
# 실행:
#   cd contracts
#   ./verify-sepolia.sh
#
# 비고:
#   - 컴파일러 설정(0.8.24 / optimizer 200)은 foundry.toml 에서 forge 가 자동으로 읽음.
#   - Blockscout 은 API 키 불필요.
#   - 주소/constructor args 는 script/Deploy.s.sol + script/DeployUsdcAndSettlement.s.sol
#     의 실제 배포 인자에서 그대로 가져옴 (packages/types/src/addresses.ts 와 일치).
#
set -euo pipefail

VERIFIER="blockscout"
URL="https://explorer.sepolia.mantle.xyz/api"

# --- 배포 시 사용된 constructor 인자 값 ---
DEPLOYER=0x74Ce253E373A17584263ef55E05513AbfE55CaAe   # vm.addr(DEPLOYER_PRIVATE_KEY)
PYTH=0x98046Bd286715D3B0BC227Dd7a956b83D8978603        # Mantle Sepolia Pyth
JIONROUTER=0x08b3b7b4327c6bb464ef6c9ec84667731c0620d6
DISTRIBUTOR=0x28656c984ac361fe1a31cd4e13c28d97dc838cf6
MOCKUSDC=0x9719d0f8e2b766b842d8c810a314ace9de9f6e28

# constructor args 인코딩 (cast)
A_OWNER=$(cast abi-encode "constructor(address)" "$DEPLOYER")
A_PYTH=$(cast abi-encode "constructor(address)" "$PYTH")
A_SELF=$(cast abi-encode "constructor(address,address)" "$JIONROUTER" "$DISTRIBUTOR")
A_SETTLE=$(cast abi-encode "constructor(address,address,address,address)" \
  "$MOCKUSDC" "$DISTRIBUTOR" "$DEPLOYER" "$DEPLOYER")

verify() { # <address> <path:Name> [<encoded-constructor-args>]
  echo ""
  echo "→ verifying $2 @ $1"
  forge verify-contract "$1" "$2" \
    --verifier "$VERIFIER" --verifier-url "$URL" \
    --compiler-version 0.8.24 \
    ${3:+--constructor-args "$3"} \
    --watch
}

verify 0x2eb123aedc45b26a5a04247af3790c5df113e2ae src/TokenFactory.sol:TokenFactory          "$A_OWNER"
verify 0xcd847aa6e047a4c9121ad1e868e847322aaed29b src/OracleAdapter.sol:OracleAdapter        "$A_PYTH"
verify 0x77edbfacfc302f01aba5d25ece57c5dc69dcb2e5 src/AgentLogger.sol:AgentLogger            "$A_OWNER"
verify 0x08b3b7b4327c6bb464ef6c9ec84667731c0620d6 src/JionRouter.sol:JionRouter              "$A_OWNER"
verify 0x28656c984ac361fe1a31cd4e13c28d97dc838cf6 src/Distributor.sol:Distributor            "$A_OWNER"
verify 0x6e9bcc3409efaf8b220d549125973cb0f180b7e2 src/adapters/SelfPoolAdapter.sol:SelfPoolAdapter "$A_SELF"
verify 0xde7d132a2eeb0222fdfca58ea9e25ae78a47e9e4 src/adapters/mocks/MerchantMoeMockAdapter.sol:MerchantMoeMockAdapter "$A_OWNER"
verify 0x7582ccc516ee587b3cc09541d8630ae4ebf8be9b src/adapters/mocks/LendleMockAdapter.sol:LendleMockAdapter "$A_OWNER"
verify 0x9719d0f8e2b766b842d8c810a314ace9de9f6e28 src/MockUSDC.sol:MockUSDC                  "$A_OWNER"
verify 0xe11527fe1939c8827cc09690fd62b03950dda3ef src/Settlement.sol:Settlement              "$A_SETTLE"

echo ""
echo "✅ done — 각 컨트랙트 https://explorer.sepolia.mantle.xyz/address/<addr> 에서 green check 확인"
echo "   하나라도 'compiler version' 으로 실패하면 --compiler-version 을 full 버전(예: v0.8.24+commit.e11b9ed9)으로 바꿔서 재시도"
