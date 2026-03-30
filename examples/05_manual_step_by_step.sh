#!/bin/bash
# ============================================================
# 예제 05: 단계별 수동 실행 — 처음 사용자 권장
#
# 이 스크립트는 각 단계에서:
#   1. 프롬프트 파일이 생성됩니다
#   2. Cline(또는 다른 도구)에 붙여넣어 실행합니다
#   3. 결과물을 output 폴더에 저장합니다
#   4. Enter를 눌러 다음 단계로 진행합니다
#
# 사용법: bash examples/05_manual_step_by_step.sh
# ============================================================

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  SingleAgentCompany — 단계별 수동 실행   ║"
echo "║  예제: 카페 소개 웹페이지 만들기          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "준비 사항:"
echo "  - Python 3.9+  : python3 --version"
echo "  - pyyaml       : pip install pyyaml"
echo "  - Cline        : VS Code 또는 CLI 준비"
echo ""
read -p "준비가 되었으면 Enter를 누르세요..."

# ── 환경 확인 ──────────────────────────────────────────────
echo ""
echo "환경 확인 중..."
python3 -c "import yaml; print('  ✓ pyyaml OK')" 2>/dev/null || {
  echo "  pyyaml 설치 중..."
  pip install -r orchestrator/requirements.txt
}

echo ""
echo "────────────────────────────────────────────"
echo "  워크플로우: Web Agency (4단계)"
echo "  입력: '카페 소개 페이지, 따뜻하고 아늑한 느낌, 메뉴 소개 포함'"
echo "────────────────────────────────────────────"
echo ""
read -p "시작하려면 Enter..."

# ── 실행 ───────────────────────────────────────────────────
python3 orchestrator/orchestrator.py \
  --company web-agency \
  --mode manual \
  --inputs "user_brief=카페 소개 페이지, 따뜻하고 아늑한 느낌, 메뉴 소개 포함"

echo ""
echo "────────────────────────────────────────────"
echo "  완료! 결과물 위치:"
echo "  companies/web-agency/output/"
echo ""
echo "  각 단계별로 확인해보세요:"
echo "  01_discovery/ — 요구사항 문서"
echo "  02_design/    — 화면 설계"
echo "  03_frontend/  — 완성된 웹 소스"
echo "  04_qa/        — QA 보고서"
echo "────────────────────────────────────────────"
