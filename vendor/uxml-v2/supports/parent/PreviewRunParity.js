// Ported from 3D_Converters v045/tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js
// (mergeDeep, configWithRuntimeOptions, setProcessBlock, setBranchNodeFacts, rowsByBranchName, processProvenanceDiagnostics
// and the row-writing part of applyPreviewRunParity): today writes its dry-run preview branch rows into the parent
// enrichment XML, before the in-line lengths and the split renumbering (ParentEnrichmentFinish.js).
// Per matched branch: Pressure1, HydroPressure, Temperature1-3, FluidDensity; per node PipingClass, Rating, BoreMm,
// WallThickness, CorrosionAllowance, MaterialName, MaterialCode; branch MaterialNumber.
import { childText, childrenByName, createElement, elementsByName, firstChild, textContent } from '../PlainDom.js';
import { previewBranchRows } from '../../engineering/PreviewBranchRows.js';

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());
const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const truthy = (value) => value === true || (typeof value === 'number' ? value !== 0 : /^(1|true|yes|on)$/i.test(text(value)));

export function mergeDeep(base, override) {
  if (!isObject(base)) return isObject(override) ? { ...override } : override;
  if (!isObject(override)) return { ...base };
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) out[key] = isObject(value) && isObject(out[key]) ? mergeDeep(out[key], value) : value;
  return out;
}

/** Today's configWithRuntimeOptions with the standalone parity options (split / condense flags from the job config). */
export function previewParityConfig(baseConfig, parsedSupportConfig, rawSupportConfig = {}) {
  const merged = mergeDeep(baseConfig || {}, parsedSupportConfig || {});
  const split = rawSupportConfig.splitCondensedValveFlange !== false;
  merged.condenseRigidXsd = rawSupportConfig.condenseRigidXsd === true || rawSupportConfig.condense_rigid_xsd === true;
  merged.splitCondensedValveFlange = split;
  merged.split_condensed_valve_flange = split;
  return merged;
}

function ensureChild(parent, name) {
  let element = firstChild(parent, name);
  if (element) return element;
  element = createElement(name);
  parent.kids.push(element);
  return element;
}
function setText(parent, name, value) {
  const clean = text(value);
  if (clean === '') return false;
  const element = ensureChild(parent, name);
  const before = text(textContent(element));
  element.kids = [{ __text: clean }];
  return before !== clean;
}
function numberText(value) {
  const clean = text(value);
  if (clean === '') return '';
  const numeric = Number(clean);
  return Number.isFinite(numeric) ? String(numeric) : clean;
}
function rowValue(row, ...keys) {
  for (const key of keys) { const value = row?.[key]; if (value !== undefined && value !== null && text(value) !== '') return value; }
  return '';
}

function setProcessBlock(branch, row) {
  let count = 0;
  const pressure = ensureChild(branch, 'Pressure');
  const temperature = ensureChild(branch, 'Temperature');
  if (setText(pressure, 'Pressure1', rowValue(row, 'p1', 'P1', 'pressure1', 'Pressure1'))) count += 1;
  const hydro = rowValue(row, 'hydroPressure', 'hydro_pressure', 'HydroPressure', 'Hydro Test Pressure', 'Test Pressure');
  if (hydro) { if (setText(pressure, 'HydroPressure', hydro)) count += 1; } else if (!childText(pressure, 'HydroPressure')) setText(pressure, 'HydroPressure', '0');
  if (setText(temperature, 'Temperature1', rowValue(row, 't1', 'T1', 'temperature1', 'Temperature1'))) count += 1;
  if (setText(temperature, 'Temperature2', rowValue(row, 't2', 'T2', 'temperature2', 'Temperature2'))) count += 1;
  if (setText(temperature, 'Temperature3', rowValue(row, 't3', 'T3', 'temperature3', 'Temperature3'))) count += 1;
  if (setText(branch, 'FluidDensity', rowValue(row, 'density', 'Density', 'fluidDensity', 'FluidDensity'))) count += 1;
  return count;
}

