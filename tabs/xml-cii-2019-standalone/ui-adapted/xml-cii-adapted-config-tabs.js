import { createElement } from './xml-cii-adapted-dom.js';
import { saveMasterContextToLocalStorage } from './xml-cii-adapted-state.js';
import { renderAdaptedConfigPanel as renderGeneralConfigPanel } from './xml-cii-adapted-config.js';

const CONFIG_TABS = Object.freeze([
  { id: 'general', label: 'General' },
  { id: 'autoMapFields', label: 'Auto Map Fields' },
]);

const AUTO_MAP_FIELD_DEFAULTS = Object.freeze([
  { name: 'lineSeqNo', label: 'Line Seq No.', enabled: true, priority: 90, exact: ['Line Seq No.', 'Sequence', 'Seq'], aliases: ['Line Sequence', 'Line Serial', 'Serial', 'Index'], stacked: ['Seq', 'Sequence'], valueFallback: ['simple running sequence', 'serial-like values'], reject: ['Line Number', 'Line No', 'Key 2'], policy: 'Prefer blank unless a clear sequence column exists.' },
  { name: 'lineKey1', label: 'Key 1', enabled: true, priority: 80, exact: ['Key 1', 'Line Key', 'Service'], aliases: ['Area', 'Unit', 'Service Code', 'Line Prefix', 'Pipeline Ref'], stacked: ['Service', 'Key 1'], valueFallback: ['short alphabetic service token'], reject: ['Pressure', 'Temp', 'Density', 'Rating', 'Bore', 'Material'], policy: 'Map when service / prefix evidence exists.' },
  { name: 'lineKey2', label: 'Key 2', enabled: true, priority: 85, exact: ['Key 2', 'Line Number', 'Line No', 'Line No.'], aliases: ['LineNumber', 'Line ID', 'Line Suffix', 'Pipeline Number'], stacked: ['Line Number', 'Line No'], valueFallback: ['5-10 digit line number'], reject: ['Piping Class', 'Construction Class', 'Rating', 'Pressure', 'Density'], policy: 'Prefer Key 2 over Line Seq No. when label says Line Number.' },
  { name: 'pipingClass', label: 'Piping Class', enabled: true, priority: 75, exact: ['Piping Class', 'Pipe Class'], aliases: ['Piping Spec', 'Pipe Spec', 'Spec', 'SPEC', 'Class'], stacked: ['Piping Class', 'Pipe Class', 'Spec'], valueFallback: ['short spec token only with safe context'], reject: ['Construction Class', 'Insulation Class', 'Stress Class', 'Criticality Class', 'Material', 'Rating'], policy: 'Leave blank if only weak token such as CS exists.' },
  { name: 'rating', label: 'Rating', enabled: true, priority: 70, exact: ['Rating', 'Pressure Class'], aliases: ['Class Rating', 'Pressure Rating', 'Press Rating', 'CL', 'PN'], stacked: ['Rating', 'Pressure Class'], valueFallback: ['150', '300', '600', '900', '1500', '2500', 'CL150', 'PN16'], reject: ['Design Pressure', 'Hydro Pressure', 'Line Number', 'Piping Class'], policy: 'Do not infer rating from large line numbers such as 1885.' },
  { name: 'material', label: 'Material', enabled: true, priority: 65, exact: ['Material', 'Material Name'], aliases: ['MOC', 'Pipe Material', 'Material_Name', 'MATL'], stacked: ['Material', 'MOC'], valueFallback: ['CS', 'SS', 'A106 B', 'LTCS'], reject: ['Piping Class', 'Rating', 'Phase', 'Service'], policy: 'CS is a material candidate before it is a piping-class candidate.' },
  { name: 'convertedBore', label: 'Bore', enabled: true, priority: 95, exact: ['Bore', 'Converted Bore'], aliases: ['Size', 'NPS', 'DN', 'NB', 'Nominal Bore', 'Pipe Size'], stacked: ['Bore', 'Size', 'DN', 'NPS', 'NB'], valueFallback: ['10"', '4IN', 'NPS10', 'DN250', 'OD-to-NPS lookup'], reject: ['Rating', 'Pressure', 'Temperature', 'Density'], policy: 'Strong bore mapping; also feeds piping-class active set filtering.' },
  { name: 'p1', label: 'P1 / Design Pressure', enabled: true, priority: 60, exact: ['P1', 'Design Pressure'], aliases: ['Operating Pressure', 'Pressure Max', 'Max Pressure', 'Design Pr', 'Op. Pr'], stacked: ['P1', 'Design Pressure'], valueFallback: ['numeric pressure-like values'], reject: ['Hydro', 'Test Pressure', 'Temperature', 'Density', 'Line Number'], policy: 'P1 must not consume a hydro/test-pressure column.' },
  { name: 'hydroPressure', label: 'Hydro Test Pressure', enabled: true, priority: 62, exact: ['Hydro Test Pressure', 'Hydro Pressure'], aliases: ['Hydrostatic Pressure', 'Hydro Pr', 'Test Pressure', 'Proof Pressure', 'Pressure Test'], stacked: ['Hydro', 'Test Pressure'], valueFallback: ['numeric pressure-like values with hydro/test label'], reject: ['Design Pressure', 'Temperature', 'Density'], policy: 'Hydro/Test label wins over generic pressure.' },
  { name: 't1', label: 'T1', enabled: true, priority: 55, exact: ['T1', 'Design Temp'], aliases: ['Design Temperature', 'Operating Temp', 'Temp Max', 'Max Temp', 'T1 (C)'], stacked: ['T1', 'Design Temp', 'Max Temp'], valueFallback: ['temperature range -200 to 800'], reject: ['Min', 'T3', 'Pressure', 'Hydro', 'Density'], policy: 'T1 is design / maximum temperature.' },
  { name: 't2', label: 'T2', enabled: true, priority: 50, exact: ['T2', 'Temperature'], aliases: ['Temp', 'Operating Temperature', 'Normal Temp', 'Temp C', 'T2 (C)'], stacked: ['T2', 'Temperature'], valueFallback: ['temperature range -200 to 800'], reject: ['Max', 'Min', 'T1', 'T3', 'Pressure', 'Density'], policy: 'T2 is operating / normal temperature.' },
  { name: 't3', label: 'T3', enabled: true, priority: 55, exact: ['T3', 'Minimum Temp'], aliases: ['Min Temp', 'Temp Min', 'Temperature Min', 'T3 (C)'], stacked: ['T3', 'Minimum Temp', 'Min Temp'], valueFallback: ['temperature range -200 to 800'], reject: ['Max', 'T1', 'Pressure', 'Hydro', 'Density'], policy: 'T3 is minimum temperature.' },
  { name: 'insThk', label: 'InsThk', enabled: true, priority: 45, exact: ['InsThk', 'Insulation Thickness'], aliases: ['Ins Thk', 'Insulation', 'Insulation Thk'], stacked: ['Ins + Thk', 'Insulation + Thickness'], valueFallback: ['numeric insulation thickness'], reject: ['Insulation Material', 'Insulation Type', 'Insulation Class'], policy: 'Require thickness context when only Insulation appears.' },
  { name: 'density', label: 'Density', enabled: true, priority: 35, exact: ['Density', 'Fluid Density'], aliases: ['Density kg/m3', 'Density kg/m³'], stacked: ['Generic Density'], valueFallback: ['numeric density-like values'], reject: ['Density Mixed', 'Density Gas', 'Density Liquid'], policy: 'Prefer blank when Mixed/Gas/Liquid density fields are mapped.' },
  { name: 'densityMixed', label: 'Density Mixed', enabled: true, priority: 68, exact: ['Density Mixed', 'Mixed Density'], aliases: ['Mixed kg/m3', 'Mixed kg/m³', 'Density (Mixed)'], stacked: ['Mixed + kg/m³'], valueFallback: ['numeric density values'], reject: ['Gas', 'Liquid'], policy: 'Map before generic Density.' },
  { name: 'densityGas', label: 'Density Gas', enabled: true, priority: 68, exact: ['Density Gas', 'Gas Density'], aliases: ['Gas kg/m3', 'Gas kg/m³', 'Density (Gas)'], stacked: ['Density + Gas + kg/m³'], valueFallback: ['numeric density values'], reject: ['Mixed', 'Liquid'], policy: 'Map before generic Density.' },
  { name: 'densityLiquid', label: 'Density Liquid', enabled: true, priority: 68, exact: ['Density Liquid', 'Liquid Density'], aliases: ['Liquid kg/m3', 'Liquid kg/m³', 'Density (Liquid)'], stacked: ['Liquid + kg/m³'], valueFallback: ['numeric density values'], reject: ['Mixed', 'Gas'], policy: 'Map before generic Density.' },
  { name: 'phase', label: 'Phase', enabled: true, priority: 66, exact: ['Phase'], aliases: ['Fluid Phase', 'Medium Phase', 'Process Phase'], stacked: ['Phase + G/L/M'], valueFallback: ['G', 'L', 'M', 'Gas', 'Liquid', 'Mixed', 'Vapour', 'Vapor'], reject: ['Density', 'Service', 'Material'], policy: 'Phase supports density resolution.' },
  { name: 'from', label: 'From', enabled: true, priority: 70, exact: ['From'], aliases: ['From Equipment', 'Origin', 'Source'], stacked: ['exact stacked label cell = From'], valueFallback: [], reject: ['substring from inside description text'], policy: 'Safe exact-label top-up only.' },
  { name: 'to', label: 'To', enabled: true, priority: 70, exact: ['To'], aliases: ['To Equipment', 'Destination', 'Target'], stacked: ['exact stacked label cell = To'], valueFallback: [], reject: ['substring to inside description text'], policy: 'Safe exact-label top-up only.' },
]);

