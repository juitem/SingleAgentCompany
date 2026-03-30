#!/usr/bin/env python3
"""
SingleAgentCompany Orchestrator
workflow.yaml을 읽고 단계별 프롬프트를 생성·관리하는 엔진.

지원 모드:
  cline   — Cline CLI 자동 실행 (기본값 권장)
  claude  — claude CLI (Claude Code)로 자동 실행
  manual  — 프롬프트 파일 저장 후 사용자가 직접 agent 도구에 붙여넣기
  print   — 프롬프트를 stdout으로 출력 (파이프 처리용)
"""

import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import yaml


BASE_DIR = Path(__file__).parent.parent
PROMPTS_DIR_NAME = "_prompts"
STATE_FILE_NAME = "_state.json"
LOG_FILE_NAME = "_run.log"

# ── 로거 ─────────────────────────────────────────────────────

_log_file: Path | None = None

def init_logger(company_dir: Path):
    global _log_file
    log_dir = company_dir / "output"
    log_dir.mkdir(parents=True, exist_ok=True)
    _log_file = log_dir / LOG_FILE_NAME

def log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    if _log_file:
        with open(_log_file, "a", encoding="utf-8") as f:
            f.write(line + "\n")


# ── 파일 로딩 ────────────────────────────────────────────────

def load_yaml(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_text(path: Path) -> str:
    """파일 또는 디렉토리 내용을 텍스트로 읽기. _로 시작하는 파일 제외."""
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


# ── 상태 관리 (재시작 지원) ──────────────────────────────────

def load_state(company_dir: Path) -> dict:
    state_file = company_dir / "output" / STATE_FILE_NAME
    if state_file.exists():
        try:
            return json.loads(state_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"completed_steps": [], "started_at": None}


def save_state(company_dir: Path, state: dict):
    output_dir = company_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    state_file = output_dir / STATE_FILE_NAME
    state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def mark_step_done(company_dir: Path, step_id: str):
    state = load_state(company_dir)
    if "started_at" not in state or not state["started_at"]:
        state["started_at"] = datetime.now().isoformat()
    if step_id not in state["completed_steps"]:
        state["completed_steps"].append(step_id)
    state[f"{step_id}_done_at"] = datetime.now().isoformat()
    save_state(company_dir, state)


def is_step_done(company_dir: Path, step_id: str) -> bool:
    """DONE.md 존재 또는 state.json 기록으로 완료 여부 확인."""
    # 1. DONE.md 파일 존재 확인 (Cline이 직접 생성)
    output_dir = company_dir / "output" / step_id
    if (output_dir / "DONE.md").exists():
        return True
    # 2. state.json 기록 확인
    state = load_state(company_dir)
    return step_id in state.get("completed_steps", [])


# ── 플레이스홀더 치환 ─────────────────────────────────────────

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

    persona_name = step.get("persona", "")
    if persona_name:
        persona_path = BASE_DIR / "personas" / f"{persona_name}.md"
        if persona_path.exists():
            template = template.replace("{{persona}}", persona_path.read_text(encoding="utf-8"))
        else:
            template = template.replace("{{persona}}", f"[페르소나 없음: {persona_name}]")

    return resolve_placeholder(template, context)


# ── 실행 어댑터 ──────────────────────────────────────────────

def _print_step_header(step: dict, extra: str = ""):
    print(f"\n{'='*60}")
    print(f"  [{step['id']}] {step['name']}{' — ' + extra if extra else ''}")
    print(f"{'='*60}")


def adapter_manual(step: dict, prompt: str, prompt_file: Path, output_dir: Path) -> bool:
    """프롬프트 파일 저장 후 사용자 확인 대기."""
    log(f"[{step['id']}] 수동 실행 대기")
    _print_step_header(step, "수동 실행 대기")
    print(f"  프롬프트: {prompt_file}")
    print(f"  출력 폴더: {output_dir}")
    print()
    print("  Cline, Cursor, Windsurf 등 원하는 도구에 프롬프트 파일을 붙여넣으세요.")
    print(f"  완료 후 결과물을 {output_dir}/ 에 저장하세요.")
    print()
    print("  계속: Enter  |  중단: q  |  건너뜀: s  >> ", end="", flush=True)
    ans = input().strip().lower()
    if ans == "q":
        log(f"[{step['id']}] 사용자 중단", "WARN")
        return False
    if ans == "s":
        log(f"[{step['id']}] 건너뜀")
        return True
    log(f"[{step['id']}] 수동 완료 확인")
    return True


def adapter_claude(step: dict, prompt: str, prompt_file: Path, output_dir: Path) -> bool:
    """claude CLI (Claude Code)로 자동 실행."""
    log(f"[{step['id']}] claude CLI 시작")
    _print_step_header(step, "claude CLI 실행 중...")
    cmd = ["claude", "--print", "--dangerously-skip-permissions", prompt]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        output_dir.mkdir(parents=True, exist_ok=True)
        response_file = output_dir / "response.md"
        response_file.write_text(result.stdout, encoding="utf-8")
        log(f"[{step['id']}] claude CLI 완료 → {response_file}")
        return True
    except FileNotFoundError:
        log(f"[{step['id']}] claude CLI 없음", "ERROR")
        print("  오류: claude CLI 없음. npm install -g @anthropic-ai/claude-code")
        return False
    except subprocess.CalledProcessError as e:
        log(f"[{step['id']}] claude CLI 오류: {e.stderr}", "ERROR")
        return False


def adapter_cline(step: dict, prompt: str, prompt_file: Path, output_dir: Path) -> bool:
    """Cline CLI로 자동 실행 + DONE.md 감지.

    Cline CLI 파라미터:
      -y           : yolo 모드 (모든 작업 자동 승인)
      -c <dir>     : 작업 디렉토리 지정
      <prompt>     : 실행할 프롬프트

    프롬프트가 길 수 있으므로 파일로 저장 후 경로만 전달.
    """
    log(f"[{step['id']}] Cline CLI 시작")
    _print_step_header(step, "Cline CLI 실행 중...")
    print(f"  프롬프트 파일: {prompt_file}")

    task = f"다음 파일을 읽고 지시사항을 그대로 수행하세요: {prompt_file}"
    cmd = ["cline", "-y", "-c", str(output_dir), task]

    # Cline 출력을 별도 로그 파일로 저장
    cline_log = output_dir / "_cline.log"
    print(f"  Cline 로그: {cline_log}")
    print(f"  다른 터미널에서 실시간 확인: tail -f \"{cline_log}\"")

    try:
        with open(cline_log, "w", encoding="utf-8") as lf:
            lf.write(f"[{datetime.now()}] Cline 시작\n")
            lf.write(f"cmd: {' '.join(cmd)}\n")
            lf.write("-" * 60 + "\n")
            lf.flush()
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            for line in proc.stdout:
                lf.write(line)
                lf.flush()
            proc.wait()
            lf.write(f"\n[{datetime.now()}] 종료 코드: {proc.returncode}\n")

        if proc.returncode != 0:
            raise subprocess.CalledProcessError(proc.returncode, cmd)

        done_file = output_dir / "DONE.md"
        if done_file.exists():
            log(f"[{step['id']}] Cline 완료 — DONE.md 확인됨")
            print(f"  ✓ DONE.md 확인: {done_file}")
        else:
            log(f"[{step['id']}] Cline 완료 — DONE.md 없음", "WARN")
            print(f"  ⚠ DONE.md 없음. 결과물을 확인하세요: {output_dir}")
        return True
    except FileNotFoundError:
        log(f"[{step['id']}] Cline CLI 없음", "ERROR")
        print("  오류: Cline CLI 없음.")
        print(f"  수동 실행: {prompt_file}")
        return False
    except subprocess.CalledProcessError as e:
        log(f"[{step['id']}] Cline CLI 오류 (종료코드: {e.returncode})", "ERROR")
        print(f"  오류 로그: {cline_log}")
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
    """프롬프트 빌드 + 파일 저장. (prompt, prompt_file, output_dir) 반환."""
    output_dir = company_dir / step["outputs"][0]["path"]
    output_dir.mkdir(parents=True, exist_ok=True)

    prompts_dir = company_dir / "output" / PROMPTS_DIR_NAME
    prompts_dir.mkdir(parents=True, exist_ok=True)

    prompt = build_prompt(step, context, company_dir)
    prompt_file = prompts_dir / f"{step['id']}_prompt.md"
    prompt_file.write_text(prompt, encoding="utf-8")

    return prompt, prompt_file, output_dir


def run_workflow(workflow: dict, company_dir: Path, context: dict,
                 mode: str, from_step: str | None = None,
                 target_step: str | None = None, skip_done: bool = True):

    steps = workflow["steps"]

    # 특정 단계만 실행
    if target_step:
        steps = [s for s in steps if s["id"] == target_step]
        if not steps:
            print(f"오류: step '{target_step}' 없음")
            sys.exit(1)
    # from_step: 특정 단계부터 재시작
    elif from_step:
        ids = [s["id"] for s in steps]
        if from_step not in ids:
            print(f"오류: step '{from_step}' 없음")
            sys.exit(1)
        idx = ids.index(from_step)
        steps = steps[idx:]

    adapter = ADAPTERS[mode]

    # 모든 step output 경로를 context에 등록
    for step in workflow["steps"]:
        context["outputs"][step["id"]] = str(company_dir / step["outputs"][0]["path"])

    log(f"워크플로우 시작: {workflow['name']} ({mode} 모드, {len(steps)}단계)")
    log(f"로그 파일: {company_dir}/output/{LOG_FILE_NAME}")
    print(f"\n  실시간 로그 확인: tail -f {company_dir}/output/{LOG_FILE_NAME}")

    total = len(steps)
    for i, step in enumerate(steps, 1):
        step_id = step["id"]

        # 이미 완료된 단계 건너뜀
        if skip_done and is_step_done(company_dir, step_id):
            log(f"[{step_id}] 건너뜀 (이미 완료)")
            print(f"  [{i}/{total}] {step_id} — 이미 완료 (건너뜀)")
            continue

        log(f"[{step_id}] 시작 ({i}/{total})")
        print(f"\n  진행: {i}/{total}")
        prompt, prompt_file, output_dir = prepare_step(step, context, company_dir)
        success = adapter(step, prompt, prompt_file, output_dir)

        if success:
            mark_step_done(company_dir, step_id)
            log(f"[{step_id}] 완료")
        else:
            log(f"[{step_id}] 실패 — 워크플로우 중단", "ERROR")
            print(f"\n중단: {step_id}")
            print(f"재시작: python orchestrator.py --company {company_dir.name} --from-step {step_id}")
            sys.exit(0)

    print(f"\n모든 단계 완료. 결과물: {company_dir / 'output/'}")


def generate_scripts(workflow: dict, company_dir: Path, context: dict):
    """단계별 실행 스크립트 생성."""
    scripts_dir = company_dir / "output" / "_scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)

    for step in workflow["steps"]:
        context["outputs"][step["id"]] = str(company_dir / step["outputs"][0]["path"])

    for step in workflow["steps"]:
        prompt, prompt_file, output_dir = prepare_step(step, context, company_dir)

        for tool, cmd_tpl in [
            ("claude", f'claude --print --dangerously-skip-permissions "$(cat \'{prompt_file}\')" > "{output_dir}/response.md"'),
            ("cline",  f'cline -y -c "{output_dir}" "다음 파일을 읽고 지시사항을 그대로 수행하세요: {prompt_file}"'),
        ]:
            script = scripts_dir / f"{step['id']}_{tool}.sh"
            script.write_text(
                f'#!/bin/bash\n# [{step["id"]}] {step["name"]} — {tool}\n'
                f'set -e\nmkdir -p "{output_dir}"\n{cmd_tpl}\n'
                f'echo "완료: {step["id"]}"\n',
                encoding="utf-8"
            )
            script.chmod(0o755)
            print(f"  생성: {script.name}")

        print(f"  프롬프트: {prompt_file.name}")

    print(f"\n스크립트 위치: {scripts_dir}/")


def show_status(workflow: dict, company_dir: Path):
    """각 단계의 완료 상태를 출력."""
    print(f"\n{workflow['name']} — 상태")
    print("-" * 50)
    state = load_state(company_dir)
    for step in workflow["steps"]:
        done = is_step_done(company_dir, step["id"])
        done_at = state.get(f"{step['id']}_done_at", "")
        status = f"✓ 완료 ({done_at[:16]})" if done else "○ 미완료"
        print(f"  {step['id']:<25} {status}")
    print()


def collect_user_inputs(workflow: dict, cli_inputs: list[str] | None) -> dict:
    user_inputs = {}

    if cli_inputs:
        for item in cli_inputs:
            if "=" in item:
                k, v = item.split("=", 1)
                user_inputs[k] = v
        return user_inputs

    inputs = workflow.get("inputs", [])
    if not inputs:
        return user_inputs

    print("사용자 입력")
    print("-" * 40)
    for inp in inputs:
        name = inp["name"]
        desc = inp.get("description", name)
        default = inp.get("default", "")
        required = inp.get("required", True)

        hint = f" (기본값: {default})" if default else ""
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


# ── 진입점 ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SingleAgentCompany Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예제:
  python orchestrator.py --company web-agency
  python orchestrator.py --company web-agency --mode cline
  python orchestrator.py --company web-agency --step 03_frontend
  python orchestrator.py --company web-agency --from-step 02_design
  python orchestrator.py --company web-agency --status
  python orchestrator.py --company web-agency --generate-scripts
  python orchestrator.py --company web-agency --inputs "user_brief=포트폴리오 사이트"

모드:
  cline   — Cline CLI 자동 실행 (기본값 권장)
  claude  — Claude Code CLI 자동 실행
  manual  — 프롬프트 파일 생성 후 사용자가 직접 실행
  print   — 프롬프트를 stdout으로 출력
        """
    )
    parser.add_argument("--company", required=True, help="companies/ 하위 폴더명")
    parser.add_argument("--mode", choices=list(ADAPTERS), default=None)
    parser.add_argument("--step", help="특정 단계만 실행")
    parser.add_argument("--from-step", help="이 단계부터 재시작")
    parser.add_argument("--no-skip", action="store_true", help="완료된 단계도 다시 실행")
    parser.add_argument("--status", action="store_true", help="각 단계 완료 상태 확인")
    parser.add_argument("--generate-scripts", action="store_true", help="shell 스크립트 일괄 생성")
    parser.add_argument("--inputs", nargs="*", metavar="KEY=VALUE")
    args = parser.parse_args()

    company_dir = BASE_DIR / "companies" / args.company
    workflow_file = company_dir / "workflow.yaml"
    if not workflow_file.exists():
        print(f"오류: {workflow_file} 없음")
        sys.exit(1)

    workflow = load_yaml(workflow_file)
    mode = args.mode or workflow.get("default_mode", "manual")

    if mode not in ADAPTERS:
        print(f"오류: 알 수 없는 모드 '{mode}'")
        sys.exit(1)

    # 상태 확인 모드
    if args.status:
        show_status(workflow, company_dir)
        return

    print(f"\n{workflow['name']} — {mode.upper()} 모드")
    print(workflow.get("description", ""))

    user_inputs = collect_user_inputs(workflow, args.inputs)
    context = {"user": user_inputs, "outputs": {}}

    init_logger(company_dir)

    if args.generate_scripts:
        generate_scripts(workflow, company_dir, context)
    else:
        run_workflow(
            workflow, company_dir, context, mode,
            from_step=args.from_step,
            target_step=args.step,
            skip_done=not args.no_skip,
        )


if __name__ == "__main__":
    main()
