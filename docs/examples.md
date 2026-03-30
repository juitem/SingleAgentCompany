# SingleAgentCompany — 활용 예제

## 예제 1: 웹 에이전시

**목적:** 사용자의 브리핑을 받아 웹페이지를 완성하는 워크플로우

**단계 흐름:**
```
사용자 브리핑
  → [PM] 요구사항 정의
  → [UX 디자이너] 화면 설계
  → [프론트엔드 개발자] 구현
  → [QA 엔지니어] 검수
```

**페르소나:** pm, ux_designer, frontend_dev, qa_engineer

**특징:**
- 단계마다 리뷰가 필요하므로 manual 모드 권장
- 결과물: 완성된 웹 소스 파일

---

## 예제 2: Tizen 패키지 리팩토링 회사

**목적:** Tizen 패키지를 AI agent가 잘 이해/관리할 수 있도록 리팩토링하고 문서화

**단계 흐름:**
```
패키지 경로 입력
  → [코드 분석가] 현재 구조 분석
  → [아키텍트] 리팩토링 계획 수립
  → [Tizen 개발자] 리팩토링 실행
  → [기술 문서 작성자] 문서화
```

**페르소나:** code_analyst, architect, tizen_dev, tech_writer

**특징:**
- 반복 작업이므로 auto 모드 적합
- 결과물: 리팩토링된 코드 + 문서 (CHANGELOG, API 문서)
- Tizen 특화 지식 (manifest, privilege, .wgt 패키지 구조) 페르소나에 포함

---

## 예제 3: Skill 변환 회사

**목적:** Multi-agent 전제로 작성된 skill.md를 single-agent용 skill.md로 재설계

> **혼동 주의:**
> - "multi-agent skill" = Claude Code의 Agent 도구로 여러 sub-agent를 조율하는 스킬
> - "single-agent skill" = Cline 같은 single-agent 도구가 혼자 수행할 수 있는 스킬
> - 이 변환 작업 자체도 SingleAgentCompany 워크플로우로 처리됨

**단계 흐름:**
```
원본 multi-agent skill.md 입력
  → [스킬 분석가] agent 구조 및 의존성 파악
  → [워크플로우 아키텍트] 병렬/비동기 → 순차 재설계 전략 수립
  → [스킬 작성자] single-agent용 skill.md 작성
  → [스킬 리뷰어] 원본 의도 보존 여부 검증
```

**핵심 변환 로직:**
| Multi-agent 패턴 | Single-agent 변환 |
|---|---|
| 병렬 agent 실행 | 순차 단계로 직렬화 |
| agent 간 메시지 전달 | output 파일 참조로 대체 |
| sub-agent 위임 | 단계별 context 주입으로 대체 |
| 조건부 분기 | 명시적 체크포인트 + 지시로 대체 |

**페르소나:** skill_analyst, workflow_architect, skill_writer, skill_reviewer

**특징:**
- 메타 작업 (도구가 도구를 만드는 구조)
- 변환 전/후 비교 검증 단계 필수
- 결과물: 변환된 skill.md + 변환 보고서
