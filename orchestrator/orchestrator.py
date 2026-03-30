#!/usr/bin/env python3
"""
SingleAgentCompany Orchestrator
workflow.yaml을 읽고 단계별 프롬프트를 생성·관리하는 엔진.

지원 모드:
  manual  — 프롬프트 파일 생성 후 사용자가 직접 agent 도구에 붙여넣기
  claude  — claude CLI (Claude Code)로 자동 실행
  print   — 프롬프트를 stdout으로 출력 (파이프 처리용)
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

import yaml


BASE_DIR = Path(__file__).parent.parent
PROMPTS_DIR_NAME = "_prompts"


def load_yaml(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_text(path: Path) -> str:
    """파일 또는 디렉토리 내용을 텍스트로 읽기. _prompt.md는 제외."""
    if path.is_file():
        return path.read_text(encoding="utf-8")
    elif path.is_dir():
        parts = []
        for p in sorted(path.rglob("*")):
            if p.is_file() and not p.name.startswith("_"):
                rel = p.relative_to(path)
                parts.append(f"### {rel}\n\n{p.read_text(encoding='utf-8')}")
        return "\n\n---\n\n".join(parts)
    return ""


def resolve_placeholder(value: str, context: dict) -> str:
    """{{user.key}}, {{output.step_id}} 플레이스홀더를 치환."""
    def replacer(match):
        expr = match.group(1).strip()
        parts = expr.split(".", 1)
        if len(parts) != 2:
            return match.group(0)
        ns, key = parts[0], parts[1]

        if ns == "user":
            val = context.get("user", {}).get(key, "")
            return val if val else f"[미입력: {key}]"
        elif ns == "output":
            output_path = context.get("outputs", {}).get(key)
            if output_path and Path(output_path).exists():
                return load_text(Path(output_path))
            return f"[이전 단계 output 없음: {key}]"
        return match.group(0)

    return re.sub(r"\{\{(.+?)\}\}", replacer, value)


def build_prompt(step: dict, context: dict, company_dir: Path) -> str:
    """프롬프트 템플릿을 로드하고 플레이스홀더를 치환."""
    template_path = company_dir / step["prompt_template"]
    if not template_path.exists():
        raise FileNotFoundError(f"프롬프트 템플릿 없음: {template_path}")

    template = template_path.read_text(encoding="utf-8")

    # {{persona}} 치환
    persona_name = step.get("persona", "")
    if persona_name:
        persona_path = BASE_DIR / "personas" / f"{persona_name}.md"
        if persona_path.exists():
            template = template.replace("{{persona}}", persona_path.read_text(encoding="utf-8"))
        else:
            template = template.replace("{{persona}}", f"[페르소나 없음: {persona_name}]")

    return resolve_placeholder(template, context)


# ── 실행 어댑터 ──────────────────────────────────────────────

def adapter_manual(step: dict, prompt: str, prompt_file: Path, output_dir: Path) -> bool:
    """프롬프트 파일 저장 후 사용자 확인 대기."""
    print(f"\n{'='*60}")
    print(f"  [{step['id']}] {step['name']}")
    print(f"{'='*60}")
    print(f"  프롬프트: {prompt_file}")
    print(f"  출력 폴더: {output_dir}")
    print()
    print("  Cline, Cursor, Windsurf 등 원하는 도구에 프롬프트 파일을 붙여넣으세요.")
    print(f"  완료 후 결과물을 {output_dir}/ 에 저장하세요.")
    print()
    print("  계속하려면 Enter, 중단하려면 q+Enter: ", end="", flush=True)
    return input().strip().lower() != "q"


def adapter_claude(step: dict, prompt: str, prompt_file: Path, output_dir: Path) -> bool:
    """claude CLI (Claude Code)로 자동 실행."""
    print(f"\n{'='*60}")
    print(f"  [{step['id']}] {step['name']} — claude CLI 실행 중...")
    print(f"{'='*60}")

    cmd = ["claude", "--print", "--dangerously-skip-permissions", prompt]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        output_dir.mkdir(parents=True, exist_ok=True)
        response_file = output_dir / "response.md"
        response_file.write_text(result.stdout, encoding="utf-8")
        print(f"  완료: {response_file}")
        return True
    except FileNotFoundError:
        print("  오류: claude CLI를 찾을 수 없습니다. npm install -g @anthropic-ai/claude-code")
        return False
    except subprocess.CalledProcessError as e:
        print(f"  오류: {e.stderr}")
        return False


def adapter_cline(step: dict, prompt: str, prompt_file: Path, output_dir: Path) -> bool:
    """Cline CLI로 자동 실행.
    Cline CLI: https://github.com/cline/cline
    설치: npm install -g cline (또는 VS Code 익스텐션 설치 후 CLI 활성화)
    """
    print(f"\n{'='*60}")
    print(f"  [{step['id']}] {step['name']} — Cline CLI 실행 중...")
    print(f"{'='*60}")

    # Cline CLI: cline --task "<prompt>" --output-dir "<dir>"
    cmd = ["cline", "--task", prompt, "--output-dir", str(output_dir)]
    try:
        result = subprocess.run(cmd, check=True)
        print(f"  완료: {output_dir}")
        return True
    except FileNotFoundError:
        print("  오류: Cline CLI를 찾을 수 없습니다.")
        print("  설치: npm install -g cline")
        print(f"  수동 실행: 아래 프롬프트 파일을 Cline에 붙여넣으세요.")
        print(f"  {prompt_file}")
        return False
    except subprocess.CalledProcessError as e:
        print(f"  오류: {e}")
        return False


def adapter_print(step: dict, prompt: str, prompt_file: Path, output_dir: Path) -> bool:
    """프롬프트를 stdout으로 출력."""
    print(prompt)
    return True


ADAPTERS = {
    "manual": adapter_manual,
    "claude": adapter_claude,
    "cline": adapter_cline,
    "print": adapter_print,
}


# ── 핵심 로직 ────────────────────────────────────────────────

def prepare_step(step: dict, context: dict, company_dir: Path) -> tuple[str, Path, Path]:
    """단계 준비: 프롬프트 빌드 + 파일 저장. (prompt, prompt_file, output_dir) 반환."""
    output_dir = company_dir / step["outputs"][0]["path"]
    output_dir.mkdir(parents=True, exist_ok=True)

    prompts_dir = company_dir / "output" / PROMPTS_DIR_NAME
    prompts_dir.mkdir(parents=True, exist_ok=True)

    prompt = build_prompt(step, context, company_dir)
    prompt_file = prompts_dir / f"{step['id']}_prompt.md"
    prompt_file.write_text(prompt, encoding="utf-8")

    return prompt, prompt_file, output_dir


def run_workflow(workflow: dict, company_dir: Path, context: dict,
                 mode: str, target_step: str | None = None):
    steps = workflow["steps"]
    if target_step:
        steps = [s for s in steps if s["id"] == target_step]
        if not steps:
            print(f"오류: step '{target_step}' 없음")
            sys.exit(1)

    adapter = ADAPTERS[mode]

    # 모든 step의 output 경로를 미리 context에 등록 (의존성 참조용)
    for step in workflow["steps"]:
        step_id = step["id"]
        output_path = company_dir / step["outputs"][0]["path"]
        context["outputs"][step_id] = str(output_path)

    for step in steps:
        prompt, prompt_file, output_dir = prepare_step(step, context, company_dir)
        success = adapter(step, prompt, prompt_file, output_dir)
        if not success:
            print(f"\n중단: {step['id']}")
            sys.exit(0)

    print(f"\n완료. 결과물: {company_dir / 'output/'}")


def generate_scripts(workflow: dict, company_dir: Path, context: dict):
    """단계별 실행용 shell 스크립트 생성."""
    scripts_dir = company_dir / "output" / "_scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)

    # 모든 output 경로 등록
    for step in workflow["steps"]:
        context["outputs"][step["id"]] = str(company_dir / step["outputs"][0]["path"])

    for step in workflow["steps"]:
        prompt, prompt_file, output_dir = prepare_step(step, context, company_dir)

        # claude CLI 스크립트
        claude_script = scripts_dir / f"{step['id']}_claude.sh"
        claude_script.write_text(
            f'#!/bin/bash\n# {step["name"]} — claude CLI\n'
            f'mkdir -p "{output_dir}"\n'
            f'claude --print --dangerously-skip-permissions "$(cat \'{prompt_file}\')" '
            f'> "{output_dir}/response.md"\n'
            f'echo "완료: {step["id"]}"\n',
            encoding="utf-8"
        )
        claude_script.chmod(0o755)

        # cline CLI 스크립트
        cline_script = scripts_dir / f"{step['id']}_cline.sh"
        cline_script.write_text(
            f'#!/bin/bash\n# {step["name"]} — Cline CLI\n'
            f'mkdir -p "{output_dir}"\n'
            f'cline --task "$(cat \'{prompt_file}\')" --output-dir "{output_dir}"\n'
            f'echo "완료: {step["id"]}"\n',
            encoding="utf-8"
        )
        cline_script.chmod(0o755)

        print(f"생성: {claude_script}")
        print(f"생성: {cline_script}")
        print(f"프롬프트: {prompt_file}")

    print(f"\n스크립트 위치: {scripts_dir}/")


def collect_user_inputs(workflow: dict, cli_inputs: list[str] | None) -> dict:
    user_inputs = {}

    if cli_inputs:
        for item in cli_inputs:
            if "=" in item:
                k, v = item.split("=", 1)
                user_inputs[k] = v
        return user_inputs

    for inp in workflow.get("inputs", []):
        name = inp["name"]
        desc = inp.get("description", name)
        default = inp.get("default", "")
        required = inp.get("required", True)

        hint = ""
        if default:
            hint += f" (기본값: {default})"
        if not required:
            hint += " (선택사항)"

        value = input(f"{desc}{hint}: ").strip()
        if not value:
            value = default
        if not value and required:
            print(f"오류: '{name}'은 필수입니다.")
            sys.exit(1)
        user_inputs[name] = value

    return user_inputs


def main():
    parser = argparse.ArgumentParser(
        description="SingleAgentCompany Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예제:
  python orchestrator.py --company web-agency
  python orchestrator.py --company web-agency --mode cline
  python orchestrator.py --company web-agency --mode manual
  python orchestrator.py --company web-agency --step 03_frontend
  python orchestrator.py --company web-agency --generate-scripts
  python orchestrator.py --company web-agency --inputs "user_brief=포트폴리오 사이트"

모드:
  cline   — Cline CLI 자동 실행 (기본값 권장)
  claude  — Claude Code CLI 자동 실행
  manual  — 프롬프트 파일 저장 후 사용자가 직접 실행
  print   — 프롬프트를 stdout으로 출력
        """
    )
    parser.add_argument("--company", required=True, help="companies/ 하위 폴더명")
    parser.add_argument("--mode", choices=list(ADAPTERS), default=None,
                        help="실행 모드 (manual|claude|print, 기본값: workflow.yaml의 default_mode)")
    parser.add_argument("--step", help="특정 단계만 실행")
    parser.add_argument("--generate-scripts", action="store_true", help="shell 스크립트 일괄 생성")
    parser.add_argument("--inputs", nargs="*", metavar="KEY=VALUE", help="입력값 직접 지정")
    args = parser.parse_args()

    company_dir = BASE_DIR / "companies" / args.company
    workflow_file = company_dir / "workflow.yaml"
    if not workflow_file.exists():
        print(f"오류: {workflow_file} 없음")
        sys.exit(1)

    workflow = load_yaml(workflow_file)
    mode = args.mode or workflow.get("default_mode", "manual")

    if mode not in ADAPTERS:
        print(f"오류: 알 수 없는 모드 '{mode}'. 사용 가능: {list(ADAPTERS)}")
        sys.exit(1)

    print(f"\n{workflow['name']} — {mode.upper()} 모드")
    print(f"{workflow.get('description', '')}\n")

    user_inputs = collect_user_inputs(workflow, args.inputs)
    context = {"user": user_inputs, "outputs": {}}

    if args.generate_scripts:
        generate_scripts(workflow, company_dir, context)
    else:
        run_workflow(workflow, company_dir, context, mode, args.step)


if __name__ == "__main__":
    main()
