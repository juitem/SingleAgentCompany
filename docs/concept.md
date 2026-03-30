# SingleAgentCompany — 개념 설계

## 문제 정의

Cline, Cursor 등 single-agent 도구들은 sub-agent를 조율하는 기능이 없다.
복잡한 작업을 혼자 처리하면:
- context가 뒤섞임
- 역할 경계가 불명확
- 결과물 추적이 어려움

## 해결 아이디어

**하나의 agent가 여러 역할을 순서대로 수행**하되, 각 역할(페르소나)과 단계를 명확히 분리해주는 워크플로우 시스템.

사람으로 치면 "혼자 회사를 운영하는데, 각 업무마다 역할을 바꿔가며 일하는 것".

---

## 핵심 구성 요소

### 1. 페르소나 (Persona)
- 각 단계에서 agent에게 부여하는 역할 정의
- 기술 스택, 작업 방식, 출력 형식 등을 포함한 markdown 파일
- 재사용 가능한 라이브러리로 관리

### 2. 워크플로우 (Workflow)
- 작업 단계 순서, 각 단계의 페르소나, 입출력 정의
- YAML로 구조 정의
- 단계 간 데이터는 output 파일로 연결 (`{{output.step_id}}`)

### 3. 프롬프트 템플릿 (Prompt Template)
- 각 단계에서 Cline에 실제로 전달되는 markdown
- 플레이스홀더(`{{변수}}`)를 오케스트레이터가 실행 전에 채워넣음

### 4. 오케스트레이터 (Orchestrator)
- workflow.yaml을 읽고 단계를 순서대로 실행
- 플레이스홀더 치환 → Cline CLI 호출 → output 저장
- **auto 모드**: 자동으로 다음 단계 실행
- **manual 모드**: 단계별 실행 스크립트를 미리 생성

### 5. UX (시각적 편집기)
- 워크플로우를 시각적으로 설계/편집
- 페르소나 라이브러리 관리
- Cline용 파일 일괄 내보내기

---

## 파일 구조

```
SingleAgentCompany/
  personas/              # 재사용 가능한 페르소나 정의
    pm.md
    frontend_dev.md
    ...
  companies/             # 각 워크플로우 (= 하나의 "회사")
    {company-name}/
      workflow.yaml      # 단계 정의
      prompts/           # 단계별 프롬프트 템플릿
        01_{step}.md
        02_{step}.md
      output/            # 실행 결과물 (gitignore 권장)
        01_{step}/
        02_{step}/
  orchestrator/          # 실행 엔진
    orchestrator.py
  docs/                  # 설계 문서
```

---

## 실행 모드

### Auto 모드
```bash
python orchestrator/orchestrator.py --company web-agency --mode auto
```
각 단계 완료 후 자동으로 다음 단계 Cline CLI 실행.

### Manual 모드
```bash
python orchestrator/orchestrator.py --company web-agency --mode manual --generate-scripts
```
단계별 실행 스크립트 생성 후 사용자가 직접 실행.

### 특정 단계만 실행
```bash
python orchestrator/orchestrator.py --company web-agency --step 03_frontend
```

---

## 단계 간 데이터 흐름

```
사용자 입력 (brief, 파일 경로 등)
    ↓
01단계 프롬프트 + 페르소나 → Cline 실행 → output/01/
    ↓ {{output.01}}
02단계 프롬프트 + 페르소나 → Cline 실행 → output/02/
    ↓
...
```

각 단계의 output 폴더가 다음 단계의 input이 됨.
