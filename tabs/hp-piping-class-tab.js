import {
  HP_PIPING_CLASS_AUTHORITY_POLICY,
  HP_PIPING_CLASS_PROJECT_VERSION,
  createHpPipingClassProject,
  validateHpPipingClassProject,
} from '../converters/b313-chapter-ix/hp-piping-class.js';

const PANELS = Object.freeze([
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Class Matrix' },
  { id: 'fatigue', label: 'Cycles & Fatigue' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'legacy', label: 'Legacy compatibility' },
]);

const PANEL_IDS = new Set(PANELS.map((panel) => panel.id));
const STORAGE_KEY = 'format-converters.hpPipingClass.panel';
const LEGACY_WORKSPACE_SRC = './engineering/hp-class-standardization/engineering-library.html';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ensureStylesheet() {
  if (document.querySelector('style[data-hp-piping-class-tab-style="true"]')) return;
  const style = document.createElement('style');
  style.dataset.hpPipingClassTabStyle = 'true';
  style.textContent = `
    .hp-piping-class-tab{display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:12px;min-height:calc(100vh - 150px);padding:0 18px 18px}
    .hp-piping-class-tab-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;padding:8px 0 2px}
    .hp-piping-class-tab-header h2{margin:0;font-size:20px}.hp-piping-class-tab-header p{margin:4px 0 0;color:var(--text-muted,#9aa8b8);max-width:900px}
    .hp-piping-class-authority{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .hp-piping-class-badge{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border:1px solid rgba(148,163,184,.26);border-radius:999px;background:rgba(15,23,42,.42);font-size:12px;font-weight:700}
    .hp-piping-class-badge.is-blocked{border-color:rgba(248,113,113,.38);background:rgba(127,29,29,.18)}
    .hp-piping-class-badge.is-info{border-color:rgba(96,165,250,.32);background:rgba(30,64,175,.16)}
    .hp-piping-class-tabs{display:flex;gap:6px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid rgba(148,163,184,.16)}
    .hp-piping-class-tab-button{font:inherit;color:inherit;border:1px solid rgba(148,163,184,.22);background:rgba(15,23,42,.45);border-radius:9px;padding:8px 12px;cursor:pointer}
    .hp-piping-class-tab-button:hover{background:rgba(148,163,184,.1)}.hp-piping-class-tab-button.is-active{background:rgba(148,163,184,.16);font-weight:750}
    .hp-piping-class-panel{min-height:0}.hp-piping-class-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.8fr);gap:14px}.hp-piping-class-card{border:1px solid rgba(148,163,184,.18);border-radius:12px;background:rgba(15,23,42,.26);padding:16px}.hp-piping-class-card h3{margin:0 0 10px;font-size:16px}.hp-piping-class-card p{margin:5px 0;color:var(--text-muted,#9aa8b8)}
    .hp-piping-class-metrics{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px;margin-bottom:14px}.hp-piping-class-metric{border:1px solid rgba(148,163,184,.18);border-radius:10px;padding:12px;background:rgba(15,23,42,.22)}.hp-piping-class-metric span{display:block;color:var(--text-muted,#9aa8b8);font-size:12px}.hp-piping-class-metric strong{display:block;margin-top:4px;font-size:17px}
    .hp-piping-class-list{margin:8px 0 0;padding-left:18px}.hp-piping-class-list li{margin:5px 0}.hp-piping-class-empty{padding:24px;border:1px dashed rgba(148,163,184,.28);border-radius:12px;color:var(--text-muted,#9aa8b8)}
    .hp-piping-class-legacy-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.hp-piping-class-action{font:inherit;color:inherit;border:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.52);border-radius:9px;padding:8px 12px;cursor:pointer}.hp-piping-class-action.is-primary{background:rgba(37,99,235,.22);border-color:rgba(96,165,250,.42);font-weight:700}
    .hp-piping-class-legacy-host{min-height:120px}.hp-piping-class-frame{width:100%;height:min(1000px,calc(100vh - 230px));min-height:760px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:#fff}
    .hp-piping-class-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
    @media(max-width:1050px){.hp-piping-class-grid{grid-template-columns:1fr}.hp-piping-class-metrics{grid-template-columns:repeat(2,minmax(140px,1fr))}}
    @media(max-width:640px){.hp-piping-class-tab{padding:0 10px 14px}.hp-piping-class-metrics{grid-template-columns:1fr}.hp-piping-class-authority{justify-content:flex-start}.hp-piping-class-tab-button{flex:1 1 140px}.hp-piping-class-frame{min-height:700px}}
  `;
  document.head.appendChild(style);
}

