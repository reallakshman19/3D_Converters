import { createElement } from './xml-cii-adapted-dom.js';
import { saveMasterContextToLocalStorage } from './xml-cii-adapted-state.js';
import { renderAdaptedConfigPanel as renderGeneralConfigPanel } from './xml-cii-adapted-config.js';

const CONFIG_TABS = Object.freeze([
  { id: 'general', label: 'General' },
  { id: 'autoMapFields', label: 'Auto Map Fields' },
  { id: 'pipingClassActiveSet', label: 'Piping Class Active Set' },
]);

const FIELD_ROWS = Object.freeze([
  ['lineSeqNo', 'Line Seq No.', 90, ['Line Seq No.', 'Sequence', 'Seq'], ['Line Sequence', 'Line Serial', 'Serial', 'Index'], ['Seq', 'Sequence'], ['simple running sequence', 'serial-like values'], ['Line Number', 'Line No', 'Key 2'], 'Prefer blank unless a clear sequence column exists.'],
  ['lineKey1', 'Key 1', 80, ['Key 1', 'Line Key', 'Service'], ['Area', 'Unit', 'Service Code', 'Line Prefix', 'Pipeline Ref'], ['Service', 'Key 1'], ['short alphabetic service token'], ['Pressure', 'Temp', 'Density', 'Rating', 'Bore', 'Material'], 'Map when service / prefix evidence exists.'],
  ['lineKey2', 'Key 2', 85, ['Key 2', 'Line Number', 'Line No', 'Line No.'], ['LineNumber', 'Line ID', 'Line Suffix', 'Pipeline Number'], ['Line Number', 'Line No'], ['5-10 digit line number'], ['Piping Class', 'Construction Class', 'Rating', 'Pressure', 'Density'], 'Prefer Key 2 over Line Seq No. when label says Line Number.'],
  ['pipingClass', 'Piping Class', 75, ['Piping Class', 'Pipe Class'], ['Piping Spec', 'Pipe Spec', 'Spec', 'SPEC', 'Class'], ['Piping Class', 'Pipe Class', 'Spec'], ['short spec token only with safe context'], ['Construction Class', 'Insulation Class', 'Stress Class', 'Criticality Class', 'Material', 'Rating'], 'Leave blank if only weak token such as CS exists.'],
  ['rating', 'Rating', 70, ['Rating', 'Pressure Class'], ['Class Rating', 'Pressure Rating', 'Press Rating', 'CL', 'PN'], ['Rating', 'Pressure Class'], ['150', '300', '600', '900', '1500', '2500', 'CL150', 'PN16'], ['Design Pressure', 'Hydro Pressure', 'Line Number', 'Piping Class'], 'Do not infer rating from large line numbers such as 1885.'],
  ['material', 'Material', 65, ['Material', 'Material Name'], ['MOC', 'Pipe Material', 'Material_Name', 'MATL'], ['Material', 'MOC'], ['CS', 'SS', 'A106 B', 'LTCS'], ['Piping Class', 'Rating', 'Phase', 'Service'], 'CS is a material candidate before it is a piping-class candidate.'],
  ['convertedBore', 'Bore', 95, ['Bore', 'Converted Bore'], ['Size', 'NPS', 'DN', 'NB', 'Nominal Bore', 'Pipe Size'], ['Bore', 'Size', 'DN', 'NPS', 'NB'], ['10"', '4IN', 'NPS10', 'DN250', 'OD-to-NPS lookup'], ['Rating', 'Pressure', 'Temperature', 'Density'], 'Strong bore mapping; also feeds piping-class active set filtering.'],
  ['p1', 'P1 / Design Pressure', 60, ['P1', 'Design Pressure'], ['Operating Pressure', 'Pressure Max', 'Max Pressure', 'Design Pr', 'Op. Pr'], ['P1', 'Design Pressure'], ['numeric pressure-like values'], ['Hydro', 'Test Pressure', 'Temperature', 'Density', 'Line Number'], 'P1 must not consume a hydro/test-pressure column.'],
  ['hydroPressure', 'Hydro Test Pressure', 62, ['Hydro Test Pressure', 'Hydro Pressure'], ['Hydrostatic Pressure', 'Hydro Pr', 'Test Pressure', 'Proof Pressure', 'Pressure Test'], ['Hydro', 'Test Pressure'], ['numeric pressure-like values with hydro/test label'], ['Design Pressure', 'Temperature', 'Density'], 'Hydro/Test label wins over generic pressure.'],
  ['t1', 'T1', 55, ['T1', 'Design Temp'], ['Design Temperature', 'Operating Temp', 'Temp Max', 'Max Temp', 'T1 (C)'], ['T1', 'Design Temp', 'Max Temp'], ['temperature range -200 to 800'], ['Min', 'T3', 'Pressure', 'Hydro', 'Density'], 'T1 is design / maximum temperature.'],
  ['t2', 'T2', 50, ['T2', 'Temperature'], ['Temp', 'Operating Temperature', 'Normal Temp', 'Temp C', 'T2 (C)'], ['T2', 'Temperature'], ['temperature range -200 to 800'], ['Max', 'Min', 'T1', 'T3', 'Pressure', 'Density'], 'T2 is operating / normal temperature.'],
  ['t3', 'T3', 55, ['T3', 'Minimum Temp'], ['Min Temp', 'Temp Min', 'Temperature Min', 'T3 (C)'], ['T3', 'Minimum Temp', 'Min Temp'], ['temperature range -200 to 800'], ['Max', 'T1', 'Pressure', 'Hydro', 'Density'], 'T3 is minimum temperature.'],
  ['insThk', 'InsThk', 45, ['InsThk', 'Insulation Thickness'], ['Ins Thk', 'Insulation', 'Insulation Thk'], ['Ins + Thk', 'Insulation + Thickness'], ['numeric insulation thickness'], ['Insulation Material', 'Insulation Type', 'Insulation Class'], 'Require thickness context when only Insulation appears.'],
  ['density', 'Density', 35, ['Density', 'Fluid Density'], ['Density kg/m3', 'Density kg/m³'], ['Generic Density'], ['numeric density-like values'], ['Density Mixed', 'Density Gas', 'Density Liquid'], 'Prefer blank when Mixed/Gas/Liquid density fields are mapped.'],
  ['densityMixed', 'Density Mixed', 68, ['Density Mixed', 'Mixed Density'], ['Mixed kg/m3', 'Mixed kg/m³', 'Density (Mixed)'], ['Mixed + kg/m³'], ['numeric density values'], ['Gas', 'Liquid'], 'Map before generic Density.'],
  ['densityGas', 'Density Gas', 68, ['Density Gas', 'Gas Density'], ['Gas kg/m3', 'Gas kg/m³', 'Density (Gas)'], ['Density + Gas + kg/m³'], ['numeric density values'], ['Mixed', 'Liquid'], 'Map before generic Density.'],
  ['densityLiquid', 'Density Liquid', 68, ['Density Liquid', 'Liquid Density'], ['Liquid kg/m3', 'Liquid kg/m³', 'Density (Liquid)'], ['Liquid + kg/m³'], ['numeric density values'], ['Mixed', 'Gas'], 'Map before generic Density.'],
  ['phase', 'Phase', 66, ['Phase'], ['Fluid Phase', 'Medium Phase', 'Process Phase'], ['Phase + G/L/M'], ['G', 'L', 'M', 'Gas', 'Liquid', 'Mixed', 'Vapour', 'Vapor'], ['Density', 'Service', 'Material'], 'Phase supports density resolution.'],
  ['from', 'From', 70, ['From'], ['From Equipment', 'Origin', 'Source'], ['exact stacked label cell = From'], [], ['substring from inside description text'], 'Safe exact-label top-up only.'],
  ['to', 'To', 70, ['To'], ['To Equipment', 'Destination', 'Target'], ['exact stacked label cell = To'], [], ['substring to inside description text'], 'Safe exact-label top-up only.'],
]);

