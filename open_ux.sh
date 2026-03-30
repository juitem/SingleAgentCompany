#!/bin/bash
# ============================================================
# SingleAgentCompany UX 웹앱 열기
# 브라우저에서 워크플로우 편집기를 엽니다.
#
# 사용법: bash open_ux.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UX_FILE="$SCRIPT_DIR/ux/index.html"

echo ""
echo "SingleAgentCompany UX 편집기를 열고 있습니다..."
echo ""

if [ ! -f "$UX_FILE" ]; then
  echo "오류: $UX_FILE 파일을 찾을 수 없습니다."
  exit 1
fi

# OS별 브라우저 실행
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open "$UX_FILE"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  xdg-open "$UX_FILE" 2>/dev/null || \
  sensible-browser "$UX_FILE" 2>/dev/null || \
  echo "브라우저를 찾을 수 없습니다. 직접 열어주세요: $UX_FILE"
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "win32"* ]]; then
  # Windows (Git Bash)
  start "$UX_FILE"
else
  echo "직접 브라우저에서 열어주세요:"
  echo "  $UX_FILE"
fi

echo ""
echo "URL: file://$UX_FILE"
echo ""
echo "기능 안내:"
echo "  ⚡ 워크플로우  — 단계 추가/편집/순서 변경, YAML 내보내기"
echo "  👤 페르소나    — 역할 편집, .md 파일 내보내기"
echo "  ▶  실행        — 실행 명령 생성 및 복사"
