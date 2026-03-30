#!/bin/bash
# ============================================================
# Tizen AI Refactor Co. — 워크플로우 실행 스크립트
# 사용법: ./run.sh /path/to/tizen-package ["리팩토링 목표"]
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -z "$1" ]; then
  echo "사용법: $0 <패키지경로> [\"리팩토링목표\"]"
  echo "예시:  $0 /home/user/my-tizen-app"
  echo "예시:  $0 /home/user/my-tizen-app \"함수명 명확화 및 AI 친화적 주석 추가\""
  exit 1
fi

PACKAGE_PATH="$1"
REFACTOR_GOALS="${2:-}"
MODE="${3:-cline}"

echo ""
echo "======================================="
echo " Tizen AI Refactor Co. 워크플로우 시작"
echo "======================================="
echo " 패키지: $PACKAGE_PATH"
echo " 목표:   ${REFACTOR_GOALS:-기본 (AI agent 친화성 향상)}"
echo " 모드:   $MODE"
echo ""

cd "$ROOT_DIR"

INPUTS="package_path=$PACKAGE_PATH"
if [ -n "$REFACTOR_GOALS" ]; then
  INPUTS="$INPUTS"
  python orchestrator/orchestrator.py \
    --company tizen-refactor \
    --mode "$MODE" \
    --inputs "package_path=$PACKAGE_PATH" "refactor_goals=$REFACTOR_GOALS"
else
  python orchestrator/orchestrator.py \
    --company tizen-refactor \
    --mode "$MODE" \
    --inputs "package_path=$PACKAGE_PATH"
fi
