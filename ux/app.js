/**
 * SingleAgentCompany UX
 * 순수 Vanilla JS — 별도 서버 불필요 (file:// 로 열기 가능)
 *
 * 데이터는 localStorage에 저장.
 * 초기 시드 데이터는 SEED_DATA에 정의.
 */

// ── 시드 데이터 ──────────────────────────────────────────────
const SEED_COMPANIES = [
  {
    id: "web-agency",
    icon: "🌐",
    name: "Web Agency",
    description: "사용자 브리핑을 받아 웹페이지를 완성하는 워크플로우",
    default_mode: "cline",
    inputs: [
      { name: "user_brief", description: "만들고 싶은 웹페이지에 대한 설명", required: true }
    ],
    steps: [
      { id: "01_discovery", name: "요구사항 분석", persona: "pm", prompt_template: "prompts/01_discovery.md" },
      { id: "02_design", name: "화면 설계", persona: "ux_designer", prompt_template: "prompts/02_design.md" },
      { id: "03_frontend", name: "프론트엔드 구현", persona: "frontend_dev", prompt_template: "prompts/03_frontend.md" },
      { id: "04_qa", name: "QA 검수", persona: "qa_engineer", prompt_template: "prompts/04_qa.md" },
    ]
  },
  {
    id: "tizen-refactor",
    icon: "🔧",
    name: "Tizen AI Refactor Co.",
    description: "Tizen 패키지를 AI agent 친화적으로 리팩토링하고 문서화",
    default_mode: "cline",
    inputs: [
      { name: "package_path", description: "리팩토링할 Tizen 패키지 경로", required: true },
      { name: "refactor_goals", description: "리팩토링 목표 (선택사항)", required: false }
    ],
    steps: [
      { id: "01_analysis", name: "코드 분석", persona: "code_analyst", prompt_template: "prompts/01_analysis.md" },
      { id: "02_plan", name: "리팩토링 계획", persona: "architect", prompt_template: "prompts/02_plan.md" },
      { id: "03_refactor", name: "리팩토링 실행", persona: "tizen_dev", prompt_template: "prompts/03_refactor.md" },
      { id: "04_docs", name: "문서화", persona: "tech_writer", prompt_template: "prompts/04_docs.md" },
    ]
  },
  {
    id: "skill-converter",
    icon: "🔄",
    name: "Skill Converter Co.",
    description: "Multi-agent skill.md를 single-agent용으로 변환",
    default_mode: "cline",
    inputs: [
      { name: "skill_path", description: "변환할 multi-agent skill.md 경로", required: true },
      { name: "target_tool", description: "변환 대상 도구 (기본값: cline)", required: false, default: "cline" }
    ],
    steps: [
      { id: "01_parse", name: "스킬 구조 분석", persona: "skill_analyst", prompt_template: "prompts/01_parse.md" },
      { id: "02_mapping", name: "변환 전략 수립", persona: "workflow_architect", prompt_template: "prompts/02_mapping.md" },
      { id: "03_rewrite", name: "스킬 재작성", persona: "skill_writer", prompt_template: "prompts/03_rewrite.md" },
      { id: "04_review", name: "검수", persona: "skill_reviewer", prompt_template: "prompts/04_review.md" },
    ]
  }
];

const SEED_PERSONAS = [
  { name: "pm", role: "Product Manager", preview: "사용자 요청을 분석하여 명확한 요구사항 문서를 작성합니다." },
  { name: "ux_designer", role: "UX Designer", preview: "요구사항을 바탕으로 화면 구조와 사용자 흐름을 설계합니다." },
  { name: "frontend_dev", role: "Frontend Developer", preview: "화면 설계를 바탕으로 동작하는 웹 코드를 구현합니다." },
  { name: "qa_engineer", role: "QA Engineer", preview: "구현된 결과물을 검토하고 품질 보고서를 작성합니다." },
  { name: "code_analyst", role: "Code Analyst", preview: "소스 코드의 구조, 의존성, 품질을 분석합니다." },
  { name: "architect", role: "Software Architect", preview: "리팩토링 전략과 구체적인 실행 계획을 수립합니다." },
  { name: "tizen_dev", role: "Tizen Platform Developer", preview: "Tizen 패키지를 AI 친화적 구조로 리팩토링합니다." },
  { name: "tech_writer", role: "Technical Writer", preview: "개발자와 AI agent 모두가 이해할 수 있는 문서를 작성합니다." },
  { name: "skill_analyst", role: "Skill Analyst", preview: "multi-agent skill의 구조와 의존성을 분석합니다." },
  { name: "workflow_architect", role: "Workflow Architect", preview: "multi→single agent 변환 전략을 수립합니다." },
  { name: "skill_writer", role: "Skill Writer", preview: "single-agent용 skill.md를 작성합니다." },
  { name: "skill_reviewer", role: "Skill Reviewer", preview: "변환된 스킬의 원본 의도 보존 여부를 검증합니다." },
];

