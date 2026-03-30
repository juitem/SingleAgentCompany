#!/bin/bash
# ============================================================
# 예제 03: Tizen 앱 리팩토링
#
# 입력:  Tizen 패키지 경로
# 출력:  companies/tizen-refactor/output/ 에 리팩토링 결과 + 문서
#
# 사용법: bash examples/03_tizen_refactor.sh /path/to/your/tizen-app
# ============================================================

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# 경로 인자 확인
PACKAGE_PATH="${1:-}"
if [ -z "$PACKAGE_PATH" ]; then
  echo "사용법: bash examples/03_tizen_refactor.sh /path/to/tizen-app"
  echo ""
  echo "예시 경로: /home/user/projects/my-tizen-app"
  exit 1
fi

if [ ! -d "$PACKAGE_PATH" ]; then
  echo "오류: 폴더를 찾을 수 없습니다: $PACKAGE_PATH"
  exit 1
fi

echo ""
echo "예제 03: Tizen 리팩토링"
echo "패키지: $PACKAGE_PATH"
echo ""

python3 orchestrator/orchestrator.py \
  --company tizen-refactor \
  --mode cline \
  --inputs \
    "package_path=$PACKAGE_PATH" \
    "refactor_goals=함수명과 변수명을 명확하게 개선하고, AI agent가 코드를 이해할 수 있도록 인라인 주석 추가"
