# SingleAgentCompany — 사용법

## 준비

```bash
cd SingleAgentCompany
pip install -r orchestrator/requirements.txt
```

---

## 방법 1: run.sh (가장 간단)

각 회사 폴더에 있는 `run.sh`를 직접 실행합니다.

```bash
# Web Agency — 웹페이지 만들기
./companies/web-agency/run.sh "커피숍 소개 페이지, 심플하고 따뜻한 느낌"

# Tizen 리팩토링
./companies/tizen-refactor/run.sh /path/to/my-tizen-app
./companies/tizen-refactor/run.sh /path/to/my-tizen-app "함수명 명확화"

# Skill 변환
./companies/skill-converter/run.sh /path/to/multi-agent-skill.md
./companies/skill-converter/run.sh /path/to/multi-agent-skill.md cursor
```

---

## 방법 2: 오케스트레이터 직접 실행

```bash
# 기본 실행 (workflow.yaml의 default_mode 사용)
python orchestrator/orchestrator.py --company web-agency

# 모드 지정
python orchestrator/orchestrator.py --company web-agency --mode cline
python orchestrator/orchestrator.py --company web-agency --mode manual

# 입력값 직접 지정
python orchestrator/orchestrator.py \
  --company web-agency \
  --mode cline \
  --inputs "user_brief=포트폴리오 사이트"
```

---

## 방법 3: 단계별 스크립트 생성 후 실행

오케스트레이터 없이 각 단계를 독립적으로 실행하고 싶을 때.

```bash
# 스크립트 생성
python orchestrator/orchestrator.py \
  --company web-agency \
  --generate-scripts \
  --inputs "user_brief=포트폴리오 사이트"

# 생성된 스크립트 확인
ls companies/web-agency/output/_scripts/
# 01_discovery_cline.sh
# 01_discovery_claude.sh
# 02_design_cline.sh
# ...

# 단계별로 직접 실행
bash companies/web-agency/output/_scripts/01_discovery_cline.sh
# (결과물 확인 후)
bash companies/web-agency/output/_scripts/02_design_cline.sh
# ...
```

---

## 중단 후 재시작

중간에 중단된 경우 `--from-step`으로 이어서 실행합니다.

```bash
# 현재 진행 상태 확인
python orchestrator/orchestrator.py --company web-agency --status

# 출력 예시:
# Web Agency — 상태
# --------------------------------------------------
#   01_discovery              ✓ 완료 (2026-03-30 14:23)
#   02_design                 ✓ 완료 (2026-03-30 14:45)
#   03_frontend               ○ 미완료
#   04_qa                     ○ 미완료

# 03_frontend 단계부터 재시작
python orchestrator/orchestrator.py \
  --company web-agency \
  --from-step 03_frontend \
  --inputs "user_brief=포트폴리오 사이트"
```

---

## 특정 단계만 실행

```bash
python orchestrator/orchestrator.py \
  --company web-agency \
  --step 03_frontend \
  --inputs "user_brief=포트폴리오 사이트"
```

---

## 결과물 위치

실행 후 결과물은 회사 폴더 안의 `output/`에 저장됩니다.

```
companies/web-agency/
  output/
    01_discovery/
      requirements.md    ← PM이 작성한 요구사항
      DONE.md            ← 완료 표시 + 요약
    02_design/
      design_spec.md
      DONE.md
    03_frontend/
      index.html         ← 최종 결과물
      style.css
      DONE.md
    04_qa/
      qa_report.md
      DONE.md
    _prompts/            ← 각 단계에 실제로 전달된 프롬프트
    _state.json          ← 진행 상태 기록
```

---

## UX 웹앱

브라우저에서 `ux/index.html`을 열면 됩니다. 서버 불필요.

- 워크플로우 시각적 편집
- 페르소나 라이브러리 관리
- 실행 명령 생성 + 복사
