import { _xmlCiiLineListKeys } from './xml-cii-adapted-preview-diagnostics-audit.js';
import { resolveBranchLineKeySuggestion } from './xml-cii-adapted-branch-line-map-panel.js';
import { xmlCiiEnrichedConfigFromState } from './xml-cii-adapted-state.js';
import { replaceModeAState } from './xml-cii-adapted-mode-a-state.js';
import {
  createModeASourceProcessingRef,
  modeAExecutionRows,
  modeARawRef,
  modeARawState,
} from './xml-cii-adapted-mode-a-propagation.js';
import {
  buildModeAPreviewFillPlan,
  buildModeAProjectDataMatchPlan,
  modeAPreviewFillRule,
} from './xml-cii-adapted-mode-a-bulk-preview.js';

const FIELD_COLUMNS = Object.freeze({
  material: 7,
  rating: 8,
  materialCode: 9,
  p1: 10,
  hydroPressure: 11,
  t1: 12,
  t2: 13,
  t3: 14,
  density: 15,
  wallThickness: 16,
  corrosion: 17,
});

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function parseSupportConfig(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function ensureObject(parent, key) {
  if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) parent[key] = {};
  return parent[key];
}

function setProcess(config, lineKey, field, value) {
  if (!text(lineKey)) return;
  const overrides = ensureObject(config, 'overrides');
  const processData = ensureObject(overrides, 'processData');
  const row = ensureObject(processData, lineKey);
  row[field] = value;
}

function applyFillChange(config, change) {
  const overrides = ensureObject(config, 'overrides');
  if (['p1', 'hydroPressure', 't1', 't2', 't3', 'density'].includes(change.field)) {
    setProcess(config, change.lineKey, change.field, change.value);
    return;
  }
  if (change.field === 'material') {
    ensureObject(overrides, 'material')[change.lineKey || change.branchName] = change.value;
    return;
  }
  if (change.field === 'rating') {
    ensureObject(overrides, 'rating')[change.ratingKey] = change.value;
    setProcess(config, change.lineKey, 'rating', change.value);
    return;
  }
  if (change.field === 'materialCode') {
    ensureObject(overrides, 'materialCode')[change.materialCodeKey] = change.value;
    return;
  }
  if (change.field === 'wallThickness') {
    ensureObject(overrides, 'wallThickness')[change.wallThicknessKey] = change.value;
    return;
  }
  if (change.field === 'corrosion') {
    ensureObject(overrides, 'corrosion')[change.corrosionKey] = change.value;
  }
}

function sourceSnapshots(stateRef, sourceIds) {
  return [...new Set(sourceIds)].map((sourceId) => {
    const ref = createModeASourceProcessingRef(stateRef, sourceId);
    return { sourceId, supportConfigJson: ref.current.supportConfigJson || '{}' };
  });
}

function persistSourceConfig(stateRef, sourceId, mutate) {
  const ref = createModeASourceProcessingRef(stateRef, sourceId);
  const current = ref.current;
  const config = parseSupportConfig(current.supportConfigJson);
  mutate(config);
  ref.current = {
    ...current,
    supportConfigJson: JSON.stringify(config, null, 2),
  };
}

function setUndo(stateRef, label, snapshots) {
  const rawRef = modeARawRef(stateRef);
  const current = modeARawState(rawRef);
  replaceModeAState(rawRef, {
    ...current,
    modeAConsolidatedPreviewUndo: { label, snapshots, createdAt: new Date().toISOString() },
  });
}

function restoreUndo(stateRef) {
  const raw = modeARawState(stateRef);
  const undo = raw.modeAConsolidatedPreviewUndo;
  if (!undo?.snapshots?.length) return false;
  for (const snapshot of undo.snapshots) {
    const ref = createModeASourceProcessingRef(stateRef, snapshot.sourceId);
    const current = ref.current;
    ref.current = {
      ...current,
      supportConfigJson: snapshot.supportConfigJson || '{}',
    };
  }
  const latest = modeARawState(stateRef);
  replaceModeAState(modeARawRef(stateRef), { ...latest, modeAConsolidatedPreviewUndo: null });
  return true;
}