function safeArray(value) { return Array.isArray(value) ? value.map((item) => String(item ?? '').trim()).filter(Boolean) : []; }
function parseCsvList(text) { return String(text ?? '').split(',').map((item) => item.trim()).filter(Boolean); }
function stringifyList(value) { return safeArray(value).join(', '); }
function cloneDefaultField(field) { return { enabled: field.enabled !== false, priority: Number(field.priority || 0), exact: safeArray(field.exact), aliases: safeArray(field.aliases), stacked: safeArray(field.stacked), valueFallback: safeArray(field.valueFallback), reject: safeArray(field.reject), policy: String(field.policy || '') }; }

function ensureStandaloneAutoMapConfig(configObj) {
  const existing = configObj.standaloneAutoMap && typeof configObj.standaloneAutoMap === 'object' ? configObj.standaloneAutoMap : {};
  const fields = existing.fields && typeof existing.fields === 'object' ? existing.fields : {};
  const nextFields = {};
  for (const def of AUTO_MAP_FIELD_DEFAULTS) nextFields[def.name] = { ...cloneDefaultField(def), ...(fields[def.name] || {}) };
  configObj.standaloneAutoMap = {
    enabled: existing.enabled !== false,
    approvalLog: existing.approvalLog !== false,
    manualSavedMappingWins: existing.manualSavedMappingWins !== false,
    applyTopUpPolicyAfterExistingLogic: existing.applyTopUpPolicyAfterExistingLogic !== false,
    fields: nextFields,
  };
  return configObj.standaloneAutoMap;
}

