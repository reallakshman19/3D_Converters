import { DEFAULT_MATERIAL_MAP_ROWS } from '../../../converters/xml-cii2019-core/default-material-map-rows.js';
import { createElement } from './xml-cii-adapted-dom.js';
import { saveMasterContextToLocalStorage } from './xml-cii-adapted-state.js';
import { renderAdaptedConfigPanel as renderGeneralConfigPanel } from './xml-cii-adapted-config.js';

const CONFIG_TABS = Object.freeze([
  { id: 'general', label: 'General' },
  { id: 'autoMapFields', label: 'Auto Map Fields' },
  { id: 'pipingClassActiveSet', label: 'Piping Class Active Set' },
  { id: 'pipingClassMaterialCodes', label: 'Piping Class ↔ Material Code' },
  { id: 'smartRegex', label: 'Smart Regex' },
]);

const FIELD_ROWS = Object.freeze([
  ['lineSeqNo', 'Line Seq No.', 90, 'Line Seq No., Sequence, Seq', 'Line Sequence, Line Serial, Serial, Index', 'Seq, Sequence', 'simple running sequence, serial-like values', 'Line Number, Line No, Key 2', 'Prefer blank unless a clear sequence column exists.'],
  ['lineKey1', 'Key 1', 80, 'Key 1, Line Key, Service', 'Area, Unit, Service Code, Line Prefix, Pipeline Ref', 'Service, Key 1', 'short alphabetic service token', 'Pressure, Temp, Density, Rating, Bore, Material', 'Map when service / prefix evidence exists.'],
  ['lineKey2', 'Key 2', 85, 'Key 2, Line Number, Line No, Line No.', 'LineNumber, Line ID, Line Suffix, Pipeline Number', 'Line Number, Line No', '5-10 digit line number', 'Piping Class, Construction Class, Rating, Pressure, Density', 'Prefer Key 2 over Line Seq No. when label says Line Number.'],
  ['pipingClass', 'Piping Class', 75, 'Piping Class, Pipe Class', 'Piping Spec, Pipe Spec, Spec, SPEC, Class', 'Piping Class, Pipe Class, Spec', 'short spec token only with safe context', 'Construction Class, Insulation Class, Stress Class, Criticality Class, Material, Rating', 'Leave blank if only weak token such as CS exists.'],
  ['rating', 'Rating', 70, 'Rating, Pressure Class', 'Class Rating, Pressure Rating, Press Rating, CL, PN', 'Rating, Pressure Class', '150, 300, 600, 900, 1500, 2500, 5000, 10000, 20000, CL150, PN16', 'Design Pressure, Hydro Pressure, Line Number, Piping Class', 'Decode piping-class rating by longest prefix first.'],
  ['material', 'Material', 65, 'Material, Material Name', 'MOC, Pipe Material, Material_Name, MATL', 'Material, MOC', 'CS, SS, A106 B, LTCS', 'Piping Class, Rating, Phase, Service', 'CS is a material candidate before piping-class candidate.'],
  ['convertedBore', 'Bore', 95, 'Bore, Converted Bore', 'Size, NPS, DN, NB, Nominal Bore, Pipe Size', 'Bore, Size, DN, NPS, NB', '10", 4IN, NPS10, DN250, OD-to-NPS lookup', 'Rating, Pressure, Temperature, Density', 'Strong bore mapping; also feeds piping-class active set filtering.'],
  ['p1', 'P1 / Design Pressure', 60, 'P1, Design Pressure', 'Operating Pressure, Pressure Max, Max Pressure, Design Pr, Op. Pr', 'P1, Design Pressure', 'numeric pressure-like values', 'Hydro, Test Pressure, Temperature, Density, Line Number', 'P1 must not consume a hydro/test-pressure column.'],
  ['hydroPressure', 'Hydro Test Pressure', 62, 'Hydro Test Pressure, Hydro Pressure', 'Hydrostatic Pressure, Hydro Pr, Test Pressure, Proof Pressure, Pressure Test', 'Hydro, Test Pressure', 'numeric pressure-like values with hydro/test label', 'Design Pressure, Temperature, Density', 'Hydro/Test label wins over generic pressure.'],
  ['t1', 'T1', 55, 'T1, Design Temp', 'Design Temperature, Operating Temp, Temp Max, Max Temp, T1 (C)', 'T1, Design Temp, Max Temp', 'temperature range -200 to 800', 'Min, T3, Pressure, Hydro, Density', 'T1 is design / maximum temperature.'],
  ['t2', 'T2', 50, 'T2, Temperature', 'Temp, Operating Temperature, Normal Temp, Temp C, T2 (C)', 'T2, Temperature', 'temperature range -200 to 800', 'Max, Min, T1, T3, Pressure, Density', 'T2 is operating / normal temperature.'],
  ['t3', 'T3', 55, 'T3, Minimum Temp', 'Min Temp, Temp Min, Temperature Min, T3 (C)', 'T3, Minimum Temp, Min Temp', 'temperature range -200 to 800', 'Max, T1, Pressure, Hydro, Density', 'T3 is minimum temperature.'],
  ['insThk', 'InsThk', 45, 'InsThk, Insulation Thickness', 'Ins Thk, Insulation, Insulation Thk', 'Ins + Thk, Insulation + Thickness', 'numeric insulation thickness', 'Insulation Material, Insulation Type, Insulation Class', 'Require thickness context when only Insulation appears.'],
  ['density', 'Density', 35, 'Density, Fluid Density', 'Density kg/m3, Density kg/m³', 'Generic Density', 'numeric density-like values', 'Density Mixed, Density Gas, Density Liquid', 'Prefer blank when Mixed/Gas/Liquid density fields are mapped.'],
  ['densityMixed', 'Density Mixed', 68, 'Density Mixed, Mixed Density', 'Mixed kg/m3, Mixed kg/m³, Density (Mixed)', 'Mixed + kg/m³', 'numeric density values', 'Gas, Liquid', 'Map before generic Density.'],
  ['densityGas', 'Density Gas', 68, 'Density Gas, Gas Density', 'Gas kg/m3, Gas kg/m³, Density (Gas)', 'Density + Gas + kg/m³', 'numeric density values', 'Mixed, Liquid', 'Map before generic Density.'],
  ['densityLiquid', 'Density Liquid', 68, 'Density Liquid, Liquid Density', 'Liquid kg/m3, Liquid kg/m³, Density (Liquid)', 'Liquid + kg/m³', 'numeric density values', 'Mixed, Gas', 'Map before generic Density.'],
  ['phase', 'Phase', 66, 'Phase', 'Fluid Phase, Medium Phase, Process Phase', 'Phase + G/L/M', 'G, L, M, Gas, Liquid, Mixed, Vapour, Vapor', 'Density, Service, Material', 'Phase supports density resolution.'],
  ['from', 'From', 70, 'From', 'From Equipment, Origin, Source', 'exact stacked label cell = From', '', 'substring from inside description text', 'Safe exact-label top-up only.'],
  ['to', 'To', 70, 'To', 'To Equipment, Destination, Target', 'exact stacked label cell = To', '', 'substring to inside description text', 'Safe exact-label top-up only.'],
]);