// ── 스토어 ───────────────────────────────────────────────────
const Store = {
  key: "sac_data",
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  },
  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },
  init() {
    let data = this.load();
    if (!data) {
      data = { companies: SEED_COMPANIES, personas: SEED_PERSONAS };
      this.save(data);
    }
    return data;
  }
};

// ── 앱 상태 ──────────────────────────────────────────────────
let state = {
  data: null,
  currentCompany: null,   // 편집 중인 company
  currentStep: null,      // 편집 중인 step index
};

// ── DOM 헬퍼 ─────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function showView(id) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#view-${id}`).classList.add("active");
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === id));
}

// ── 워크플로우 목록 렌더 ─────────────────────────────────────
function renderCompanies() {
  const grid = $("#companies-grid");
  grid.innerHTML = "";
  state.data.companies.forEach(c => {
    const card = document.createElement("div");
    card.className = "company-card";
    card.innerHTML = `
      <div class="company-card-icon">${c.icon || "⚡"}</div>
      <h3>${c.name}</h3>
      <p>${c.description || ""}</p>
      <div class="company-card-meta">
        <span class="badge">${c.steps.length}단계</span>
        <span class="badge badge-${c.default_mode === "cline" ? "cline" : "manual"}">
          ${c.default_mode || "manual"}
        </span>
      </div>
    `;
    card.addEventListener("click", () => openEditor(c.id));
    grid.appendChild(card);
  });
}

// ── 편집기 ───────────────────────────────────────────────────
function openEditor(companyId) {
  state.currentCompany = JSON.parse(JSON.stringify(
    state.data.companies.find(c => c.id === companyId)
  ));
  state.currentStep = null;
  $("#editor-title").textContent = state.currentCompany.name;
  renderStepList();
  $("#step-detail").innerHTML = `<div class="empty-state"><p>왼쪽에서 단계를 선택하세요.</p></div>`;
  showView("editor");
}

function renderStepList() {
  const list = $("#steps-list");
  list.innerHTML = "";
  state.currentCompany.steps.forEach((step, i) => {
    const item = document.createElement("div");
    item.className = "step-item" + (state.currentStep === i ? " active" : "");
    item.dataset.index = i;
    item.innerHTML = `
      <div class="step-num">${i + 1}</div>
      <div class="step-info">
        <div class="step-name">${step.name}</div>
        <div class="step-persona">${step.persona || "—"}</div>
      </div>
    `;
    item.addEventListener("click", () => selectStep(i));
    list.appendChild(item);
  });
}

function selectStep(index) {
  state.currentStep = index;
  $$(".step-item").forEach((el, i) => el.classList.toggle("active", i === index));
  renderStepDetail(state.currentCompany.steps[index]);
}

function renderStepDetail(step) {
  const personaOptions = state.data.personas
    .map(p => `<option value="${p.name}" ${p.name === step.persona ? "selected" : ""}>${p.name} — ${p.role}</option>`)
    .join("");

  $("#step-detail").innerHTML = `
    <div class="step-form">
      <label>단계 ID
        <input type="text" id="field-id" value="${step.id}" />
      </label>
      <label>단계 이름
        <input type="text" id="field-name" value="${step.name}" />
      </label>
      <label>페르소나
        <select id="field-persona">
          <option value="">— 선택 —</option>
          ${personaOptions}
        </select>
      </label>
      <label>프롬프트 템플릿 경로
        <input type="text" id="field-template" value="${step.prompt_template || ""}" placeholder="prompts/01_step.md" />
      </label>
      <label>출력 경로
        <input type="text" id="field-output" value="${step.outputs?.[0]?.path || ""}" placeholder="output/01_step/" />
      </label>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn-secondary" id="btn-delete-step" style="color:var(--danger);">단계 삭제</button>
      </div>
    </div>
  `;

  // 실시간 저장
  ["field-id","field-name","field-persona","field-template","field-output"].forEach(id => {
    $(`#${id}`).addEventListener("input", syncStepFromForm);
  });
  $("#btn-delete-step").addEventListener("click", deleteCurrentStep);
}