function setBranchNodeFacts(branch, row) {
  let count = 0;
  const pipingClass = rowValue(row, 'pipingClass', 'pipingClassResolved', 'resolvedPipingClass');
  const rating = rowValue(row, 'rating', 'branchRating');
  const boreMm = row?.sizeMm ?? row?.boreMm;
  const wallThickness = rowValue(row, 'wallThickness', 'wallThicknessMm', 'wallThk');
  const corrosion = rowValue(row, 'corrosion', 'corrosionAllowance', 'corrosionAllowanceMm');
  const material = rowValue(row, 'material', 'materialName');
  const materialCode = rowValue(row, 'materialCode', 'materialNumber');
  for (const node of childrenByName(branch, 'Node')) {
    if (setText(node, 'PipingClass', pipingClass)) count += 1;
    if (setText(node, 'Rating', rating)) count += 1;
    if (boreMm != null && text(boreMm) !== '' && setText(node, 'BoreMm', Number(boreMm).toFixed(3))) count += 1;
    if (setText(node, 'WallThickness', numberText(wallThickness))) count += 1;
    if (setText(node, 'CorrosionAllowance', numberText(corrosion))) count += 1;
    if (setText(node, 'MaterialName', material)) count += 1;
    if (setText(node, 'MaterialCode', materialCode)) count += 1;
  }
  if (setText(branch, 'MaterialNumber', materialCode)) count += 1;
  return count;
}

const normalizeBranchKey = (value) => text(value).toUpperCase().replace(/\s+/g, '');
function rowsByBranchName(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (text(row?.branchName)) map.set(text(row.branchName), row);
    const normalized = normalizeBranchKey(row?.branchName);
    if (normalized) map.set(normalized, row);
  }
  return map;
}

const PROVENANCE_FIELDS = [['p1', 'Pressure1 / P1 / Design Pressure'], ['hydroPressure', 'Hydro/Test Pressure'], ['t1', 'Temperature1 / T1'],
  ['t2', 'Temperature2 / T2'], ['t3', 'Temperature3 / T3'], ['density', 'FluidDensity / Density']];
function processProvenanceDiagnostics(row) {
  return PROVENANCE_FIELDS.map(([field, label]) => {
    const source = row?.[`${field}Source`] || 'none', sourceField = row?.[`${field}SourceField`] || '', finalValue = row?.[field] ?? '';
    const rowFound = row?.lineMiss ? 'no' : 'yes', sourceRowIndex = row?._sourceRowIndex || row?.lineListRowIndex || '';
    return { type: 'process-provenance', branchName: row?.branchName || '', lineKey: row?.lineKey || '', field, fieldLabel: label, lineListRowFound: rowFound,
      sourceRowIndex, method: source, sourceField, value: finalValue,
      message: `${label}: final=${text(finalValue) || '(blank)'}; source=${source}${sourceField ? `; field=${sourceField}` : ''}; rowFound=${rowFound}${row?._sourceRowIndex ? `; sourceRow=${row._sourceRowIndex}` : ''}` };
  });
}

/**
 * Today's preview run parity rows step, in place on `root` (the parent enrichment XML). The preview rows are built from
 * `sourceXmlText` (the XML the stage received), as today does. Returns { rows, branches, processFields, nodeFacts }.
 */
export function applyPreviewRunParityRows(root, { sourceXmlText, config, stagedJsonText = '', stats = {}, diagnostics = [] }) {
  const rows = previewBranchRows(sourceXmlText, config, stagedJsonText);
  if (!rows.length) { diagnostics.push({ type: 'preview-run-parity-skipped', reason: 'no-preview-branch-rows' }); return { rows, branches: 0 }; }
  const byBranch = rowsByBranchName(rows);
  let branches = 0, processFields = 0, nodeFacts = 0;
  const missedBranches = [], provenance = [];
  for (const branch of elementsByName(root, 'Branch')) {
    const branchName = childText(branch, 'Branchname');
    const row = byBranch.get(text(branchName)) || byBranch.get(normalizeBranchKey(branchName)) || null;
    if (!row) { if (branchName) missedBranches.push(branchName); continue; }
    branches += 1;
    processFields += setProcessBlock(branch, row);
    nodeFacts += setBranchNodeFacts(branch, row);
    provenance.push(...processProvenanceDiagnostics(row));
  }
  if (!branches) {
    diagnostics.push({ type: 'preview-run-parity-skipped', reason: 'no-branch-name-match', previewRows: rows.length, missedBranches: missedBranches.slice(0, 20) });
    return { rows, branches };
  }
  Object.assign(stats, { previewRunParityBranches: branches, previewRunParityProcessFields: processFields, previewRunParityNodeFacts: nodeFacts });
  stats.processAnnotations = Math.max(Number(stats.processAnnotations || 0), processFields);
  diagnostics.push(...provenance, { type: 'preview-run-parity-applied', branches, processFields, nodeFacts, previewRows: rows.length,
    missedBranches: missedBranches.slice(0, 20), message: 'Run/enriched XML was synchronised from the same dry-run preview resolver used by phase 3, including mapped Hydro/Test pressure and process provenance diagnostics.' });
  return { rows, branches, processFields, nodeFacts };
}