const CAPS_DEFAULT_URL = new URL('../../../docs/CAPS', import.meta.url).href;

const DEFAULT_PIPING_CLASS_MATERIAL_CODE_ROWS = Object.freeze([
  { pipingClass: '11261', materialCode: '106', materialName: 'ASTM A106-B', materialCategory: 'CS', rating: '150', corrosion: '1', note: 'Seed: carbon steel base class' },
  { pipingClass: '11441', materialCode: '106', materialName: 'ASTM A106-B', materialCategory: 'CS Sour', rating: '150', corrosion: '3', note: 'Seed: carbon steel sour' },
  { pipingClass: '31441', materialCode: '106', materialName: 'ASTM A106-B', materialCategory: 'CS Sour', rating: '300', corrosion: '3', note: 'Seed: carbon steel sour' },
  { pipingClass: '61261', materialCode: '106', materialName: 'ASTM A106-B', materialCategory: 'CS', rating: '600', corrosion: '1', note: 'Seed: carbon steel rating family' },
  { pipingClass: '91261', materialCode: '106', materialName: 'ASTM A106-B', materialCategory: 'CS', rating: '900', corrosion: '1', note: 'Seed: carbon steel rating family' },
  { pipingClass: '11472', materialCode: '177', materialName: 'ASTM A333-6', materialCategory: 'LT CS', rating: '150', corrosion: '', note: 'Seed: low-temperature carbon steel' },
  { pipingClass: '11503', materialCode: '177', materialName: 'ASTM A333-6', materialCategory: 'LT CS Sour', rating: '150', corrosion: '', note: 'Seed: low-temperature sour carbon steel' },
  { pipingClass: '12021', materialCode: '181', materialName: 'ASTM A335-P11', materialCategory: '1.25Cr-0.5Mo', rating: '150', corrosion: '', note: 'Seed: alloy steel' },
  { pipingClass: '12040', materialCode: '186', materialName: 'ASTM A335-P5', materialCategory: '5Cr-0.5Mo', rating: '150', corrosion: '', note: 'Seed: alloy steel' },
  { pipingClass: '12090', materialCode: '190', materialName: 'ASTM A335-P9', materialCategory: '9Cr-1Mo', rating: '150', corrosion: '', note: 'Seed: alloy steel' },
  { pipingClass: '13021', materialCode: '163', materialName: 'ASTM A312-TP316', materialCategory: 'SS 316', rating: '150', corrosion: '', note: 'Seed: stainless steel 316' },
  { pipingClass: '13081', materialCode: '155', materialName: 'ASTM A312-TP304', materialCategory: 'SS 304', rating: '150', corrosion: '', note: 'Seed: stainless steel 304' },
]);

const DEFAULT_RATING_PREFIX_RULES = Object.freeze([
  { prefix: '200', rating: '20000', priority: 10, note: 'User rule: classes beginning 200 represent 20000 rating' },
  { prefix: '100', rating: '10000', priority: 20, note: 'User rule: classes beginning 100 represent 10000 rating' },
  { prefix: '50', rating: '5000', priority: 30, note: 'User rule: classes beginning 50 represent 5000 rating' },
  { prefix: '25', rating: '2500', priority: 40, note: 'User rule: classes beginning 25 represent 2500 rating' },
  { prefix: '15', rating: '1500', priority: 50, note: 'User rule: classes beginning 15 represent 1500 rating' },
  { prefix: '9', rating: '900', priority: 60, note: 'Fallback: first digit 9 represents 900 rating' },
  { prefix: '6', rating: '600', priority: 70, note: 'Fallback: first digit 6 represents 600 rating' },
  { prefix: '3', rating: '300', priority: 80, note: 'Fallback: first digit 3 represents 300 rating' },
  { prefix: '1', rating: '150', priority: 90, note: 'Fallback: first digit 1 represents 150 rating after 15 is checked' },
]);

const toList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const fromList = (v) => Array.isArray(v) ? v.join(', ') : String(v || '');
const configFromState = (stateRef) => { try { return JSON.parse(stateRef.current.supportConfigJson || '{}') || {}; } catch { return {}; } };
const clean = (value) => String(value ?? '').trim();

function saveConfig(stateRef, configObj, render) {
  const fullConfigJson = JSON.stringify(configObj, null, 2);
  stateRef.current = { ...stateRef.current, supportConfigJson: fullConfigJson, masterContext: { ...(stateRef.current.masterContext || {}), config: configObj } };
  saveMasterContextToLocalStorage(stateRef.current.masterContext);
  render();
}

function cardShell(title, helpText = '') {
  const card = createElement('section');
  card.style.cssText = 'background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px 16px;margin-bottom:14px;';
  const h3 = createElement('h3', title);
  h3.style.cssText = 'margin:0 0 8px;font-size:14px;color:#38bdf8;';
  card.appendChild(h3);
  if (helpText) card.appendChild(Object.assign(createElement('p', helpText, 'xml-cii-phase-help'), { style: 'margin:0 0 10px 0;' }));
  return card;
}

function checkbox(parent, label, checked, onChange) {
  const wrap = createElement('label');
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 14px 8px 0;font-size:12px;color:#cbd5e1;cursor:pointer;';
  const input = createElement('input');
  input.type = 'checkbox';
  input.checked = !!checked;
  input.addEventListener('change', (event) => onChange(!!event.target.checked));
  wrap.append(input, document.createTextNode(label));
  parent.appendChild(wrap);
}

function textInput(value, onChange, width = '100%') {
  const input = createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.style.cssText = `width:${width};box-sizing:border-box;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:4px;padding:4px;font-size:11px;`;
  input.addEventListener('change', (event) => onChange(event.target.value));
  return input;
}