function syncStepFromForm() {
  const step = state.currentCompany.steps[state.currentStep];
  step.id = $("#field-id").value;
  step.name = $("#field-name").value;
  step.persona = $("#field-persona").value;
  step.prompt_template = $("#field-template").value;
  if (!step.outputs) step.outputs = [{}];
  step.outputs[0].path = $("#field-output").value;
  renderStepList();
  // 현재 선택 유지
  $$(".step-item")[state.currentStep]?.classList.add("active");
}

function deleteCurrentStep() {
  if (!confirm("이 단계를 삭제할까요?")) return;
  state.currentCompany.steps.splice(state.currentStep, 1);
  state.currentStep = null;
  renderStepList();
  $("#step-detail").innerHTML = `<div class="empty-state"><p>왼쪽에서 단계를 선택하세요.</p></div>`;
}

// ── 저장 ─────────────────────────────────────────────────────
function saveCompany() {
  const idx = state.data.companies.findIndex(c => c.id === state.currentCompany.id);
  if (idx >= 0) {
    state.data.companies[idx] = state.currentCompany;
  } else {
    state.data.companies.push(state.currentCompany);
  }
  Store.save(state.data);
  alert("저장됐습니다.");
}

// ── 내보내기 (YAML 생성) ──────────────────────────────────────
function exportCompany() {
  const c = state.currentCompany;
  const yaml = generateYAML(c);
  const blob = new Blob([yaml], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.id}_workflow.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}

function generateYAML(c) {
  let out = `name: ${c.name}\n`;
  out += `description: ${c.description || ""}\n`;
  out += `version: 1.0\n`;
  out += `default_mode: ${c.default_mode || "cline"}\n\n`;

  if (c.inputs?.length) {
    out += `inputs:\n`;
    c.inputs.forEach(inp => {
      out += `  - name: ${inp.name}\n`;
      out += `    description: ${inp.description || ""}\n`;
      out += `    required: ${inp.required !== false}\n`;
      if (inp.default) out += `    default: ${inp.default}\n`;
    });
    out += "\n";
  }

  out += `steps:\n`;
  c.steps.forEach(step => {
    out += `  - id: ${step.id}\n`;
    out += `    name: ${step.name}\n`;
    if (step.persona) out += `    persona: ${step.persona}\n`;
    if (step.prompt_template) out += `    prompt_template: ${step.prompt_template}\n`;
    if (step.outputs?.[0]?.path) {
      out += `    outputs:\n`;
      out += `      - path: ${step.outputs[0].path}\n`;
    }
  });

  return out;
}

// ── 페르소나 렌더 ────────────────────────────────────────────
function renderPersonas() {
  const grid = $("#personas-grid");
  grid.innerHTML = "";
  state.data.personas.forEach(p => {
    const card = document.createElement("div");
    card.className = "persona-card";
    card.innerHTML = `
      <h3>${p.name}</h3>
      <div class="role">${p.role}</div>
      <div class="preview">${p.preview || ""}</div>
    `;
    card.addEventListener("click", () => openPersonaModal(p));
    grid.appendChild(card);
  });
}

function openPersonaModal(persona = null) {
  const modal = $("#persona-modal");
  $("#persona-modal-title").textContent = persona ? "페르소나 편집" : "새 페르소나";
  $("#persona-name").value = persona?.name || "";
  $("#persona-role").value = persona?.role || "";
  $("#persona-content").value = persona?.content || generatePersonaTemplate(persona?.name || "");
  modal.classList.remove("hidden");
  modal._editing = persona;
}

function generatePersonaTemplate(name) {
  return `---\nname: ${name}\nrole: \nversion: 1.0\n---\n\n# 역할\n당신은 ...\n\n# 작업 원칙\n- \n\n# 출력 형식\n- `;
}

function savePersonaModal() {
  const name = $("#persona-name").value.trim();
  const role = $("#persona-role").value.trim();
  const content = $("#persona-content").value;

  if (!name) return alert("이름을 입력하세요.");

  const preview = content.split("\n").find(l => l.trim() && !l.startsWith("#") && !l.startsWith("---")) || "";
  const persona = { name, role, content, preview: preview.replace(/^-\s*/, "").slice(0, 80) };

  const editing = $("#persona-modal")._editing;
  if (editing) {
    const idx = state.data.personas.findIndex(p => p.name === editing.name);
    if (idx >= 0) state.data.personas[idx] = persona;
  } else {
    state.data.personas.push(persona);
  }

  Store.save(state.data);
  renderPersonas();
  $("#persona-modal").classList.add("hidden");
}