function cardShell(title, helpText = '') {
  const card = createElement('section');
  card.style.cssText = 'background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px 16px;margin-bottom:14px;';
  const h3 = createElement('h3', title);
  h3.style.cssText = 'margin:0 0 8px;font-size:14px;color:#38bdf8;';
  card.appendChild(h3);
  if (helpText) {
    const help = createElement('p', helpText, 'xml-cii-phase-help');
    help.style.margin = '0 0 10px 0';
    card.appendChild(help);
  }
  return card;
}

function makeCheckbox(parent, labelText, checked, onChange) {
  const label = createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 14px 8px 0;font-size:12px;color:#cbd5e1;cursor:pointer;';
  const input = createElement('input');
  input.type = 'checkbox';
  input.checked = !!checked;
  input.addEventListener('change', (event) => onChange(!!event.target.checked));
  label.append(input, document.createTextNode(labelText));
  parent.appendChild(label);
  return input;
}

function saveConfig(stateRef, configObj, render) {
  const fullConfigJson = JSON.stringify(configObj, null, 2);
  stateRef.current = { ...stateRef.current, supportConfigJson: fullConfigJson, masterContext: { ...(stateRef.current.masterContext || {}), config: configObj } };
  saveMasterContextToLocalStorage(stateRef.current.masterContext);
  render();
}