function numberInput(value, onChange, max = 10000) {
  const input = textInput(String(value ?? 0), (val) => onChange(Number(val) || 0), '90px');
  input.type = 'number';
  input.min = '0';
  input.max = String(max);
  input.step = '1';
  return input;
}

function selectBox(value, options, onChange) {
  const select = createElement('select');
  select.style.cssText = 'background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:4px;padding:6px;font-size:12px;min-width:220px;';
  for (const [val, label] of options) {
    const opt = createElement('option', label);
    opt.value = val;
    opt.selected = val === value;
    select.appendChild(opt);
  }
  select.addEventListener('change', (event) => onChange(event.target.value));
  return select;
}

function normalizeMaterialKey(value) {
  return clean(value).toUpperCase()
    .replace(/[‐‑–—]/g, '-')
    .replace(/^ASTM\s+/, '')
    .replace(/^API\s+/, 'API-')
    .replace(/^API-?5L[-\s]?/, 'API-5L-')
    .replace(/\((?:SML|ERW|SAW|SEAMLESS|WELDED)\)/g, '')
    .replace(/\b(?:CL|CLASS)\.?\s*\d+\b/g, '')
    .replace(/\bSTAB\s+HT\b/g, '')
    .replace(/\s+/g, '')
    .replace(/_/g, '-');
}

function materialKeyVariants(value) {
  const base = normalizeMaterialKey(value);
  const variants = new Set([base]);
  variants.add(base.replace(/\./g, ''));
  variants.add(base.replace(/-/g, ''));
  variants.add(base.replace(/(\d)\.(\d)/g, '$1$2'));
  variants.add(base.replace(/TP/g, ''));
  variants.add(base.replace(/WP/g, ''));
  return Array.from(variants).filter(Boolean);
}

const MATERIAL_MAP_INDEX = (() => {
  const index = new Map();
  for (const row of DEFAULT_MATERIAL_MAP_ROWS || []) {
    const material = clean(row.material || row.Material || row['Material Name']);
    const code = clean(row.code || row.materialCode || row['Material Code']);
    if (!material || !code) continue;
    for (const key of materialKeyVariants(material)) if (!index.has(key)) index.set(key, { code, material });
  }
  return index;
})();

function resolveMaterialCodeFromMap(materialName) {
  for (const key of materialKeyVariants(materialName)) {
    const hit = MATERIAL_MAP_INDEX.get(key);
    if (hit) return { code: hit.code, matchedMaterial: hit.material, matchKey: key };
  }
  return { code: '', matchedMaterial: '', matchKey: '' };
}

function defaultPipingClassMaterialCodeRows() {
  return DEFAULT_PIPING_CLASS_MATERIAL_CODE_ROWS.map((row) => ({ ...row, capsMaterialCount: Number(row.capsMaterialCount || 1) }));
}

function normalizeMaterialCodeRow(row) {
  const value = row && typeof row === 'object' ? row : {};
  return {
    pipingClass: clean(value.pipingClass || value.classNumber || value['Piping Class']),
    materialCode: clean(value.materialCode || value.code || value['Material Code']),
    materialName: clean(value.materialName || value.material || value.Material_Name || value['Material Name']),
    materialCategory: clean(value.materialCategory || value.PMSMat_Cat || value.PMSMat_Categories || value['Material Category']),
    rating: clean(value.rating || value.Rating),
    corrosion: clean(value.corrosion || value.Corrosion),
    note: clean(value.note || value.source),
    capsMaterialCount: Number(value.capsMaterialCount || 1),
  };
}

function defaultRatingPrefixRules() {
  return DEFAULT_RATING_PREFIX_RULES.map((rule) => ({ ...rule }));
}

function normalizeRatingPrefixRule(rule) {
  const value = rule && typeof rule === 'object' ? rule : {};
  return {
    prefix: clean(value.prefix || value.classPrefix || value.pattern),
    rating: clean(value.rating || value.Rating),
    priority: Number(value.priority || 100),
    note: clean(value.note || value.source),
  };
}

function sortedRatingPrefixRules(rules) {
  const normalized = Array.isArray(rules) && rules.length ? rules.map(normalizeRatingPrefixRule) : defaultRatingPrefixRules();
  return normalized
    .filter((rule) => rule.prefix && rule.rating)
    .sort((a, b) => b.prefix.length - a.prefix.length || a.priority - b.priority || a.prefix.localeCompare(b.prefix));
}

function ratingFromPipingClass(classNumber, rules = DEFAULT_RATING_PREFIX_RULES) {
  const cls = clean(classNumber);
  const hit = sortedRatingPrefixRules(rules).find((rule) => cls.startsWith(rule.prefix));
  return hit ? hit.rating : '';
}

function parseCapsTextToMaterialCodeRows(text, ratingPrefixRules = DEFAULT_RATING_PREFIX_RULES) {
  const grouped = new Map();
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^Class number\b/i.test(trimmed)) continue;
    const [classNumberRaw, materialCategoryRaw, materialNameRaw] = trimmed.split('\t');
    const pipingClass = clean(classNumberRaw);
    const materialCategory = clean(materialCategoryRaw);
    const materialName = clean(materialNameRaw);
    if (!pipingClass || !materialName) continue;
    const resolved = resolveMaterialCodeFromMap(materialName);
    const codeKey = resolved.code || `UNMAPPED:${normalizeMaterialKey(materialName)}`;
    const key = `${pipingClass}::${materialCategory}::${codeKey}`;
    const existing = grouped.get(key);
    if (existing) {
      if (!existing.materialName.split(';').map((x) => x.trim()).includes(materialName)) {
        existing.materialName = `${existing.materialName}; ${materialName}`;
        existing.capsMaterialCount += 1;
      }
      existing.note = existing.materialCode
        ? `CAPS → Mat_MAP ${resolved.matchedMaterial || existing.materialCode}; ${existing.capsMaterialCount} internal CAPS material description(s)`
        : `CAPS material not found in Mat_MAP; ${existing.capsMaterialCount} internal CAPS material description(s); review`;
      continue;
    }
    grouped.set(key, normalizeMaterialCodeRow({
      pipingClass,
      materialCode: resolved.code,
      materialName,
      materialCategory,
      rating: ratingFromPipingClass(pipingClass, ratingPrefixRules),
      corrosion: '',
      capsMaterialCount: 1,
      note: resolved.code ? `CAPS → Mat_MAP ${resolved.matchedMaterial}; 1 internal CAPS material description` : 'CAPS material not found in Mat_MAP; review',
    }));
  }
  return Array.from(grouped.values()).sort((a, b) => (
    a.pipingClass.localeCompare(b.pipingClass, undefined, { numeric: true })
    || a.materialCode.localeCompare(b.materialCode, undefined, { numeric: true })
    || a.materialCategory.localeCompare(b.materialCategory)
  ));
}

