# SingleAgentCompany

Single-agent 도구(Cline, Cursor 등)를 위한 **agentic workflow 설계 및 실행 시스템**.

한 명의 agent가 여러 역할(페르소나)을 순서대로 수행하며 복잡한 작업을 완성합니다.

---

## 핵심 개념

- **페르소나**: 각 단계에서 agent에게 부여하는 역할 (PM, 개발자, QA 등)
- **워크플로우**: 단계 순서, 페르소나, 입출력을 정의하는 YAML
- **오케스트레이터**: 워크플로우를 읽고 Cline CLI를 순서대로 실행하는 엔진
- **Output 폴더**: 각 단계별 결과물을 별도 폴더에 저장

자세한 내용: [docs/concept.md](docs/concept.md) | [docs/architecture.md](docs/architecture.md)

---

## 예제 워크플로우

| 폴더 | 설명 |
|---|---|
| `companies/web-agency/` | 사용자 브리핑 → 웹페이지 완성 |
| `companies/tizen-refactor/` | Tizen 패키지 리팩토링 + AI 친화 문서화 |
| `companies/skill-converter/` | Multi-agent skill.md → Single-agent skill.md 변환 |

---

## 페르소나 라이브러리

`personas/` 폴더에서 재사용 가능한 페르소나를 관리합니다.

| 파일 | 역할 |
|---|---|
| `pm.md` | Product Manager |
| `ux_designer.md` | UX Designer |
| `frontend_dev.md` | Frontend Developer |
| `qa_engineer.md` | QA Engineer |
| `code_analyst.md` | Code Analyst |
| `architect.md` | Software Architect |
| `tizen_dev.md` | Tizen Platform Developer |
| `tech_writer.md` | Technical Writer |
| `skill_analyst.md` | Skill Analyst |
| `workflow_architect.md` | Workflow Architect |
| `skill_writer.md` | Skill Writer |
| `skill_reviewer.md` | Skill Reviewer |

---

## 개발 계획

[docs/plan.md](docs/plan.md) 참고
