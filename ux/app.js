/**
 * SingleAgentCompany UX
 * 순수 Vanilla JS — 별도 서버 불필요 (file:// 로 열기 가능)
 * 데이터는 localStorage에 저장.
 */

// ── 시드 데이터 ──────────────────────────────────────────────
const SEED_COMPANIES = [
  {
    id: "web-agency", icon: "🌐",
    name: "Web Agency",
    description: "사용자 브리핑을 받아 웹페이지를 완성하는 워크플로우",
    default_mode: "cline",
    inputs: [
      { name: "user_brief", description: "만들고 싶은 웹페이지에 대한 설명", required: true }
    ],
    steps: [
      { id: "01_discovery", name: "요구사항 분석", persona: "pm", prompt_template: "prompts/01_discovery.md", outputs: [{ path: "output/01_discovery/" }] },
      { id: "02_design", name: "화면 설계", persona: "ux_designer", prompt_template: "prompts/02_design.md", outputs: [{ path: "output/02_design/" }] },
      { id: "03_frontend", name: "프론트엔드 구현", persona: "frontend_dev", prompt_template: "prompts/03_frontend.md", outputs: [{ path: "output/03_frontend/" }] },
      { id: "04_qa", name: "QA 검수", persona: "qa_engineer", prompt_template: "prompts/04_qa.md", outputs: [{ path: "output/04_qa/" }] },
    ]
  },
  {
    id: "tizen-refactor", icon: "🔧",
    name: "Tizen AI Refactor Co.",
    description: "Tizen 패키지를 AI agent 친화적으로 리팩토링하고 문서화",
    default_mode: "cline",
    inputs: [
      { name: "package_path", description: "리팩토링할 Tizen 패키지 경로", required: true },
      { name: "refactor_goals", description: "리팩토링 목표 (선택사항)", required: false }
    ],
    steps: [
      { id: "01_analysis", name: "코드 분석", persona: "code_analyst", prompt_template: "prompts/01_analysis.md", outputs: [{ path: "output/01_analysis/" }] },
      { id: "02_plan", name: "리팩토링 계획", persona: "architect", prompt_template: "prompts/02_plan.md", outputs: [{ path: "output/02_plan/" }] },
      { id: "03_refactor", name: "리팩토링 실행", persona: "tizen_dev", prompt_template: "prompts/03_refactor.md", outputs: [{ path: "output/03_refactor/" }] },
      { id: "04_docs", name: "문서화", persona: "tech_writer", prompt_template: "prompts/04_docs.md", outputs: [{ path: "output/04_docs/" }] },
    ]
  },
  {
    id: "skill-converter", icon: "🔄",
    name: "Skill Converter Co.",
    description: "Multi-agent skill.md를 single-agent용으로 변환",
    default_mode: "cline",
    inputs: [
      { name: "skill_path", description: "변환할 multi-agent skill.md 경로", required: true },
      { name: "target_tool", description: "변환 대상 도구", required: false, default: "cline" }
    ],
    steps: [
      { id: "01_parse", name: "스킬 구조 분석", persona: "skill_analyst", prompt_template: "prompts/01_parse.md", outputs: [{ path: "output/01_parse/" }] },
      { id: "02_mapping", name: "변환 전략 수립", persona: "workflow_architect", prompt_template: "prompts/02_mapping.md", outputs: [{ path: "output/02_mapping/" }] },
      { id: "03_rewrite", name: "스킬 재작성", persona: "skill_writer", prompt_template: "prompts/03_rewrite.md", outputs: [{ path: "output/03_rewrite/" }] },
      { id: "04_review", name: "검수", persona: "skill_reviewer", prompt_template: "prompts/04_review.md", outputs: [{ path: "output/04_review/" }] },
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
    try { const r = localStorage.getItem(this.key); if (r) return JSON.parse(r); } catch {}
    return null;
  },
  save(data) { localStorage.setItem(this.key, JSON.stringify(data)); },
  init() {
    let data = this.load();
    if (!data) { data = { companies: SEED_COMPANIES, personas: SEED_PERSONAS }; this.save(data); }
    return data;
  }
};

// ── 상태 ─────────────────────────────────────────────────────
let state = { data: null, currentCompany: null, currentStep: null };

// ── DOM 헬퍼 ─────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(str) {
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function showView(id) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#view-${id}`).classList.add("active");
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === id));
}

function download(filename, content, type = "text/plain") {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type })),
    download: filename
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── 워크플로우 목록 ──────────────────────────────────────────
function renderCompanies() {
  const grid = $("#companies-grid");
  grid.innerHTML = "";
  state.data.companies.forEach(c => {
    const card = document.createElement("div");
    card.className = "company-card";
    card.innerHTML = `
      <div class="company-card-icon">${esc(c.icon || "⚡")}</div>
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.description || "")}</p>
      <div class="company-card-meta">
        <span class="badge">${c.steps.length}단계</span>
        <span class="badge badge-${c.default_mode === "cline" ? "cline" : "manual"}">${esc(c.default_mode || "manual")}</span>
      </div>
    `;
    card.addEventListener("click", () => openEditor(c.id));
    grid.appendChild(card);
  });
}

