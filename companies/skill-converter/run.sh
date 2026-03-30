#!/bin/bash
# ============================================================
# Skill Converter Co. — 워크플로우 실행 스크립트
# Multi-agent skill.md → Single-agent skill.md 변환
# 사용법: ./run.sh /path/to/skill.md [target_tool]
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -z "$1" ]; then
  echo "사용법: $0 <skill.md 경로> [target_tool]"
  echo "예시:  $0 /path/to/multi-agent-skill.md"
  echo "예시:  $0 /path/to/multi-agent-skill.md cursor"
  exit 1
fi

SKILL_PATH="$1"
TARGET_TOOL="${2:-cline}"
MODE="${3:-cline}"

echo ""
echo "==============================="
echo " Skill Converter 워크플로우 시작"
echo "==============================="
echo " 원본 스킬: $SKILL_PATH"
echo " 변환 대상: $TARGET_TOOL"
echo " 모드:      $MODE"
echo ""

cd "$ROOT_DIR"
python orchestrator/orchestrator.py \
  --company skill-converter \
  --mode "$MODE" \
  --inputs "skill_path=$SKILL_PATH" "target_tool=$TARGET_TOOL"