function renderTabRail(card, stateRef, render) {
  const active = stateRef.current.configActiveSubTabId || 'general';
  const rail = createElement('nav', '', 'xml-cii-sub-nav-rail');
  rail.style.marginBottom = '12px';
  for (const tab of CONFIG_TABS) {
    const button = createElement('button', tab.label, 'xml-cii-sub-phase-pill');
    button.type = 'button';
    button.classList.toggle('is-active', active === tab.id);
    button.addEventListener('click', () => {
      stateRef.current = { ...stateRef.current, configActiveSubTabId: tab.id };
      render();
    });
    rail.appendChild(button);
  }
  card.appendChild(rail);
  return active;
}

function renderGlobalAutoMapControls(card, cfg, onDirty) {
  const controls = createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
  makeCheckbox(controls, 'Enable standalone Auto Map top-up policy', cfg.enabled !== false, (val) => { cfg.enabled = val; onDirty(); });
  makeCheckbox(controls, 'Show approval / priority log', cfg.approvalLog !== false, (val) => { cfg.approvalLog = val; onDirty(); });
  makeCheckbox(controls, 'Manual / saved mapping wins', cfg.manualSavedMappingWins !== false, (val) => { cfg.manualSavedMappingWins = val; onDirty(); });
  makeCheckbox(controls, 'Run top-up after existing detector/fuzzy logic', cfg.applyTopUpPolicyAfterExistingLogic !== false, (val) => { cfg.applyTopUpPolicyAfterExistingLogic = val; onDirty(); });
  card.appendChild(controls);
}

function fieldCellInput(value, onChange, width = '100%') {
  const input = createElement('input');
  input.type = 'text';
  input.value = value ?? '';
  input.style.cssText = `width:${width};box-sizing:border-box;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:4px;padding:4px;font-size:11px;`;
  input.addEventListener('change', (event) => onChange(event.target.value));
  return input;
}

function renderAutoMapMatrix(card, cfg, onDirty) {
  const wrap = createElement('div');
  wrap.style.cssText = 'max-height:560px;overflow:auto;border:1px solid rgba(148,163,184,.18);border-radius:8px;';
  const table = createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;min-width:1320px;';
  const thead = createElement('thead');
  const headRow = createElement('tr');
  for (const label of ['Field', 'On', 'Priority', 'Exact keywords', 'Alias / OR keywords', 'Stacked label logic', 'Value fallback', 'Reject / AND NOT', 'Top-up policy']) {
    const th = createElement('th', label);
    th.style.cssText = 'position:sticky;top:0;background:#0f172a;color:#bfdbfe;text-align:left;padding:6px;border-bottom:1px solid #334155;z-index:1;';
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = createElement('tbody');
  for (const def of AUTO_MAP_FIELD_DEFAULTS) {
    const rowCfg = cfg.fields[def.name] || (cfg.fields[def.name] = cloneDefaultField(def));
    const tr = createElement('tr');
    const tdField = createElement('td', def.label);
    tdField.style.cssText = 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);font-weight:700;color:#e2e8f0;white-space:nowrap;';
    tr.appendChild(tdField);
    const tdEnabled = createElement('td');
    tdEnabled.style.cssText = 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);text-align:center;';
    const cb = createElement('input');
    cb.type = 'checkbox';
    cb.checked = rowCfg.enabled !== false;
    cb.addEventListener('change', (event) => { rowCfg.enabled = !!event.target.checked; onDirty(); });
    tdEnabled.appendChild(cb);
    tr.appendChild(tdEnabled);
    const tdPriority = createElement('td');
    tdPriority.style.cssText = 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);';
    const pr = createElement('input');
    pr.type = 'number';
    pr.value = Number(rowCfg.priority || 0);
    pr.style.cssText = 'width:64px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:4px;padding:4px;font-size:11px;';
    pr.addEventListener('change', (event) => { rowCfg.priority = Number(event.target.value) || 0; onDirty(); });
    tdPriority.appendChild(pr);
    tr.appendChild(tdPriority);
    for (const key of ['exact', 'aliases', 'stacked', 'valueFallback', 'reject']) {
      const td = createElement('td');
      td.style.cssText = 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);';
      td.appendChild(fieldCellInput(stringifyList(rowCfg[key]), (val) => { rowCfg[key] = parseCsvList(val); onDirty(); }));
      tr.appendChild(td);
    }
    const tdPolicy = createElement('td');
    tdPolicy.style.cssText = 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);min-width:230px;';
    tdPolicy.appendChild(fieldCellInput(rowCfg.policy || '', (val) => { rowCfg.policy = val; onDirty(); }));
    tr.appendChild(tdPolicy);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  card.appendChild(wrap);
}