function initialProject(context) {
  const supplied = context?.hpPipingClassProject;
  if (supplied && supplied.schemaVersion === HP_PIPING_CLASS_PROJECT_VERSION) {
    return createHpPipingClassProject(supplied);
  }
  return createHpPipingClassProject();
}

function initialPanel(context) {
  const requested = String(context?.hpPipingClassPanel || '').trim();
  if (PANEL_IDS.has(requested)) return requested;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (PANEL_IDS.has(stored)) return stored;
  } catch {}
  return 'overview';
}

function projectSummary(project) {
  const validation = validateHpPipingClassProject(project);
  return {
    validation,
    projectId: project.metadata?.projectId || 'Not initialized',
    classId: project.metadata?.classId || 'Not initialized',
    revision: project.metadata?.revision || '—',
    productCount: Array.isArray(project.products) ? project.products.length : 0,
    cycleCount: Array.isArray(project.transient?.transitions) ? project.transient.transitions.length : 0,
    fatigueCount: Array.isArray(project.fatigueEvidence) ? project.fatigueEvidence.length : 0,
  };
}

function overviewHtml(summary) {
  const issues = summary.validation.issues ?? [];
  const topIssues = issues.slice(0, 8);
  return `
    <div class="hp-piping-class-metrics">
      <div class="hp-piping-class-metric"><span>Class</span><strong>${escapeHtml(summary.classId)}</strong></div>
      <div class="hp-piping-class-metric"><span>Products</span><strong>${summary.productCount}</strong></div>
      <div class="hp-piping-class-metric"><span>Cycles</span><strong>${summary.cycleCount}</strong></div>
      <div class="hp-piping-class-metric"><span>v2 setup</span><strong>${summary.validation.ok ? 'Complete' : `${issues.length} open`}</strong></div>
    </div>
    <div class="hp-piping-class-grid">
      <section class="hp-piping-class-card">
        <h3>Native HP Piping Class workspace</h3>
        <p>This shell now owns the product-level <span class="hp-piping-class-code">${HP_PIPING_CLASS_PROJECT_VERSION}</span> state. The legacy calculator is no longer the top-level HP surface.</p>
        <p>Calculation authority is intentionally unchanged in I4. Canonical calculations remain behind the I1–I3 parity gate; legacy execution is available only from the compatibility panel.</p>
        <ul class="hp-piping-class-list">
          <li>Class basis and product matrix will bind directly to v2 state.</li>
          <li>Cycles and external <span class="hp-piping-class-code">USER_CALCULATED_KD3</span> evidence remain review-only.</li>
          <li>Native CORE KD-3 remains blocked until the independent qualification programme is complete.</li>
        </ul>
      </section>
      <aside class="hp-piping-class-card">
        <h3>Project readiness</h3>
        <p><strong>Project:</strong> ${escapeHtml(summary.projectId)}</p>
        <p><strong>Revision:</strong> ${escapeHtml(summary.revision)}</p>
        <p><strong>Fatigue evidence packages:</strong> ${summary.fatigueCount}</p>
        ${topIssues.length ? `<ul class="hp-piping-class-list">${topIssues.map((item) => `<li><span class="hp-piping-class-code">${escapeHtml(item.path || 'project')}</span>: ${escapeHtml(item.message)}</li>`).join('')}</ul>` : '<p>v2 project schema is complete.</p>'}
        ${issues.length > topIssues.length ? `<p>+ ${issues.length - topIssues.length} additional setup item(s).</p>` : ''}
      </aside>
    </div>`;
}

function placeholderHtml(title, description) {
  return `
    <section class="hp-piping-class-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <div class="hp-piping-class-empty">I4 establishes native workspace ownership only. Data editors and calculation consumers are intentionally deferred until I1–I3 real-adapter parity is established.</div>
    </section>`;
}

function legacyHtml() {
  return `
    <section class="hp-piping-class-card">
      <h3>Legacy compatibility workspace</h3>
      <p>The previous engineering-library → authority-package → calculator chain is retained temporarily for comparison and reviewer continuity. It is lazy-loaded and no longer owns the HP Piping Class top-level surface.</p>
      <div class="hp-piping-class-legacy-actions">
        <button type="button" class="hp-piping-class-action is-primary" data-hp-load-legacy>Open legacy workspace</button>
        <span data-hp-legacy-status>Not loaded</span>
      </div>
      <div class="hp-piping-class-legacy-host" data-hp-legacy-host></div>
    </section>`;
}