const AUTO_MAP_FIELD_DEFAULTS = Object.freeze(FIELD_ROWS.map(([name, label, priority, exact, aliases, stacked, valueFallback, reject, policy]) => ({
  name, label, enabled: true, priority, exact, aliases, stacked, valueFallback, reject, policy,
})));

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

function ensurePipingClassActiveSetConfig(configObj) {
  const existing = configObj.pipingClassActiveSet && typeof configObj.pipingClassActiveSet === 'object' ? configObj.pipingClassActiveSet : {};
  configObj.pipingClassActiveSet = {
    enabled: existing.enabled !== false,
    mode: 'bore-only',
    source: existing.source || 'loaded-xml',
    fallbackToFullMasterWhenNoBoreDetected: existing.fallbackToFullMasterWhenNoBoreDetected !== false,
    previewLimit: Number(existing.previewLimit || 150),
    normalizedBoreFieldCandidates: safeArray(existing.normalizedBoreFieldCandidates).length
      ? safeArray(existing.normalizedBoreFieldCandidates)
      : ['convertedBore', 'bore', 'nps', 'dn', 'size', 'outsideDiameter', 'DIAMETER'],
  };
  return configObj.pipingClassActiveSet;
}

function configFromState(stateRef) { try { return JSON.parse(stateRef.current.supportConfigJson || '{}') || {}; } catch { return {}; } }

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

