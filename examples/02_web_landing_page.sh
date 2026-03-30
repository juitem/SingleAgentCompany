#!/bin/bash
# ============================================================
# 예제 02: 제품 랜딩페이지 만들기
#
# 입력:  SaaS 제품 랜딩페이지 설명
# 출력:  companies/web-agency/output/03_frontend/ 에 완성된 웹소스
#
# 사용법: bash examples/02_web_landing_page.sh
# ============================================================

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BRIEF="AI 일정 관리 SaaS 랜딩페이지. 히어로 섹션(캐치프레이즈+CTA버튼), 주요 기능 3가지 소개, 요금제 3단계(Free/Pro/Enterprise), 고객 후기 섹션, FAQ. 보라색+흰색 컬러, 현대적인 디자인."

echo ""
echo "예제 02: SaaS 랜딩페이지"
echo "요청: $BRIEF"
echo ""

# --no-skip 옵션: 이전에 실행한 기록이 있어도 처음부터 다시 실행
python3 orchestrator/orchestrator.py \
  --company web-agency \
  --mode cline \
  --no-skip \
  --inputs "user_brief=$BRIEF"
