# SingleAgentCompany — 아키텍처

## 시스템 구성도

```
┌─────────────────────────────────────────────┐
│                   UX (웹앱)                  │
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │ 워크플로우   │  │   페르소나 라이브러리  │  │
│  │    빌더      │  │       편집기          │  │
│  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼────────────────────┼───────────────┘
          │ 생성/편집           │ 관리
          ▼                    ▼
┌─────────────────┐  ┌──────────────────────┐
│  workflow.yaml  │  │     personas/*.md    │
└────────┬────────┘  └──────────┬───────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────┐
         │   Orchestrator   │
         │  (Python 스크립트) │
         └──────┬───────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
 플레이스홀더   Cline CLI   output
  치환         호출        저장
```

---

## 워크플로우 포맷 (workflow.yaml)

```yaml
name: 회사명
description: 이 워크플로우의 목적

inputs:
  - name: user_brief
    description: 사용자 요청사항
    type: text
  - name: source_path
    description: 소스 파일/폴더 경로
    type: path

steps:
  - id: 01_analysis
    name: 요구사항 분석
    persona: pm                        # personas/pm.md 참조
    prompt_template: prompts/01_analysis.md
    inputs:
      - "{{user.user_brief}}"
    outputs:
      - path: output/01_analysis/requirements.md
        description: 요구사항 문서
    mode: manual                       # auto | manual (기본값: workflow 설정 따름)

  - id: 02_implementation
    name: 구현
    persona: frontend_dev
    prompt_template: prompts/02_implementation.md
    inputs:
      - "{{output.01_analysis}}"       # 이전 단계 output 폴더 전체
    outputs:
      - path: output/02_implementation/
        description: 구현 소스
    depends_on: [01_analysis]

default_mode: manual
```

---

## 페르소나 포맷 (personas/*.md)

```markdown
---
name: frontend_dev
role: Frontend Developer
version: 1.0
---

# 역할
당신은 시니어 프론트엔드 개발자입니다.

# 기술 스택
- Framework: React 18
- Styling: Tailwind CSS
- Build: Vite

# 작업 원칙
- 컴포넌트는 반드시 분리하여 작성
- 접근성(a11y) 기준 준수
- 작업 완료 후 output 폴더에 소스 저장

# 출력 형식
- 모든 소스 파일은 output/{step_id}/ 에 저장
- 완료 시 output/{step_id}/DONE.md 에 작업 요약 작성
```

---

## 프롬프트 템플릿 포맷 (prompts/*.md)

```markdown
{{persona}}

## 작업 컨텍스트

### 이전 단계 결과
{{output.01_analysis}}

### 사용자 요청
{{user.user_brief}}

## 지시사항

위 내용을 바탕으로 프론트엔드를 구현하세요.

## 출력
- 완성된 소스를 output/02_implementation/ 에 저장
- 작업 완료 후 output/02_implementation/DONE.md 작성
```

---

## 오케스트레이터 동작 흐름

```
1. workflow.yaml 로드
2. 사용자 입력값 수집
3. 각 단계 순서대로:
   a. 페르소나 파일 로드
   b. 프롬프트 템플릿 로드
   c. 플레이스홀더 치환
      - {{persona}} → 페르소나 파일 내용
      - {{user.*}} → 사용자 입력
      - {{output.*}} → 이전 단계 output 폴더 내용
   d. 치환된 프롬프트를 임시 파일로 저장
   e. Cline CLI 실행 (--file {임시파일})
   f. output 폴더 확인 (DONE.md 존재 여부)
   g. 다음 단계 진행 (auto) 또는 대기 (manual)
```

---

## UX 구성 (향후 구현)

### Phase 1: CLI 오케스트레이터
- workflow.yaml + personas/*.md 수동 작성
- Python 오케스트레이터로 실행

### Phase 2: 웹앱 편집기
- 워크플로우 시각적 빌더 (드래그앤드롭)
- 페르소나 라이브러리 UI
- 변수 바인딩 시각화

### Phase 3: 내보내기
- Cline 실행용 markdown 묶음 생성
- 단계별 실행 shell 스크립트 생성
- 전체 자동 실행 스크립트 생성
