#!/bin/bash
# ============================================================
# Web Agency — 워크플로우 실행 스크립트
# 사용법: ./run.sh "포트폴리오 웹사이트를 만들어줘"
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 입력값 확인
if [ -z "$1" ]; then
  echo "사용법: $0 \"원하는 웹페이지 설명\""
  echo "예시:  $0 \"커피숍 소개 페이지, 심플하고 따뜻한 느낌\""
  exit 1
fi

USER_BRIEF="$1"
MODE="${2:-cline}"   # 두 번째 인자로 모드 지정 가능 (기본값: cline)

echo ""
echo "=============================="
echo " Web Agency 워크플로우 시작"
echo "=============================="
echo " 요청: $USER_BRIEF"
echo " 모드: $MODE"
echo ""

cd "$ROOT_DIR"
python orchestrator/orchestrator.py \
  --company web-agency \
  --mode "$MODE" \
  --inputs "user_brief=$USER_BRIEF"