// ── 편집기 ───────────────────────────────────────────────────
function openEditor(companyId) {
  state.currentCompany = JSON.parse(JSON.stringify(state.data.companies.find(c => c.id === companyId)));
  state.currentStep = null;
  renderEditorHeader();
  renderStepList();
  showStepDetail(null);
  showView("editor");
}

function renderEditorHeader() {
  const c = state.currentCompany;
  $("#editor-title").textContent = c.name;
  // 워크플로우 메타 폼
  $("#wf-name").value = c.name;
  $("#wf-description").value = c.description || "";
  $("#wf-icon").value = c.icon || "⚡";
  $("#wf-mode").value = c.default_mode || "cline";
  renderInputsList();
}

function renderInputsList() {
  const container = $("#wf-inputs-list");
  container.innerHTML = "";
  (state.currentCompany.inputs || []).forEach((inp, i) => {
    const row = document.createElement("div");
    row.className = "input-row";
    row.innerHTML = `
      <input class="inp-name" value="${esc(inp.name)}" placeholder="name" />
      <input class="inp-desc" value="${esc(inp.description || "")}" placeholder="설명" style="flex:2" />
      <label class="checkbox-label" style="flex-shrink:0">
        <input type="checkbox" class="inp-required" ${inp.required !== false ? "checked" : ""} /> 필수
      </label>
      <input class="inp-default" value="${esc(inp.default || "")}" placeholder="기본값" style="width:100px" />
      <button class="btn-icon btn-danger" data-idx="${i}">✕</button>
    `;
    row.querySelector(".btn-danger").addEventListener("click", () => removeInput(i));
    ["inp-name","inp-desc","inp-required","inp-default"].forEach(cls => {
      row.querySelector(`.${cls}`).addEventListener("input", () => syncInputFromRow(i, row));
      row.querySelector(`.${cls}`).addEventListener("change", () => syncInputFromRow(i, row));
    });
    container.appendChild(row);
  });
}

function syncInputFromRow(i, row) {
  const inputs = state.currentCompany.inputs;
  inputs[i].name = row.querySelector(".inp-name").value;
  inputs[i].description = row.querySelector(".inp-desc").value;
  inputs[i].required = row.querySelector(".inp-required").checked;
  inputs[i].default = row.querySelector(".inp-default").value;
}

function removeInput(i) {
  state.currentCompany.inputs.splice(i, 1);
  renderInputsList();
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
        <div class="step-name">${esc(step.name)}</div>
        <div class="step-persona">${esc(step.persona || "—")}</div>
      </div>
      <div class="step-order-btns">
        <button class="btn-order" data-dir="-1" data-idx="${i}" title="위로">↑</button>
        <button class="btn-order" data-dir="1" data-idx="${i}" title="아래로">↓</button>
      </div>
    `;
    item.querySelector(".step-info").addEventListener("click", () => selectStep(i));
    item.querySelectorAll(".btn-order").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        moveStep(parseInt(btn.dataset.idx), parseInt(btn.dataset.dir));
      });
    });
    list.appendChild(item);
  });
}

function moveStep(idx, dir) {
  const steps = state.currentCompany.steps;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= steps.length) return;
  [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
  if (state.currentStep === idx) state.currentStep = newIdx;
  else if (state.currentStep === newIdx) state.currentStep = idx;
  renderStepList();
}

function selectStep(index) {
  state.currentStep = index;
  $$(".step-item").forEach((el, i) => el.classList.toggle("active", i === index));
  showStepDetail(state.currentCompany.steps[index]);
}

function showStepDetail(step) {
  if (!step) {
    $("#step-detail").innerHTML = `<div class="empty-state"><p>왼쪽에서 단계를 선택하세요.</p></div>`;
    return;
  }
  const personaOptions = state.data.personas
    .map(p => `<option value="${esc(p.name)}" ${p.name === step.persona ? "selected" : ""}>${esc(p.name)} — ${esc(p.role)}</option>`)
    .join("");

  $("#step-detail").innerHTML = `
    <div class="step-form">
      <label>단계 ID
        <input type="text" id="field-id" value="${esc(step.id)}" />
      </label>
      <label>단계 이름
        <input type="text" id="field-name" value="${esc(step.name)}" />
      </label>
      <label>페르소나
        <select id="field-persona">
          <option value="">— 선택 —</option>
          ${personaOptions}
        </select>
      </label>
      <label>프롬프트 템플릿 경로
        <input type="text" id="field-template" value="${esc(step.prompt_template || "")}" placeholder="prompts/01_step.md" />
      </label>
      <label>출력 경로
        <input type="text" id="field-output" value="${esc(step.outputs?.[0]?.path || "")}" placeholder="output/01_step/" />
      </label>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn-secondary" id="btn-delete-step" style="color:var(--danger);">단계 삭제</button>
      </div>
    </div>
  `;

  ["field-id","field-name","field-persona","field-template","field-output"].forEach(id => {
    $(`#${id}`).addEventListener("input", syncStepFromForm);
    $(`#${id}`).addEventListener("change", syncStepFromForm);
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
  $$(".step-item")[state.currentStep]?.classList.add("active");
}

