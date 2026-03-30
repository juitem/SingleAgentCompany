#!/bin/bash
# ============================================================
# 예제 04: Multi-agent skill.md → Single-agent skill.md 변환
#
# 입력:  multi-agent 전제로 작성된 skill.md 파일 경로
# 출력:  companies/skill-converter/output/03_rewrite/skill_converted.md
#
# 사용법: bash examples/04_skill_convert.sh /path/to/skill.md
# ============================================================

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

SKILL_PATH="${1:-}"
if [ -z "$SKILL_PATH" ]; then
  echo "사용법: bash examples/04_skill_convert.sh /path/to/skill.md"
  echo ""
  echo "예시: bash examples/04_skill_convert.sh ~/.claude/skills/my-skill.md"
  exit 1
fi

if [ ! -f "$SKILL_PATH" ]; then
  echo "오류: 파일을 찾을 수 없습니다: $SKILL_PATH"
  exit 1
fi

TARGET_TOOL="${2:-cline}"

echo ""
echo "예제 04: Skill 변환"
echo "원본: $SKILL_PATH"
echo "대상 도구: $TARGET_TOOL"
echo ""

python3 orchestrator/orchestrator.py \
  --company skill-converter \
  --mode cline \
  --inputs \
    "skill_path=$SKILL_PATH" \
    "target_tool=$TARGET_TOOL"

echo ""
echo "변환 결과물:"
echo "  companies/skill-converter/output/03_rewrite/skill_converted.md"
echo ""
echo "검수 보고서:"
echo "  companies/skill-converter/output/04_review/review_report.md"