function panelHtml(panelId, summary) {
  if (panelId === 'overview') return overviewHtml(summary);
  if (panelId === 'products') return placeholderHtml('Class Matrix', 'The native product matrix will consume v2 product identities and governed/direct calculation-basis state without DOM injection.');
  if (panelId === 'fatigue') return placeholderHtml('Cycles & Fatigue', 'The native cycle workspace will consume v2 transient state and USER_CALCULATED_KD3 evidence after parity promotion.');
  if (panelId === 'evidence') return placeholderHtml('Evidence', 'Qualification receipts, master custody and package lifecycle will be surfaced here as read-only authority evidence.');
  return legacyHtml();
}

function mountLegacyWorkspace(panel) {
  const host = panel.querySelector('[data-hp-legacy-host]');
  const status = panel.querySelector('[data-hp-legacy-status]');
  const button = panel.querySelector('[data-hp-load-legacy]');
  if (!host || host.querySelector('iframe')) return;
  const frame = document.createElement('iframe');
  frame.className = 'hp-piping-class-frame';
  frame.src = LEGACY_WORKSPACE_SRC;
  frame.title = 'HP Piping Class legacy compatibility workspace';
  frame.loading = 'lazy';
  frame.addEventListener('load', () => { if (status) status.textContent = 'Legacy workspace loaded'; }, { once: true });
  host.appendChild(frame);
  if (button) button.disabled = true;
  if (status) status.textContent = 'Loading legacy workspace…';
}

export function renderHpPipingClassTab(container, { context = null } = {}) {
  ensureStylesheet();
  const project = initialProject(context);
  const summary = projectSummary(project);
  let activePanel = initialPanel(context);

  container.innerHTML = `
    <div class="hp-piping-class-tab" data-hp-piping-class-native="true" data-project-schema="${HP_PIPING_CLASS_PROJECT_VERSION}">
      <div class="hp-piping-class-tab-header">
        <div>
          <h2>HP Piping Class</h2>
          <p>Native class-level workspace for B31.3 Chapter IX basis, product matrix, pressure-cycle fatigue evidence, and qualification readiness.</p>
        </div>
        <div class="hp-piping-class-authority" aria-label="HP Piping Class authority status">
          <span class="hp-piping-class-badge is-info">${escapeHtml(HP_PIPING_CLASS_AUTHORITY_POLICY.calculationMode)}</span>
          <span class="hp-piping-class-badge is-blocked">CORE KD-3 · NOT QUALIFIED</span>
          <span class="hp-piping-class-badge is-blocked">DESIGN AUTHORITY · FALSE</span>
        </div>
      </div>
      <div class="hp-piping-class-tabs" role="tablist" aria-label="HP Piping Class sections">
        ${PANELS.map((panel) => `<button type="button" class="hp-piping-class-tab-button" data-hp-panel="${panel.id}" role="tab">${escapeHtml(panel.label)}</button>`).join('')}
      </div>
      <div class="hp-piping-class-panel" data-hp-panel-host></div>
    </div>`;

  const panelHost = container.querySelector('[data-hp-panel-host]');

  function renderPanel(nextPanel) {
    activePanel = PANEL_IDS.has(nextPanel) ? nextPanel : 'overview';
    try { localStorage.setItem(STORAGE_KEY, activePanel); } catch {}
    container.querySelectorAll('[data-hp-panel]').forEach((button) => {
      const active = button.dataset.hpPanel === activePanel;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
    panelHost.innerHTML = panelHtml(activePanel, summary);
  }

  function onClick(event) {
    const panelButton = event.target.closest('[data-hp-panel]');
    if (panelButton) {
      renderPanel(panelButton.dataset.hpPanel);
      return;
    }
    if (event.target.closest('[data-hp-load-legacy]')) mountLegacyWorkspace(panelHost);
  }

  container.addEventListener('click', onClick);
  renderPanel(activePanel);

  return () => {
    container.removeEventListener('click', onClick);
    container.innerHTML = '';
  };
}

export {
  LEGACY_WORKSPACE_SRC,
  PANELS as HP_PIPING_CLASS_PANELS,
};
