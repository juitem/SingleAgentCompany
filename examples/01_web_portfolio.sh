#!/bin/bash
# ============================================================
# 예제 01: 포트폴리오 웹사이트 만들기
#
# 입력:  "개발자 포트폴리오 사이트" 설명
# 출력:  companies/web-agency/output/03_frontend/ 에 완성된 HTML/CSS/JS
#
# 사용법: bash examples/01_web_portfolio.sh
# ============================================================

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BRIEF="개발자 포트폴리오 사이트. 헤더에 이름과 직함, 기술 스택 섹션, 프로젝트 카드 3개, 연락처 섹션. 다크 테마, 심플하고 전문적인 느낌."

echo ""
echo "예제 01: 포트폴리오 웹사이트"
echo "요청: $BRIEF"
echo ""

python3 orchestrator/orchestrator.py \
  --company web-agency \
  --mode cline \
  --inputs "user_brief=$BRIEF"