function renderApprovalPreview(card) {
  const preview = cardShell('Approval / priority output preview', 'This preview defines what the Auto Map Fields action should report after old detector/fuzzy logic runs.');
  const rows = [
    ['Line Seq No.', 'blank unless exact sequence evidence exists', 'Top-up policy after existing detector'],
    ['Key 1', 'service / area / line-key prefix candidate', 'Exact / stacked Service evidence'],
    ['Key 2', 'line number candidate', 'Line Number wins over Line Seq No.'],
    ['Density', 'blank when Mixed/Gas/Liquid density fields are mapped', 'Specific density fields win'],
    ['From', 'exact-label From only', 'No substring fallback'],
    ['To', 'exact-label To only', 'No substring fallback'],
  ];
  const table = createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
  const body = createElement('tbody');
  for (const row of rows) {
    const tr = createElement('tr');
    for (const col of row) {
      const td = createElement('td', col);
      td.style.cssText = 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);color:#cbd5e1;';
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  table.appendChild(body);
  preview.appendChild(table);
  card.appendChild(preview);
}

function renderAutoMapFieldsTab(card, stateRef, render) {
  const configObj = (() => { try { return JSON.parse(stateRef.current.supportConfigJson || '{}') || {}; } catch { return {}; } })();
  const cfg = ensureStandaloneAutoMapConfig(configObj);
  const top = cardShell('🧠 Auto Map Fields Policy', 'Configurable field-wise keyword matrix. This is a top-up policy layer: existing XML→CII detector and dynamic fuzzy mapper remain the baseline.');
  const status = createElement('span', '', 'xml-cii-phase-help');
  const markDirty = () => { status.textContent = 'Unsaved Auto Map Fields policy changes.'; status.style.color = '#fde047'; };
  renderGlobalAutoMapControls(top, cfg, markDirty);
  renderAutoMapMatrix(top, cfg, markDirty);
  const toolbar = createElement('div');
  toolbar.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px;';
  const save = createElement('button', '💾 Save Auto Map Policy');
  save.type = 'button';
  save.style.cssText = 'background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;';
  const reset = createElement('button', '↩ Restore Defaults');
  reset.type = 'button';
  reset.style.cssText = 'background:#27272a;color:#fff;border:1px solid #3f3f46;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;';
  save.addEventListener('click', () => saveConfig(stateRef, configObj, render));
  reset.addEventListener('click', () => { configObj.standaloneAutoMap = {}; ensureStandaloneAutoMapConfig(configObj); saveConfig(stateRef, configObj, render); });
  toolbar.append(save, reset, status);
  top.appendChild(toolbar);
  card.appendChild(top);
  renderApprovalPreview(card);
}

export function renderAdaptedConfigPanel(card, stateRef, render) {
  const active = renderTabRail(card, stateRef, render);
  if (active === 'autoMapFields') {
    renderAutoMapFieldsTab(card, stateRef, render);
    return;
  }
  renderGeneralConfigPanel(card, stateRef, render);
}