function syncCompanyMeta() {
  state.currentCompany.name = $("#wf-name").value;
  state.currentCompany.description = $("#wf-description").value;
  state.currentCompany.icon = $("#wf-icon").value;
  state.currentCompany.default_mode = $("#wf-mode").value;
  $("#editor-title").textContent = state.currentCompany.name;
}

function deleteCurrentStep() {
  if (!confirm("이 단계를 삭제할까요?")) return;
  state.currentCompany.steps.splice(state.currentStep, 1);
  state.currentStep = null;
  renderStepList();
  showStepDetail(null);
}

// ── 저장 / 내보내기 ──────────────────────────────────────────
function saveCompany() {
  syncCompanyMeta();
  const idx = state.data.companies.findIndex(c => c.id === state.currentCompany.id);
  if (idx >= 0) state.data.companies[idx] = state.currentCompany;
  else state.data.companies.push(state.currentCompany);
  Store.save(state.data);
  // 저장 버튼 피드백
  const btn = $("#btn-save");
  btn.textContent = "저장됨 ✓";
  setTimeout(() => { btn.textContent = "저장"; }, 1500);
}

function exportCompany() {
  syncCompanyMeta();
  download(`${state.currentCompany.id}_workflow.yaml`, generateYAML(state.currentCompany), "text/yaml");
}

function generateYAML(c) {
  let out = `name: ${c.name}\ndescription: ${c.description || ""}\nversion: 1.0\ndefault_mode: ${c.default_mode || "cline"}\n`;
  if (c.inputs?.length) {
    out += `\ninputs:\n`;
    c.inputs.forEach(inp => {
      out += `  - name: ${inp.name}\n    description: ${inp.description || ""}\n    required: ${inp.required !== false}\n`;
      if (inp.default) out += `    default: ${inp.default}\n`;
    });
  }
  out += `\nsteps:\n`;
  c.steps.forEach(step => {
    out += `  - id: ${step.id}\n    name: ${step.name}\n`;
    if (step.persona) out += `    persona: ${step.persona}\n`;
    if (step.prompt_template) out += `    prompt_template: ${step.prompt_template}\n`;
    if (step.outputs?.[0]?.path) out += `    outputs:\n      - path: ${step.outputs[0].path}\n`;
  });
  return out;
}

