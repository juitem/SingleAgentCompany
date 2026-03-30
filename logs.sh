#!/bin/bash
# ============================================================
# 실행 로그 실시간 확인
# 사용법: bash logs.sh <company>
# 예시:   bash logs.sh web-agency
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPANY="${1:-}"

if [ -z "$COMPANY" ]; then
  echo "사용법: bash logs.sh <company>"
  echo ""
  echo "사용 가능한 회사:"
  ls "$SCRIPT_DIR/companies/"
  exit 1
fi

LOG_FILE="$SCRIPT_DIR/companies/$COMPANY/output/_run.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "로그 파일 없음: $LOG_FILE"
  echo "(아직 실행된 적 없거나 실행 중이 아닙니다)"
  exit 1
fi

echo "로그: $LOG_FILE"
echo "종료: Ctrl+C"
echo "────────────────────────────────────────"
tail -f "$LOG_FILE"