function requestRebuild(panel) {
  const button = panel.querySelector('[data-mode-a-consolidated-build="preview"]');
  button?.click();
}

function applyFillPlan(panel, result, stateRef, sourceRow, field) {
  const plan = buildModeAPreviewFillPlan(result.rows || [], sourceRow, field);
  if (!plan.changes.length) return false;
  const message = `Fill ${field} = ${plan.value} to ${plan.changes.length} ${plan.rule?.label || 'similar'} row(s)?\n\nExisting exact/master/manual values will be kept.`;
  if (typeof confirm === 'function' && !confirm(message)) return false;
  const snapshots = sourceSnapshots(stateRef, plan.changes.map((row) => row.sourceId));
  const bySource = new Map();
  for (const change of plan.changes) {
    if (!bySource.has(change.sourceId)) bySource.set(change.sourceId, []);
    bySource.get(change.sourceId).push(change);
  }
  for (const [sourceId, changes] of bySource.entries()) {
    persistSourceConfig(stateRef, sourceId, (config) => changes.forEach((change) => applyFillChange(config, change)));
  }
  setUndo(stateRef, `Fill ${field} (${plan.rule?.label || 'similar'})`, snapshots);
  requestRebuild(panel);
  return true;
}

function projectLineKeys(stateRef) {
  const out = {};
  for (const { source, state } of modeAExecutionRows(stateRef)) {
    out[source.sourceId] = _xmlCiiLineListKeys(xmlCiiEnrichedConfigFromState(state));
  }
  return out;
}

function applyProjectPlan(panel, stateRef, plan) {
  if (!plan.changes.length) return false;
  const snapshots = sourceSnapshots(stateRef, plan.changes.map((row) => row.sourceId));
  const bySource = new Map();
  for (const change of plan.changes) {
    if (!bySource.has(change.sourceId)) bySource.set(change.sourceId, []);
    bySource.get(change.sourceId).push(change);
  }
  for (const [sourceId, changes] of bySource.entries()) {
    persistSourceConfig(stateRef, sourceId, (config) => {
      const linelist = ensureObject(config, 'linelist');
      const map = ensureObject(linelist, 'branchLineKeyMap');
      for (const change of changes) map[change.branchName] = change.lineKey;
    });
  }
  setUndo(stateRef, `Project Data match (${plan.changes.length} branches)`, snapshots);
  requestRebuild(panel);
  return true;
}

function styleSmallButton(button, primary = false) {
  Object.assign(button.style, {
    padding: '4px 8px',
    border: `1px solid ${primary ? '#2563eb' : '#475569'}`,
    borderRadius: '5px',
    background: primary ? '#1d4ed8' : '#172033',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '10px',
    whiteSpace: 'nowrap',
  });
}