// ── 페르소나 ─────────────────────────────────────────────────
function renderPersonas() {
  const grid = $("#personas-grid");
  grid.innerHTML = "";
  state.data.personas.forEach(p => {
    const card = document.createElement("div");
    card.className = "persona-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <h3>${esc(p.name)}</h3>
        <button class="btn-export-persona" data-name="${esc(p.name)}" title="내보내기" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;flex-shrink:0">↓</button>
      </div>
      <div class="role">${esc(p.role)}</div>
      <div class="preview">${esc(p.preview || "")}</div>
    `;
    card.querySelector("h3").addEventListener("click", () => openPersonaModal(p));
    card.querySelector(".role").addEventListener("click", () => openPersonaModal(p));
    card.querySelector(".preview").addEventListener("click", () => openPersonaModal(p));
    card.querySelector(".btn-export-persona").addEventListener("click", e => {
      e.stopPropagation();
      exportPersona(p);
    });
    grid.appendChild(card);
  });
}

function exportPersona(p) {
  const content = p.content || `---\nname: ${p.name}\nrole: ${p.role}\nversion: 1.0\n---\n\n${p.preview || ""}`;
  download(`${p.name}.md`, content);
}

function openPersonaModal(persona = null) {
  const modal = $("#persona-modal");
  $("#persona-modal-title").textContent = persona ? "페르소나 편집" : "새 페르소나";
  $("#persona-name").value = persona?.name || "";
  $("#persona-role").value = persona?.role || "";
  $("#persona-content").value = persona?.content || `---\nname: \nrole: \nversion: 1.0\n---\n\n# 역할\n당신은 ...\n\n# 작업 원칙\n- \n\n# 출력 형식\n- `;
  modal.classList.remove("hidden");
  modal._editing = persona;
}

function savePersonaModal() {
  const name = $("#persona-name").value.trim();
  const role = $("#persona-role").value.trim();
  const content = $("#persona-content").value;
  if (!name) return alert("이름을 입력하세요.");
  const preview = content.split("\n").find(l => l.trim() && !l.startsWith("#") && !l.startsWith("---")) || "";
  const persona = { name, role, content, preview: preview.replace(/^[-*]\s*/, "").slice(0, 80) };
  const editing = $("#persona-modal")._editing;
  if (editing) {
    const idx = state.data.personas.findIndex(p => p.name === editing.name);
    if (idx >= 0) state.data.personas[idx] = persona;
    else state.data.personas.push(persona);
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
  // 이벤트 중복 방지
  const fresh = select.cloneNode(false);
  select.parentNode.replaceChild(fresh, select);

  fresh.innerHTML = state.data.companies.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  fresh.addEventListener("change", () => { updateRunInputs(); updateRunCommand(); });
  $("#run-mode").addEventListener("change", updateRunCommand);
  $("#run-generate-scripts").addEventListener("change", updateRunCommand);
  updateRunInputs();
}

function updateRunInputs() {
  const companyId = $("#run-company").value;
  const company = state.data.companies.find(c => c.id === companyId);
  const container = $("#run-inputs");
  container.innerHTML = "";
  (company?.inputs || []).forEach(inp => {
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
  const companyId = $("#run-company")?.value;
  if (!companyId) return;
  const mode = $("#run-mode").value;
  const generateScripts = $("#run-generate-scripts").checked;
  const inputArgs = $$("#run-inputs input")
    .filter(el => el.value.trim())
    .map(el => `"${el.dataset.key}=${el.value.trim()}"`)
    .join(" ");

  let cmd = `cd SingleAgentCompany\npip install -r orchestrator/requirements.txt\n\npython orchestrator/orchestrator.py \\\n  --company ${companyId} \\\n  --mode ${mode}`;
  if (inputArgs) cmd += ` \\\n  --inputs ${inputArgs}`;
  if (generateScripts) cmd += ` \\\n  --generate-scripts`;
  cmd += `\n\n# 상태 확인\npython orchestrator/orchestrator.py --company ${companyId} --status\n\n# 특정 단계부터 재시작\npython orchestrator/orchestrator.py --company ${companyId} --from-step 02_design`;

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

  // 편집기
  $("#btn-back").addEventListener("click", () => showView("companies"));
  $("#btn-save").addEventListener("click", saveCompany);
  $("#btn-export").addEventListener("click", exportCompany);

  // 워크플로우 메타 편집 실시간 동기화
  ["wf-name","wf-description","wf-icon","wf-mode"].forEach(id => {
    document.addEventListener("input", e => { if (e.target.id === id) syncCompanyMeta(); });
    document.addEventListener("change", e => { if (e.target.id === id) syncCompanyMeta(); });
  });

  // 단계 추가
  $("#btn-add-step").addEventListener("click", () => {
    const n = state.currentCompany.steps.length + 1;
    const pad = String(n).padStart(2, "0");
    state.currentCompany.steps.push({
      id: `${pad}_new_step`, name: "새 단계", persona: "",
      prompt_template: `prompts/${pad}_new_step.md`,
      outputs: [{ path: `output/${pad}_new_step/` }]
    });
    renderStepList();
    selectStep(state.currentCompany.steps.length - 1);
  });

  // inputs 추가
  $("#btn-add-input").addEventListener("click", () => {
    if (!state.currentCompany.inputs) state.currentCompany.inputs = [];
    state.currentCompany.inputs.push({ name: "", description: "", required: true, default: "" });
    renderInputsList();
  });

  // 새 워크플로우
  $("#btn-new-company").addEventListener("click", () => {
    state.currentCompany = {
      id: `company-${Date.now()}`, icon: "⚡",
      name: "새 워크플로우", description: "",
      default_mode: "cline", inputs: [], steps: []
    };
    state.currentStep = null;
    renderEditorHeader();
    renderStepList();
    showStepDetail(null);
    showView("editor");
  });

  // 페르소나 모달
  $("#btn-new-persona").addEventListener("click", () => openPersonaModal());
  $("#persona-modal-close").addEventListener("click", () => $("#persona-modal").classList.add("hidden"));
  $("#persona-modal-cancel").addEventListener("click", () => $("#persona-modal").classList.add("hidden"));
  $("#persona-modal-save").addEventListener("click", savePersonaModal);

  // 실행 명령 복사
  $("#btn-run").addEventListener("click", () => {
    navigator.clipboard.writeText($("#run-command-output").textContent).then(() => {
      const btn = $("#btn-run");
      btn.textContent = "복사됨 ✓";
      setTimeout(() => { btn.textContent = "실행 명령 복사"; }, 2000);
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