function detectBoreTokensFromSource(sourceText) {
  const source = String(sourceText || '');
  if (!source.trim()) return [];
  const found = new Set();
  const patterns = [
    /\b(?:BORE|NPS|DN|SIZE)\s*=\s*"([^"]+)"/gi,
    /\bDIAMETER\s*=\s*"([^"]+)"/gi,
    /<\s*(?:BORE|NPS|DN|SIZE|DIAMETER)\s*>\s*([^<]+?)\s*<\s*\//gi,
    /\b(?:NPS|DN)\s*([0-9]+(?:\.[0-9]+)?)/gi,
    /\b([0-9]+(?:\.[0-9]+)?)\s*"/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) && found.size < 80) {
      const value = String(match[1] || '').trim();
      if (value) found.add(value);
    }
  }
  return Array.from(found).slice(0, 40);
}

function renderAutoMapFieldsTab(card, stateRef, render) {
  const configObj = configFromState(stateRef);
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

function renderPipingClassActiveSetTab(card, stateRef, render) {
  const configObj = configFromState(stateRef);
  const cfg = ensurePipingClassActiveSetConfig(configObj);
  const masterRows = Number(stateRef.current.masterContext?.rowCounts?.pipingClass || 0);
  const detectedBores = detectBoreTokensFromSource(stateRef.current.sourceText);
  const panel = cardShell('🪈 Piping Class Active Set — Bore only', 'The full piping-class master remains a passive catalogue. The active set uses only rows whose normalized master bore matches bore evidence detected from the loaded XML/InputXML.');
  const metrics = createElement('div');
  metrics.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:12px;';
  const metric = (label, value) => {
    const item = createElement('div');
    item.style.cssText = 'background:#0f172a;border:1px solid rgba(148,163,184,.18);border-radius:6px;padding:8px;';
    item.append(createElement('span', label), createElement('strong', String(value ?? '0')));
    item.firstChild.style.cssText = 'display:block;color:#94a3b8;font-size:11px;';
    item.lastChild.style.cssText = 'display:block;color:#e2e8f0;font-size:15px;margin-top:4px;';
    metrics.appendChild(item);
  };
  metric('Full master rows indexed', masterRows);
  metric('Detected XML bore tokens', detectedBores.length);
  metric('Filter mode', 'Bore only');
  metric('Fallback', cfg.fallbackToFullMasterWhenNoBoreDetected ? 'Full master if no bore' : 'No fallback');
  panel.appendChild(metrics);

  const controls = createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;';
  makeCheckbox(controls, 'Enable piping-class active set', cfg.enabled !== false, (val) => { cfg.enabled = val; });
  makeCheckbox(controls, 'Fallback to full master when no bore is detected', cfg.fallbackToFullMasterWhenNoBoreDetected !== false, (val) => { cfg.fallbackToFullMasterWhenNoBoreDetected = val; });
  panel.appendChild(controls);

  const modeRow = createElement('div');
  modeRow.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-bottom:12px;';
  const modeBox = cardShell('Strategy', 'Class/spec/component filters are intentionally disabled for now.');
  modeBox.style.marginBottom = '0';
  modeBox.appendChild(createElement('div', 'Mode: Bore only', 'xml-cii-phase-help'));
  modeBox.appendChild(createElement('div', 'Active rows = master rows where normalized master bore ∈ normalized XML bores.', 'xml-cii-phase-help'));
  const boreBox = cardShell('Bore field candidates', 'Comma-separated raw/normalized fields that may hold bore in XML or master rows.');
  boreBox.style.marginBottom = '0';
  boreBox.appendChild(fieldCellInput(stringifyList(cfg.normalizedBoreFieldCandidates), (value) => { cfg.normalizedBoreFieldCandidates = parseCsvList(value); }));
  modeRow.append(modeBox, boreBox);
  panel.appendChild(modeRow);

  const detected = cardShell('Detected bore tokens from current source', detectedBores.length ? 'Raw detected tokens are shown for review; normalization to canonical bore/NPS is performed by the active-set builder.' : 'No source bore tokens detected yet. Load XML/InputXML first or keep fallback enabled.');
  const pre = createElement('pre', detectedBores.length ? detectedBores.join('\n') : 'No bore tokens detected.');
  pre.style.cssText = 'max-height:180px;overflow:auto;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:8px;font-size:12px;';
  detected.appendChild(pre);
  panel.appendChild(detected);

  const save = createElement('button', '💾 Save Piping Class Active Set');
  save.type = 'button';
  save.style.cssText = 'background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;';
  save.addEventListener('click', () => saveConfig(stateRef, configObj, render));
  panel.appendChild(save);
  card.appendChild(panel);
}

export function renderAdaptedConfigPanel(card, stateRef, render) {
  const active = renderTabRail(card, stateRef, render);
  if (active === 'autoMapFields') {
    renderAutoMapFieldsTab(card, stateRef, render);
    return;
  }
  if (active === 'pipingClassActiveSet') {
    renderPipingClassActiveSetTab(card, stateRef, render);
    return;
  }
  renderGeneralConfigPanel(card, stateRef, render);
}
