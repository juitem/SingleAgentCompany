#!/bin/bash
# ============================================================
# 실행 로그 실시간 확인
#
# 사용법:
#   bash logs.sh <company>              # 오케스트레이터 전체 로그
#   bash logs.sh <company> cline        # 현재 실행 중인 Cline 로그
#   bash logs.sh <company> <step_id>    # 특정 단계의 Cline 로그
#
# 예시:
#   bash logs.sh web-agency
#   bash logs.sh web-agency cline
#   bash logs.sh web-agency 03_frontend
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPANY="${1:-}"
TARGET="${2:-}"

if [ -z "$COMPANY" ]; then
  echo "사용법: bash logs.sh <company> [cline|step_id]"
  echo ""
  echo "사용 가능한 회사:"
  ls "$SCRIPT_DIR/companies/"
  exit 1
fi

OUTPUT_DIR="$SCRIPT_DIR/companies/$COMPANY/output"

if [ -z "$TARGET" ]; then
  # 오케스트레이터 전체 로그
  LOG_FILE="$OUTPUT_DIR/_run.log"
  LABEL="오케스트레이터 로그"
elif [ "$TARGET" = "cline" ]; then
  # 가장 최근에 수정된 _cline.log 파일
  LOG_FILE=$(find "$OUTPUT_DIR" -name "_cline.log" -newer "$OUTPUT_DIR/_run.log" 2>/dev/null | head -1)
  if [ -z "$LOG_FILE" ]; then
    LOG_FILE=$(find "$OUTPUT_DIR" -name "_cline.log" | sort | tail -1)
  fi
  LABEL="Cline 최신 로그"
else
  # 특정 단계의 Cline 로그
  LOG_FILE="$OUTPUT_DIR/$TARGET/_cline.log"
  LABEL="[$TARGET] Cline 로그"
fi

if [ -z "$LOG_FILE" ] || [ ! -f "$LOG_FILE" ]; then
  echo "로그 파일 없음: $LOG_FILE"
  echo ""
  echo "실행 중인 로그 파일 목록:"
  find "$OUTPUT_DIR" -name "*.log" 2>/dev/null | sort
  exit 1
fi

echo "[$LABEL]"
echo "$LOG_FILE"
echo "종료: Ctrl+C"
echo "────────────────────────────────────────"
tail -f "$LOG_FILE"
