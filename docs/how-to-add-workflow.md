# 새 워크플로우 추가 방법

> 이 문서는 새 "회사(워크플로우)"를 추가할 때 해야 할 작업의 체크리스트입니다.
> AI agent가 읽고 작업할 수 있도록 구체적으로 작성되어 있습니다.

---

## 체크리스트

새 워크플로우 `{company-id}` 를 추가할 때:

```
[ ] 1. companies/{company-id}/workflow.yaml       ← 단계 정의
[ ] 2. companies/{company-id}/prompts/*.md        ← 단계별 프롬프트 템플릿
[ ] 3. companies/{company-id}/run.sh              ← 빠른 실행 스크립트
[ ] 4. personas/*.md                              ← 필요한 페르소나 (없는 것만)
[ ] 5. ux/app.js → SEED_COMPANIES 배열에 추가     ← UX 웹앱 반영
[ ] 6. examples/{n}_{name}.sh                    ← 사용 예제
[ ] 7. docs/examples.md 업데이트                  ← 문서 반영
```

---

## 1. workflow.yaml

```yaml
name: 회사명
description: 이 워크플로우의 목적
version: 1.0
default_mode: cline   # cline | claude | manual

inputs:
  - name: input_key
    description: 사용자 입력 설명
    type: text
    required: true

steps:
  - id: 01_step_name           # 반드시 숫자_이름 형식
    name: 단계 표시명
    persona: persona_name      # personas/ 폴더의 파일명 (확장자 제외)
    prompt_template: prompts/01_step_name.md
    outputs:
      - path: output/01_step_name/
        expected_files:
          - result.md
          - DONE.md            # 필수 — Cline 완료 신호

  - id: 02_next_step
    name: 다음 단계
    persona: another_persona
    prompt_template: prompts/02_next_step.md
    depends_on: [01_step_name]
    inputs:
      - name: prev_output
        from: "{{output.01_step_name}}"   # 이전 단계 output 폴더 참조
    outputs:
      - path: output/02_next_step/
```

---

## 2. 프롬프트 템플릿 (prompts/*.md)

각 단계의 프롬프트 파일 형식:

```markdown
{{persona}}

---

## 작업 지시

[이전 단계 결과 참조]
{{output.01_step_name}}

[사용자 입력 참조]
{{user.input_key}}

---

## 출력

다음 파일을 `output/02_next_step/` 폴더에 저장하세요.

**result.md** — [결과물 설명]

**DONE.md** — 작업 요약
- [다음 단계에 전달할 핵심 내용]
```

**플레이스홀더 규칙:**
- `{{persona}}` → `personas/{persona_name}.md` 전체 내용으로 치환
- `{{user.key}}` → 사용자 입력값으로 치환
- `{{output.step_id}}` → 해당 step의 output 폴더 전체 내용으로 치환

---

## 3. run.sh

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -z "$1" ]; then
  echo "사용법: $0 \"입력값\""
  exit 1
fi

cd "$ROOT_DIR"
python3 orchestrator/orchestrator.py \
  --company {company-id} \
  --mode cline \
  --inputs "input_key=$1"
```

---

## 4. 페르소나 (personas/*.md)

기존 페르소나를 재사용하거나, 새 페르소나가 필요하면 아래 형식으로 작성:

```markdown
---
name: persona_name
role: 표시할 역할명
version: 1.0
---

# 역할
당신은 [역할 설명]입니다.

# 작업 원칙
- [원칙 1]
- [원칙 2]

# 출력 형식
- [결과물 목록]
- DONE.md: 작업 요약 (필수)
```

**기존 페르소나 목록:**

| 파일명 | 역할 | 주로 사용하는 워크플로우 |
|---|---|---|
| pm.md | Product Manager | 요구사항 분석 |
| ux_designer.md | UX Designer | 화면 설계 |
| frontend_dev.md | Frontend Developer | 웹 구현 |
| qa_engineer.md | QA Engineer | 검수 |
| code_analyst.md | Code Analyst | 코드 분석 |
| architect.md | Software Architect | 리팩토링 계획 |
| tizen_dev.md | Tizen Developer | Tizen 리팩토링 |
| tech_writer.md | Technical Writer | 문서화 |
| skill_analyst.md | Skill Analyst | Skill 분석 |
| workflow_architect.md | Workflow Architect | Skill 변환 설계 |
| skill_writer.md | Skill Writer | Skill 작성 |
| skill_reviewer.md | Skill Reviewer | Skill 검수 |

---

## 5. UX 웹앱 반영 (ux/app.js)

`SEED_COMPANIES` 배열에 추가:

```js
{
  id: "{company-id}",
  icon: "🔥",   // 적절한 이모지
  name: "회사명",
  description: "설명",
  default_mode: "cline",
  inputs: [
    { name: "input_key", description: "설명", required: true }
  ],
  steps: [
    { id: "01_step", name: "단계명", persona: "persona_name",
      prompt_template: "prompts/01_step.md",
      outputs: [{ path: "output/01_step/" }] },
    // ...
  ]
},
```

---

## 6. 예제 스크립트 (examples/)

파일명: `{번호}_{이름}.sh`

```bash
#!/bin/bash
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BRIEF="구체적인 예제 입력값"

echo "예제 N: [설명]"
echo "입력: $BRIEF"

python3 orchestrator/orchestrator.py \
  --company {company-id} \
  --mode cline \
  --inputs "input_key=$BRIEF"
```

---

## DONE.md 규칙

모든 단계의 마지막에 Cline이 `DONE.md`를 생성해야 합니다.
오케스트레이터는 이 파일의 존재로 단계 완료를 감지합니다.

프롬프트 마지막에 반드시 이 지시를 포함하세요:
```markdown
**DONE.md** — 작업 요약
- 완료된 작업 목록
- 다음 단계에 전달할 핵심 내용
```

---

## 기존 예제 참고

가장 완성도 높은 참고 예제:
- `companies/web-agency/` — 4단계 순차 워크플로우
- `companies/skill-converter/` — 분석→설계→실행→검수 패턴