async function loadCapsRowsIntoConfig(configObj, cfg, stateRef, render, statusEl = null) {
  if (typeof fetch !== 'function') throw new Error('Browser fetch API is not available.');
  const source = cfg.capsSourcePath || CAPS_DEFAULT_URL;
  if (statusEl) statusEl.textContent = `Loading CAPS material map from ${source}…`;
  const response = await fetch(source, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load CAPS (${response.status} ${response.statusText})`);
  const text = await response.text();
  const rows = parseCapsTextToMaterialCodeRows(text, cfg.ratingPrefixRules);
  if (!rows.length) throw new Error('CAPS file parsed zero class/material rows.');
  cfg.rows = rows;
  cfg.loadedFromCaps = true;
  cfg.rowsSource = 'docs/CAPS';
  cfg.capsSourcePath = source;
  cfg.capsRowCount = rows.length;
  cfg.unmatchedMaterialCount = rows.filter((row) => !row.materialCode).length;
  cfg.lastLoadedAt = new Date().toISOString();
  cfg.capsLoadError = '';
  stateRef.current.__capsMaterialLoadInProgress = false;
  configObj.pipingClassMaterialCodeMap = cfg;
  saveConfig(stateRef, configObj, render);
}

function ensureAutoMap(configObj) {
  const current = configObj.standaloneAutoMap && typeof configObj.standaloneAutoMap === 'object' ? configObj.standaloneAutoMap : {};
  const fields = current.fields && typeof current.fields === 'object' ? current.fields : {};
  const nextFields = {};
  for (const [name, label, priority, exact, aliases, stacked, valueFallback, reject, policy] of FIELD_ROWS) {
    const saved = fields[name] || {};
    nextFields[name] = { enabled: saved.enabled !== false, priority: Number(saved.priority ?? priority), exact: toList(saved.exact || exact), aliases: toList(saved.aliases || aliases), stacked: toList(saved.stacked || stacked), valueFallback: toList(saved.valueFallback || valueFallback), reject: toList(saved.reject || reject), policy: String(saved.policy || policy), label };
  }
  configObj.standaloneAutoMap = { enabled: current.enabled !== false, approvalLog: current.approvalLog !== false, manualSavedMappingWins: current.manualSavedMappingWins !== false, applyTopUpPolicyAfterExistingLogic: current.applyTopUpPolicyAfterExistingLogic !== false, fields: nextFields };
  return configObj.standaloneAutoMap;
}

function ensurePipingClassActiveSet(configObj) {
  const current = configObj.pipingClassActiveSet && typeof configObj.pipingClassActiveSet === 'object' ? configObj.pipingClassActiveSet : {};
  const requestedMode = current.mode || (current.enabled === false ? 'full-master' : 'bore-only');
  const mode = requestedMode === 'full-master' ? 'full-master' : 'bore-only';
  configObj.pipingClassActiveSet = { enabled: mode === 'bore-only' && current.enabled !== false, mode, source: current.source || 'loaded-xml', fallbackToFullMasterWhenNoBoreDetected: current.fallbackToFullMasterWhenNoBoreDetected !== false, previewLimit: Number(current.previewLimit || 150), normalizedBoreFieldCandidates: toList(current.normalizedBoreFieldCandidates || 'convertedBore, bore, nps, dn, size, outsideDiameter, DIAMETER') };
  return configObj.pipingClassActiveSet;
}

function ensurePipingClassMaterialCodeMap(configObj) {
  const current = configObj.pipingClassMaterialCodeMap && typeof configObj.pipingClassMaterialCodeMap === 'object' ? configObj.pipingClassMaterialCodeMap : {};
  const ratingPrefixRules = Array.isArray(current.ratingPrefixRules) && current.ratingPrefixRules.length ? current.ratingPrefixRules.map(normalizeRatingPrefixRule) : defaultRatingPrefixRules();
  const rows = Array.isArray(current.rows) && current.rows.length ? current.rows.map(normalizeMaterialCodeRow) : defaultPipingClassMaterialCodeRows().map((row) => ({ ...row, rating: row.rating || ratingFromPipingClass(row.pipingClass, ratingPrefixRules) }));
  configObj.pipingClassMaterialCodeMap = {
    enabled: current.enabled !== false,
    manualOverrideWins: current.manualOverrideWins !== false,
    exactPipingClassFirst: current.exactPipingClassFirst !== false,
    normalizeClassSuffix: current.normalizeClassSuffix !== false,
    materialNameToMatMapFallback: current.materialNameToMatMapFallback !== false,
    autoLoadCaps: current.autoLoadCaps !== false,
    capsSourcePath: current.capsSourcePath || CAPS_DEFAULT_URL,
    loadedFromCaps: current.loadedFromCaps === true,
    rowsSource: current.rowsSource || 'seed',
    capsRowCount: Number(current.capsRowCount || rows.length),
    unmatchedMaterialCount: Number(current.unmatchedMaterialCount || rows.filter((row) => !row.materialCode).length),
    renderLimit: Number(current.renderLimit || 500),
    filterText: clean(current.filterText),
    lastLoadedAt: clean(current.lastLoadedAt),
    capsLoadError: clean(current.capsLoadError),
    ratingPrefixRules,
    rows,
  };
  return configObj.pipingClassMaterialCodeMap;
}

function ensureSmartRegex(configObj) {
  const current = configObj.smartRegex && typeof configObj.smartRegex === 'object' ? configObj.smartRegex : {};
  configObj.smartRegex = { enabled: current.enabled !== false, mode: current.mode || 'suggest-and-validate', applyHighConfidenceOnly: current.applyHighConfidenceOnly !== false, minimumConfidence: Number(current.minimumConfidence || 90), validateLineKey: current.validateLineKey !== false, validateBore: current.validateBore !== false, validatePipingClass: current.validatePipingClass === true, ignoreBranchSuffix: current.ignoreBranchSuffix !== false, approvalReport: current.approvalReport !== false };
  return configObj.smartRegex;
}

function renderTabRail(card, stateRef, render) {
  const active = stateRef.current.configActiveSubTabId || 'general';
  const rail = createElement('nav', '', 'xml-cii-sub-nav-rail');
  rail.style.marginBottom = '12px';
  for (const tab of CONFIG_TABS) {
    const button = createElement('button', tab.label, 'xml-cii-sub-phase-pill');
    button.type = 'button';
    button.classList.toggle('is-active', active === tab.id);
    button.addEventListener('click', () => { stateRef.current = { ...stateRef.current, configActiveSubTabId: tab.id }; render(); });
    rail.appendChild(button);
  }
  card.appendChild(rail);
  return active;
}

function renderAutoMapFieldsTab(card, stateRef, render) {
  const configObj = configFromState(stateRef); const cfg = ensureAutoMap(configObj);
  const panel = cardShell('🧠 Auto Map Fields Policy', 'Configurable field-wise keyword matrix. This is a top-up policy layer: existing XML→CII detector and dynamic fuzzy mapper remain the baseline.');
  const toggles = createElement('div'); toggles.style.cssText = 'display:flex;flex-wrap:wrap;margin-bottom:10px;';
  checkbox(toggles, 'Enable standalone Auto Map top-up policy', cfg.enabled, (v) => { cfg.enabled = v; });
  checkbox(toggles, 'Show approval / priority log', cfg.approvalLog, (v) => { cfg.approvalLog = v; });
  checkbox(toggles, 'Manual / saved mapping wins', cfg.manualSavedMappingWins, (v) => { cfg.manualSavedMappingWins = v; });
  checkbox(toggles, 'Run top-up after existing detector/fuzzy logic', cfg.applyTopUpPolicyAfterExistingLogic, (v) => { cfg.applyTopUpPolicyAfterExistingLogic = v; });
  panel.appendChild(toggles);
  const wrap = createElement('div'); wrap.style.cssText = 'max-height:560px;overflow:auto;border:1px solid rgba(148,163,184,.18);border-radius:8px;';
  const table = createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;min-width:1320px;';
  const header = createElement('tr');
  for (const label of ['Field', 'On', 'Priority', 'Exact keywords', 'Alias / OR keywords', 'Stacked label logic', 'Value fallback', 'Reject / AND NOT', 'Top-up policy']) header.appendChild(Object.assign(createElement('th', label), { style: 'position:sticky;top:0;background:#0f172a;color:#bfdbfe;text-align:left;padding:6px;border-bottom:1px solid #334155;z-index:1;' }));
  const thead = createElement('thead'); thead.appendChild(header); table.appendChild(thead);
  const tbody = createElement('tbody');
  for (const [name, label] of FIELD_ROWS) {
    const row = cfg.fields[name]; const tr = createElement('tr');
    const add = (node) => { const td = createElement('td'); td.style.cssText = 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);'; td.appendChild(node); tr.appendChild(td); };
    add(createElement('strong', label));
    const cb = createElement('input'); cb.type = 'checkbox'; cb.checked = row.enabled !== false; cb.addEventListener('change', (e) => { row.enabled = e.target.checked; }); add(cb);
    add(numberInput(row.priority, (v) => { row.priority = v; }, 100));
    for (const key of ['exact', 'aliases', 'stacked', 'valueFallback', 'reject']) add(textInput(fromList(row[key]), (val) => { row[key] = toList(val); }));
    add(textInput(row.policy, (val) => { row.policy = val; })); tbody.appendChild(tr);
  }
  table.appendChild(tbody); wrap.appendChild(table); panel.appendChild(wrap);
  const save = createElement('button', '💾 Save Auto Map Policy'); save.type = 'button'; save.style.cssText = 'margin-top:12px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;'; save.addEventListener('click', () => saveConfig(stateRef, configObj, render)); panel.appendChild(save); card.appendChild(panel);
}

function detectBoreTokensFromSource(sourceText) {
  const source = String(sourceText || ''); if (!source.trim()) return [];
  const found = new Set();
  const patterns = [/\b(?:BORE|NPS|DN|SIZE)\s*=\s*"([^"]+)"/gi, /\bDIAMETER\s*=\s*"([^"]+)"/gi, /<\s*(?:BORE|NPS|DN|SIZE|DIAMETER)\s*>\s*([^<]+?)\s*<\s*\//gi, /\b(?:NPS|DN)\s*([0-9]+(?:\.[0-9]+)?)/gi, /\b([0-9]+(?:\.[0-9]+)?)\s*"/g];
  for (const pattern of patterns) { let match; while ((match = pattern.exec(source)) && found.size < 80) { const value = String(match[1] || '').trim(); if (value) found.add(value); } }
  return Array.from(found).slice(0, 40);
}

function metric(parent, label, value) {
  const item = createElement('div'); item.style.cssText = 'background:#0f172a;border:1px solid rgba(148,163,184,.18);border-radius:6px;padding:8px;';
  item.append(Object.assign(createElement('span', label), { style: 'display:block;color:#94a3b8;font-size:11px;' }), Object.assign(createElement('strong', String(value ?? '0')), { style: 'display:block;color:#e2e8f0;font-size:15px;margin-top:4px;' })); parent.appendChild(item);
}

function renderPipingClassActiveSetTab(card, stateRef, render) {
  const configObj = configFromState(stateRef); const cfg = ensurePipingClassActiveSet(configObj); const detected = detectBoreTokensFromSource(stateRef.current.sourceText); const modeLabel = cfg.mode === 'full-master' || cfg.enabled === false ? 'Full master' : 'Bore only';
  const panel = cardShell('🪈 Piping Class Master Loading', 'Choose whether the active Piping Class data set is reduced by detected XML bore or the full loaded master is used. Bore-only mode improves performance on large masters; Full master remains available for diagnostic/review use.');
  const metrics = createElement('div'); metrics.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:12px;';
  metric(metrics, 'Full master rows indexed', Number(stateRef.current.masterContext?.rowCounts?.pipingClass || 0)); metric(metrics, 'Detected XML bore tokens', detected.length); metric(metrics, 'Load mode', modeLabel); metric(metrics, 'Fallback', cfg.fallbackToFullMasterWhenNoBoreDetected ? 'Full master if no bore' : 'No fallback'); panel.appendChild(metrics);
  const controls = createElement('div'); controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;'; const modeRow = createElement('label'); modeRow.style.cssText = 'display:flex;gap:10px;align-items:center;font-size:12px;color:#cbd5e1;margin-right:14px;'; modeRow.append(document.createTextNode('Piping Class load mode:'), selectBox(cfg.mode, [['bore-only', 'Bore-wise active set'], ['full-master', 'Full master load']], (v) => { cfg.mode = v; cfg.enabled = v !== 'full-master'; })); controls.appendChild(modeRow); checkbox(controls, 'Fallback to full master when no bore is detected', cfg.fallbackToFullMasterWhenNoBoreDetected, (v) => { cfg.fallbackToFullMasterWhenNoBoreDetected = v; }); panel.appendChild(controls);
  const modeHelp = cardShell('Mode behavior', cfg.mode === 'full-master' ? 'Full master mode keeps all Piping Class rows active. Use this for diagnostics or when bore extraction is unreliable.' : 'Bore-wise mode keeps the full master indexed but activates only rows whose normalized bore matches detected XML/InputXML bore tokens.'); modeHelp.style.marginBottom = '12px'; panel.appendChild(modeHelp);
  const box = cardShell('Bore field candidates', 'Comma-separated raw/normalized fields that may hold bore in XML or master rows.'); box.appendChild(textInput(fromList(cfg.normalizedBoreFieldCandidates), (v) => { cfg.normalizedBoreFieldCandidates = toList(v); })); panel.appendChild(box);
  const pre = createElement('pre', detected.length ? detected.join('\n') : 'No bore tokens detected.'); pre.style.cssText = 'max-height:180px;overflow:auto;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:8px;font-size:12px;'; const boreList = cardShell('Detected bore tokens from current source', detected.length ? 'Raw detected tokens are shown for review.' : 'Load XML/InputXML first or keep fallback enabled.'); boreList.appendChild(pre); panel.appendChild(boreList);
  const save = createElement('button', '💾 Save Piping Class Loading Mode'); save.type = 'button'; save.style.cssText = 'background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;'; save.addEventListener('click', () => saveConfig(stateRef, configObj, render)); panel.appendChild(save); card.appendChild(panel);
}

function renderRatingPrefixRules(parent, cfg, configObj, stateRef, render) {
  const card = cardShell('Rating prefix rules', 'Editable rating decode. Longest prefix wins, so 200/100/50/25/15 are checked before 9/6/3/1.');
  const table = createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;min-width:760px;';
  const head = createElement('tr');
  for (const label of ['Class begins with', 'Rating', 'Priority', 'Note', '']) head.appendChild(Object.assign(createElement('th', label), { style: 'background:#0f172a;color:#bfdbfe;text-align:left;padding:6px;border-bottom:1px solid #334155;' }));
  const thead = createElement('thead'); thead.appendChild(head); table.appendChild(thead);
  const tbody = createElement('tbody');
  cfg.ratingPrefixRules.forEach((rule, index) => {
    const tr = createElement('tr');
    const add = (node, width = '') => { const td = createElement('td'); td.style.cssText = `padding:5px;border-bottom:1px solid rgba(148,163,184,.12);${width ? `min-width:${width};` : ''}`; td.appendChild(node); tr.appendChild(td); };
    add(textInput(rule.prefix, (v) => { rule.prefix = v; }, '110px'), '110px');
    add(textInput(rule.rating, (v) => { rule.rating = v; }, '110px'), '110px');
    add(numberInput(rule.priority, (v) => { rule.priority = v; }, 999), '90px');
    add(textInput(rule.note, (v) => { rule.note = v; }, '360px'), '360px');
    const remove = createElement('button', 'Remove'); remove.type = 'button'; remove.style.cssText = 'background:#7f1d1d;color:#fee2e2;border:1px solid #b91c1c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;'; remove.addEventListener('click', () => { cfg.ratingPrefixRules.splice(index, 1); saveConfig(stateRef, configObj, render); });
    add(remove, '90px'); tbody.appendChild(tr);
  });
  table.appendChild(tbody); card.appendChild(table);
  const actions = createElement('div'); actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;';
  const add = createElement('button', '＋ Add rating prefix'); add.type = 'button'; add.style.cssText = 'background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:bold;cursor:pointer;'; add.addEventListener('click', () => { cfg.ratingPrefixRules.push({ prefix: '', rating: '', priority: 100, note: 'manual' }); saveConfig(stateRef, configObj, render); });
  const restore = createElement('button', '↺ Restore user-supplied rating prefixes'); restore.type = 'button'; restore.style.cssText = 'background:#3f2f09;color:#fde68a;border:1px solid #a16207;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:bold;cursor:pointer;'; restore.addEventListener('click', () => { cfg.ratingPrefixRules = defaultRatingPrefixRules(); cfg.rows = cfg.rows.map((row) => ({ ...row, rating: ratingFromPipingClass(row.pipingClass, cfg.ratingPrefixRules) || row.rating })); saveConfig(stateRef, configObj, render); });
  const apply = createElement('button', 'Apply rating rules to visible map'); apply.type = 'button'; apply.style.cssText = 'background:#0f766e;color:#ccfbf1;border:1px solid #14b8a6;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:bold;cursor:pointer;'; apply.addEventListener('click', () => { cfg.rows = cfg.rows.map((row) => ({ ...row, rating: ratingFromPipingClass(row.pipingClass, cfg.ratingPrefixRules) || row.rating })); saveConfig(stateRef, configObj, render); });
  actions.append(add, restore, apply); card.appendChild(actions); parent.appendChild(card);
}

function renderPipingClassMaterialCodeMapTab(card, stateRef, render) {
  const configObj = configFromState(stateRef); const cfg = ensurePipingClassMaterialCodeMap(configObj);
  if (cfg.autoLoadCaps && !cfg.loadedFromCaps && !stateRef.current.__capsMaterialLoadInProgress && cfg.rows.length <= DEFAULT_PIPING_CLASS_MATERIAL_CODE_ROWS.length) {
    stateRef.current.__capsMaterialLoadInProgress = true;
    loadCapsRowsIntoConfig(configObj, cfg, stateRef, render).catch((error) => { const latest = ensurePipingClassMaterialCodeMap(configFromState(stateRef)); latest.capsLoadError = error?.message || String(error); stateRef.current.__capsMaterialLoadInProgress = false; render(); });
  }
  const panel = cardShell('🧩 Piping Class ↔ Material Code Map', 'Editable lookup used to bridge Piping Class number to CAESAR material code. CAPS Material Description is hidden and used internally to resolve Material Code through Mat_MAP.');
  const toggles = createElement('div'); toggles.style.cssText = 'display:flex;flex-wrap:wrap;margin-bottom:10px;';
  checkbox(toggles, 'Enable static Piping Class ↔ Material Code map', cfg.enabled, (v) => { cfg.enabled = v; }); checkbox(toggles, 'Manual material-code override wins', cfg.manualOverrideWins, (v) => { cfg.manualOverrideWins = v; }); checkbox(toggles, 'Exact piping-class match first', cfg.exactPipingClassFirst, (v) => { cfg.exactPipingClassFirst = v; }); checkbox(toggles, 'Normalize class suffix such as 91261M7 → 91261', cfg.normalizeClassSuffix, (v) => { cfg.normalizeClassSuffix = v; }); checkbox(toggles, 'Allow Material_Name → Mat_MAP fallback', cfg.materialNameToMatMapFallback, (v) => { cfg.materialNameToMatMapFallback = v; }); checkbox(toggles, 'Auto-load all rows from docs/CAPS', cfg.autoLoadCaps, (v) => { cfg.autoLoadCaps = v; }); panel.appendChild(toggles);
  renderRatingPrefixRules(panel, cfg, configObj, stateRef, render);
  const sourceBox = cardShell('CAPS source', 'The table is populated from the repository static docs/CAPS file and mapped against built-in Mat_MAP rows. CAPS Material Description remains hidden/internal; the visible list is class/category/code focused.'); sourceBox.appendChild(textInput(cfg.capsSourcePath, (v) => { cfg.capsSourcePath = v || CAPS_DEFAULT_URL; }, '100%')); panel.appendChild(sourceBox);
  const summary = createElement('div'); summary.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:12px;'; metric(summary, 'Configured rows', cfg.rows.length); metric(summary, 'Source', cfg.rowsSource || 'seed'); metric(summary, 'Unmatched material codes', cfg.rows.filter((row) => !row.materialCode).length); metric(summary, 'Hidden CAPS material evidence', cfg.rows.reduce((sum, row) => sum + Number(row.capsMaterialCount || 1), 0)); metric(summary, 'Rating prefix rules', cfg.ratingPrefixRules.length); metric(summary, 'Last loaded', cfg.lastLoadedAt ? cfg.lastLoadedAt.slice(0, 19).replace('T', ' ') : '—'); panel.appendChild(summary);
  const controls = createElement('div'); controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;'; const filterLabel = createElement('label'); filterLabel.style.cssText = 'display:flex;gap:8px;align-items:center;color:#cbd5e1;font-size:12px;'; filterLabel.append(document.createTextNode('Filter:'), textInput(cfg.filterText, (v) => { cfg.filterText = v; }, '220px')); const limitLabel = createElement('label'); limitLabel.style.cssText = 'display:flex;gap:8px;align-items:center;color:#cbd5e1;font-size:12px;'; limitLabel.append(document.createTextNode('Render limit:'), numberInput(cfg.renderLimit, (v) => { cfg.renderLimit = Math.max(50, v || 500); })); controls.append(filterLabel, limitLabel); panel.appendChild(controls);
  const filter = clean(cfg.filterText).toUpperCase(); const matchedRows = filter ? cfg.rows.filter((row) => Object.values(row).some((value) => clean(value).toUpperCase().includes(filter))) : cfg.rows; const shownRows = matchedRows.slice(0, Math.max(50, Number(cfg.renderLimit || 500))); const displayNote = createElement('div', `Showing ${shownRows.length} of ${matchedRows.length} matching row(s), total ${cfg.rows.length}. CAPS Material Description is hidden and used internally for Mat_MAP resolution.` + (cfg.capsLoadError ? ` CAPS load warning: ${cfg.capsLoadError}` : ''), 'xml-cii-phase-help'); displayNote.style.cssText = `margin:0 0 8px 0;color:${cfg.capsLoadError ? '#fca5a5' : '#94a3b8'};`; panel.appendChild(displayNote);
  const wrap = createElement('div'); wrap.style.cssText = 'max-height:520px;overflow:auto;border:1px solid rgba(148,163,184,.18);border-radius:8px;'; const table = createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;min-width:980px;'; const header = createElement('tr'); for (const label of ['Piping Class', 'Material Code', 'Mat Description', 'Rating', 'Corrosion', 'Note / Source', '']) header.appendChild(Object.assign(createElement('th', label), { style: 'position:sticky;top:0;background:#0f172a;color:#bfdbfe;text-align:left;padding:6px;border-bottom:1px solid #334155;z-index:1;' })); const thead = createElement('thead'); thead.appendChild(header); table.appendChild(thead); const tbody = createElement('tbody');
  shownRows.forEach((row) => { const index = cfg.rows.indexOf(row); const tr = createElement('tr'); const add = (node, width = '') => { const td = createElement('td'); td.style.cssText = `padding:5px;border-bottom:1px solid rgba(148,163,184,.12);${width ? `min-width:${width};` : ''}`; td.appendChild(node); tr.appendChild(td); }; add(textInput(row.pipingClass, (v) => { row.pipingClass = v; row.rating = ratingFromPipingClass(v, cfg.ratingPrefixRules) || row.rating; }, '120px'), '120px'); add(textInput(row.materialCode, (v) => { row.materialCode = v; }, '110px'), '110px'); add(textInput(row.materialCategory, (v) => { row.materialCategory = v; }, '190px'), '190px'); add(textInput(row.rating, (v) => { row.rating = v; }, '90px'), '90px'); add(textInput(row.corrosion, (v) => { row.corrosion = v; }, '90px'), '90px'); add(textInput(row.note, (v) => { row.note = v; }, '320px'), '320px'); const remove = createElement('button', 'Remove'); remove.type = 'button'; remove.style.cssText = 'background:#7f1d1d;color:#fee2e2;border:1px solid #b91c1c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;'; remove.addEventListener('click', () => { if (index >= 0) cfg.rows.splice(index, 1); saveConfig(stateRef, configObj, render); }); add(remove, '90px'); tbody.appendChild(tr); });
  table.appendChild(tbody); wrap.appendChild(table); panel.appendChild(wrap);
  const actions = createElement('div'); actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;'; const addBtn = createElement('button', '＋ Add row'); addBtn.type = 'button'; addBtn.style.cssText = 'background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;'; addBtn.addEventListener('click', () => { cfg.rows.unshift(normalizeMaterialCodeRow({ pipingClass: '', materialCode: '', materialName: '', materialCategory: '', rating: '', corrosion: '', note: 'manual', capsMaterialCount: 0 })); saveConfig(stateRef, configObj, render); }); const capsBtn = createElement('button', '↻ Generate full internal list from docs/CAPS'); capsBtn.type = 'button'; capsBtn.style.cssText = 'background:#0f766e;color:#ccfbf1;border:1px solid #14b8a6;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;'; capsBtn.addEventListener('click', async () => { try { await loadCapsRowsIntoConfig(configObj, cfg, stateRef, render, displayNote); } catch (error) { cfg.capsLoadError = error?.message || String(error); saveConfig(stateRef, configObj, render); } }); const defaultsBtn = createElement('button', '↺ Restore seed rows'); defaultsBtn.type = 'button'; defaultsBtn.style.cssText = 'background:#3f2f09;color:#fde68a;border:1px solid #a16207;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;'; defaultsBtn.addEventListener('click', () => { cfg.rows = defaultPipingClassMaterialCodeRows(); cfg.ratingPrefixRules = defaultRatingPrefixRules(); cfg.loadedFromCaps = false; cfg.rowsSource = 'seed'; cfg.capsLoadError = ''; saveConfig(stateRef, configObj, render); }); const save = createElement('button', '💾 Save Piping Class ↔ Material Code Map'); save.type = 'button'; save.style.cssText = 'background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;'; save.addEventListener('click', () => saveConfig(stateRef, configObj, render)); actions.append(addBtn, capsBtn, defaultsBtn, save); panel.appendChild(actions);
  const help = cardShell('Resolver note', 'Rating is decoded from editable prefix rules using longest-prefix-first matching: 200, 100, 50, 25, 15 before 9, 6, 3, 1. Piping Class number is not itself a material code; CAPS Material Description is parsed internally to derive Material Code.'); help.style.marginTop = '12px'; panel.appendChild(help); card.appendChild(panel);
}

function renderSmartRegexTab(card, stateRef, render) {
  const configObj = configFromState(stateRef); const cfg = ensureSmartRegex(configObj);
  const panel = cardShell('🧠 Smart Regex', 'Configures the Smart Mode layer for Auto Regex. Existing Manual Token Builder and existing Auto Regex remain the baseline; Smart Mode suggests, validates, and only applies high-confidence mappings when enabled.');
  const grid = createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:12px;';
  const mode = cardShell('Mode', 'Suggested flow: Smart Regex + Master Validation, high-confidence only.'); mode.style.marginBottom = '0'; checkbox(mode, 'Enable Smart Regex mode', cfg.enabled, (v) => { cfg.enabled = v; }); const modeRow = createElement('label'); modeRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;color:#cbd5e1;margin-bottom:8px;'; modeRow.append(document.createTextNode('Smart mode:'), selectBox(cfg.mode, [['suggest-only', 'Suggest only'], ['suggest-and-validate', 'Suggest + validate'], ['validate-and-apply-high-confidence', 'Validate + apply high confidence']], (v) => { cfg.mode = v; })); mode.appendChild(modeRow); checkbox(mode, 'Apply high-confidence only', cfg.applyHighConfidenceOnly, (v) => { cfg.applyHighConfidenceOnly = v; }); const conf = createElement('label'); conf.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;color:#cbd5e1;'; conf.append(document.createTextNode('Minimum confidence:'), numberInput(cfg.minimumConfidence, (v) => { cfg.minimumConfidence = v; }, 100)); mode.appendChild(conf);
  const validation = cardShell('Validation', 'Controls which evidence Smart Mode must check before applying or reporting confidence.'); validation.style.marginBottom = '0'; checkbox(validation, 'Validate line key against Line List', cfg.validateLineKey, (v) => { cfg.validateLineKey = v; }); checkbox(validation, 'Validate bore pattern / bore token', cfg.validateBore, (v) => { cfg.validateBore = v; }); checkbox(validation, 'Validate piping class token', cfg.validatePipingClass, (v) => { cfg.validatePipingClass = v; }); checkbox(validation, 'Ignore branch suffix such as /B3', cfg.ignoreBranchSuffix, (v) => { cfg.ignoreBranchSuffix = v; }); checkbox(validation, 'Produce approval report', cfg.approvalReport, (v) => { cfg.approvalReport = v; }); grid.append(mode, validation); panel.appendChild(grid);
  const preview = cardShell('Smart token decision preview', 'Example for /ASIM-1885-PL-10"-CS-S8810105-01/B3. The Regex Tester phase consumes this config.'); const table = createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;'; const body = createElement('tbody'); for (const row of [['#4 10"', 'Bore', 'Very high', 'Quoted inch bore token'], ['#6 S8810105', 'Line number candidate', 'High', 'Alpha-numeric line number shape'], ['#7 01', 'Line suffix candidate', 'Medium', 'Sequence/suffix token'], ['#5 CS', 'Material / class candidate', 'Review', 'Do not auto-apply as piping class unless validated'], ['/B3', 'Branch suffix / ignore', 'High', 'Ignored when branch suffix setting is enabled'], ['Rating', 'blank', 'High', 'No safe rating token such as 150/300/600/CL150/PN16']]) { const tr = createElement('tr'); for (const value of row) tr.appendChild(Object.assign(createElement('td', value), { style: 'padding:5px;border-bottom:1px solid rgba(148,163,184,.12);color:#cbd5e1;' })); body.appendChild(tr); } table.appendChild(body); preview.appendChild(table); panel.appendChild(preview);
  const save = createElement('button', '💾 Save Smart Regex Config'); save.type = 'button'; save.style.cssText = 'background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:bold;cursor:pointer;'; save.addEventListener('click', () => saveConfig(stateRef, configObj, render)); panel.appendChild(save); card.appendChild(panel);
}

export function renderAdaptedConfigPanel(card, stateRef, render) {
  const active = renderTabRail(card, stateRef, render);
  if (active === 'autoMapFields') return renderAutoMapFieldsTab(card, stateRef, render);
  if (active === 'pipingClassActiveSet') return renderPipingClassActiveSetTab(card, stateRef, render);
  if (active === 'pipingClassMaterialCodes') return renderPipingClassMaterialCodeMapTab(card, stateRef, render);
  if (active === 'smartRegex') return renderSmartRegexTab(card, stateRef, render);
  return renderGeneralConfigPanel(card, stateRef, render);
}