function makeToolbar(panel, result, stateRef) {
  const toolbar = document.createElement('div');
  toolbar.dataset.modeAConsolidatedEasyToolbar = 'true';
  Object.assign(toolbar.style, {
    display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
    margin: '8px 0 10px', padding: '8px', border: '1px solid #334155', borderRadius: '7px', background: '#0f172a',
  });

  const match = document.createElement('button');
  match.type = 'button';
  match.textContent = '⚡ Match Project Data';
  styleSmallButton(match, true);
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.textContent = '↶ Undo Last Change';
  styleSmallButton(undo);
  undo.disabled = !modeARawState(stateRef).modeAConsolidatedPreviewUndo;

  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Search source / branch / line...';
  Object.assign(search.style, { minWidth: '220px', padding: '5px 8px', background: '#0b1220', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '5px' });

  const source = document.createElement('select');
  Object.assign(source.style, { padding: '5px 8px', background: '#0b1220', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '5px' });
  source.appendChild(new Option('All XML files', ''));
  [...new Map((result.rows || []).map((row) => [row.sourceId, row.fileName])).entries()].forEach(([id, name]) => source.appendChild(new Option(name, id)));

  const status = document.createElement('select');
  Object.assign(status.style, { padding: '5px 8px', background: '#0b1220', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '5px' });
  [['all','All rows'], ['unmapped','Unmapped'], ['defaults','Defaults / gaps'], ['mapped','Mapped']].forEach(([value,label]) => status.appendChild(new Option(label, value)));

  const note = document.createElement('span');
  note.className = 'xml-cii-phase-help';
  note.style.marginLeft = 'auto';
  note.textContent = '↓ appears only where similar unresolved/default rows can be filled safely.';

  toolbar.append(match, undo, search, source, status, note);
  panel.querySelector('[data-mode-a-consolidated-build="preview"]')?.closest('div')?.after(toolbar);

  const tableRows = [...panel.querySelectorAll('[data-mode-a-preview-consolidated-row]')];
  const applyFilter = () => {
    const q = text(search.value).toLowerCase();
    for (const tr of tableRows) {
      const rowStatus = tr.dataset.rowStatus;
      const defaultHit = tr.dataset.hasDefault === 'true';
      const statusMatch = status.value === 'all'
        || status.value === rowStatus
        || (status.value === 'defaults' && defaultHit);
      const sourceMatch = !source.value || source.value === tr.dataset.sourceId;
      const searchMatch = !q || (tr.dataset.searchText || '').includes(q);
      tr.style.display = statusMatch && sourceMatch && searchMatch ? '' : 'none';
    }
  };
  search.addEventListener('input', applyFilter);
  source.addEventListener('change', applyFilter);
  status.addEventListener('change', applyFilter);

  undo.addEventListener('click', () => {
    if (!restoreUndo(stateRef)) return;
    requestRebuild(panel);
  });

  match.addEventListener('click', () => {
    toolbar.querySelectorAll('[data-project-match-preview], [data-project-match-apply]').forEach((node) => node.remove());
    const plan = buildModeAProjectDataMatchPlan(result.rows || [], projectLineKeys(stateRef), resolveBranchLineKeySuggestion);
    const preview = document.createElement('span');
    preview.dataset.projectMatchPreview = 'true';
    preview.className = 'xml-cii-phase-help';
    preview.textContent = `${plan.changes.length} safe exact mapping(s) · ${plan.ambiguous.length} ambiguous · ${plan.unmatched.length} unmatched.`;
    toolbar.appendChild(preview);
    if (plan.changes.length) {
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.dataset.projectMatchApply = 'true';
      apply.textContent = `Apply ${plan.changes.length} Safe Matches`;
      styleSmallButton(apply, true);
      apply.addEventListener('click', () => applyProjectPlan(panel, stateRef, plan));
      toolbar.appendChild(apply);
    }
  });
}

export function installModeAConsolidatedPreviewEasyUi(panel, result, stateRef) {
  const body = panel?.querySelector('[data-mode-a-preview-consolidated-body]');
  if (!body || !Array.isArray(result?.rows)) return false;
  const trs = [...body.querySelectorAll('tr')];
  result.rows.forEach((row, index) => {
    const tr = trs[index];
    if (!tr) return;
    tr.dataset.modeAPreviewConsolidatedRow = 'true';
    tr.dataset.sourceId = row.sourceId || '';
    tr.dataset.rowStatus = row.lineMiss ? 'unmapped' : 'mapped';
    tr.dataset.hasDefault = ['p1','hydroPressure','t1','t2','t3','density','wallThickness','corrosion']
      .some((field) => /default/i.test(text(row?.[`${field}Source`])) ) ? 'true' : 'false';
    tr.dataset.searchText = [row.fileName, row.branchName, row.lineKey, row.pipingClass].map((value) => text(value).toLowerCase()).join(' ');

    for (const [field, columnIndex] of Object.entries(FIELD_COLUMNS)) {
      const plan = buildModeAPreviewFillPlan(result.rows, row, field);
      if (!plan.changes.length || !modeAPreviewFillRule(field)) continue;
      const cell = tr.children[columnIndex];
      if (!cell) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '↓';
      button.title = `Fill ${plan.changes.length} ${plan.rule.label} unresolved/default row(s) with ${plan.value}. Exact/master/manual values are kept.`;
      styleSmallButton(button);
      button.style.marginLeft = '5px';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        applyFillPlan(panel, result, stateRef, row, field);
      });
      cell.appendChild(button);
    }
  });
  makeToolbar(panel, result, stateRef);
  return true;
}