// ── 실행 뷰 ──────────────────────────────────────────────────
function initRunView() {
  const select = $("#run-company");
  select.innerHTML = state.data.companies.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join("");
  updateRunCommand();
  select.addEventListener("change", updateRunInputs);
  $("#run-mode").addEventListener("change", updateRunCommand);
  $("#run-generate-scripts").addEventListener("change", updateRunCommand);
  updateRunInputs();
}

function updateRunInputs() {
  const companyId = $("#run-company").value;
  const company = state.data.companies.find(c => c.id === companyId);
  const container = $("#run-inputs");
  container.innerHTML = "";

  company?.inputs?.forEach(inp => {
    const label = document.createElement("label");
    label.textContent = inp.description + (inp.required ? "" : " (선택)");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = inp.default || "";
    input.dataset.key = inp.name;
    input.addEventListener("input", updateRunCommand);
    label.appendChild(input);
    container.appendChild(label);
  });

  updateRunCommand();
}

function updateRunCommand() {
  const companyId = $("#run-company").value;
  const mode = $("#run-mode").value;
  const generateScripts = $("#run-generate-scripts").checked;

  const inputEls = $$("#run-inputs input");
  const inputArgs = inputEls
    .map(el => el.value.trim() ? `"${el.dataset.key}=${el.value.trim()}"` : null)
    .filter(Boolean)
    .join(" ");

  let cmd = `python orchestrator/orchestrator.py \\\n  --company ${companyId} \\\n  --mode ${mode}`;
  if (inputArgs) cmd += ` \\\n  --inputs ${inputArgs}`;
  if (generateScripts) cmd += ` \\\n  --generate-scripts`;

  $("#run-command-output").textContent = cmd;
}

// ── 초기화 ───────────────────────────────────────────────────
function init() {
  state.data = Store.init();
  renderCompanies();
  renderPersonas();
  initRunView();

  // 네비게이션
  $$(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      showView(btn.dataset.view);
      if (btn.dataset.view === "companies") renderCompanies();
      if (btn.dataset.view === "personas") renderPersonas();
      if (btn.dataset.view === "run") initRunView();
    });
  });

  // 편집기 버튼
  $("#btn-back").addEventListener("click", () => showView("companies"));
  $("#btn-save").addEventListener("click", saveCompany);
  $("#btn-export").addEventListener("click", exportCompany);

  $("#btn-add-step").addEventListener("click", () => {
    const newStep = {
      id: `0${state.currentCompany.steps.length + 1}_new_step`,
      name: "새 단계",
      persona: "",
      prompt_template: "",
      outputs: [{ path: "" }]
    };
    state.currentCompany.steps.push(newStep);
    renderStepList();
    selectStep(state.currentCompany.steps.length - 1);
  });

  // 새 워크플로우
  $("#btn-new-company").addEventListener("click", () => {
    const id = `company-${Date.now()}`;
    state.currentCompany = {
      id, icon: "⚡",
      name: "새 워크플로우",
      description: "",
      default_mode: "cline",
      inputs: [],
      steps: []
    };
    state.currentStep = null;
    $("#editor-title").textContent = state.currentCompany.name;
    renderStepList();
    $("#step-detail").innerHTML = `<div class="empty-state"><p>+ 버튼으로 단계를 추가하세요.</p></div>`;
    showView("editor");
  });

  // 페르소나 모달
  $("#btn-new-persona").addEventListener("click", () => openPersonaModal());
  $("#persona-modal-close").addEventListener("click", () => $("#persona-modal").classList.add("hidden"));
  $("#persona-modal-cancel").addEventListener("click", () => $("#persona-modal").classList.add("hidden"));
  $("#persona-modal-save").addEventListener("click", savePersonaModal);

  // 실행 명령 복사
  $("#btn-run").addEventListener("click", () => {
    const text = $("#run-command-output").textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = $("#btn-run");
      btn.textContent = "복사됨 ✓";
      setTimeout(() => { btn.textContent = "실행 명령 복사"; }, 2000);
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
