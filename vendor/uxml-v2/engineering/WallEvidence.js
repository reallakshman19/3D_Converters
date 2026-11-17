// Ported from 3D_Converters v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js (whole) and
// converters/xml-cii2019-core/dtxr-wall-evidence-ledger.js (resolveXmlCiiWallThicknessWithEvidence, the resolution only):
// the wall-thickness evidence today's preview bore/wall layer reads. On PlainElements, no DOM. The ledger's per-record
// evidence list (dispositions) is shown only in the preview table; no later step reads it, so it is not ported.
import { childrenByName, textContent } from '../supports/PlainDom.js';
import { resolveXmlCiiWallThicknessFromDtxr } from './DtxrWallThickness.js';

export const text = (value) => (value === undefined || value === null ? '' : String(value).trim());
const norm = (value) => text(value).toUpperCase().replace(/\s+/g, '');
export const children = (parent, name) => childrenByName(parent, name);
export const childText = (parent, name) => text(textContent(children(parent, name)[0]));

const OD_TO_DN = [[60.3, 50], [88.9, 80], [114.3, 100], [168.3, 150], [219.1, 200], [273, 250], [323.9, 300], [355.6, 350], [406.4, 400], [457.2, 450], [508, 500], [610, 600]];
const DEFAULT_NPS_TO_DN = Object.freeze({ '0.5': 15, '0.75': 20, '1': 25, '1.25': 32, '1.5': 40, '2': 50, '2.5': 65, '3': 80, '4': 100, '6': 150, '8': 200,
  '10': 250, '12': 300, '14': 350, '16': 400, '18': 450, '20': 500, '24': 600 });
const CLASS_WALL_CORRECTIONS = Object.freeze({
  '96620|250': Object.freeze({ wallThicknessMm: 15.09, schedule: '80', source: 'benchmark-correction', authority: 'P1110502 10-inch benchmark 2026-07-22' }),
});

function dnFromOd(value) {
  const od = Number(value);
  if (!Number.isFinite(od) || od <= 0) return null;
  let best = null;
  for (const [candidate, dn] of OD_TO_DN) { const error = Math.abs(od - candidate); if (!best || error < best.error) best = { dn, error, candidate }; }
  return best && best.error <= Math.max(1.5, best.candidate * 0.006) ? best.dn : null;
}
function numericMm(value) {
  const hit = text(value).match(/\d+(?:\.\d+)?/);
  const result = hit ? Number(hit[0]) : NaN;
  return Number.isFinite(result) && result > 0 ? result : null;
}
/** Node DN: from a positive OD only (null when it has no table entry), else the node's BoreMm / Bore. */
export function nodeBoreMm(node) {
  const odRaw = childText(node, 'OutsideDiameter') || childText(node, 'OuterDiameter') || childText(node, 'OD');
  if (Number(odRaw) > 0) return dnFromOd(odRaw);
  return numericMm(childText(node, 'BoreMm') || childText(node, 'Bore'));
}
const npsToDnMap = (config) => (config?.weight?.npsToDn && typeof config.weight.npsToDn === 'object' ? config.weight.npsToDn : DEFAULT_NPS_TO_DN);
export function resolveBranchNominalBore(branchName, fallbackBore, config = {}) {
  const hit = text(branchName).match(/-(\d+(?:\.\d+)?)\s*"(?=-)/);
  const mapped = Number(npsToDnMap(config)[hit ? String(Number(hit[1])) : '']);
  if (Number.isFinite(mapped) && mapped > 0) return mapped;
  const fallback = Number(fallbackBore);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}
const componentEvidence = (componentType, componentRefNo, boreMm, dtxr, source) => (text(dtxr) ? { componentType, componentRefNo, boreMm, dtxr: text(dtxr), source } : null);

export function collectXmlBranchWallEvidence(branch) {
  const evidence = [];
  for (const node of children(branch, 'Node')) {
    const type = childText(node, 'ComponentType'), ref = childText(node, 'ComponentRefNo'), boreMm = nodeBoreMm(node);
    for (const key of ['DTXR', 'DTXR_POS', 'TEEDESC_POS', 'DTXR_PS']) {
      const item = componentEvidence(type, ref, boreMm, childText(node, key), `xml-${key.toLowerCase()}`);
      if (item) evidence.push(item);
    }
  }
  return evidence;
}
const canonicalBranch = (value) => norm(value).replace(/^=/, '').replace(/\/B\d+$/i, '');
function attr(attrs, keys) {
  for (const key of keys) {
    const found = Object.entries(attrs || {}).find(([name]) => norm(name) === norm(key));
    if (found && text(found[1])) return found[1];
  }
  return '';
}
function stagedBoreMm(attrs) {
  const values = ['ABORE', 'LBORE', 'HBOR', 'TBOR'].map((key) => numericMm(attr(attrs, [key]))).filter(Number.isFinite);
  return values.length ? Math.max(...values) : dnFromOd(attr(attrs, ['OD', 'OUTSIDEDIAMETER']));
}
function walkStaged(value, branchName, out) {
  if (Array.isArray(value)) { value.forEach((item) => walkStaged(item, branchName, out)); return; }
  if (!value || typeof value !== 'object') return;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = text(value.type || attr(attrs, ['TYPE'])).toUpperCase();
  const owner = text(attr(attrs, ['OWNER']) || branchName);
  const currentBranch = type === 'BRANCH' ? text(value.name || attr(attrs, ['NAME']) || owner) : owner;
  out.push({ value, attrs, type, branchName: currentBranch });
  if (Array.isArray(value.children)) value.children.forEach((child) => walkStaged(child, currentBranch, out));
}
/** Staged branch wall facts indexed once by canonical branch, in walk order, duplicates kept. */
export function indexStagedBranchWallEvidence(stagedJsonText) {
  let parsed;
  try { parsed = typeof stagedJsonText === 'string' ? JSON.parse(stagedJsonText) : stagedJsonText; } catch { return new Map(); }
  const items = [];
  walkStaged(parsed, '', items);
  const index = new Map();
  for (const { value, attrs, type, branchName: owner } of items) {
    const root = canonicalBranch(owner);
    if (!root || type === 'BRANCH') continue;
    const item = componentEvidence(type, attr(attrs, ['REF', 'NAME']), stagedBoreMm(attrs), attr(attrs, ['DTXR_POS', 'DTXR', 'DESC', 'DESCRIPTION']) || value.name, 'staged-json');
    if (!item) continue;
    if (!index.has(root)) index.set(root, []);
    index.get(root).push(item);
  }
  return index;
}
export const collectIndexedStagedBranchWallEvidence = (index, branchName) => index?.get(canonicalBranch(branchName)) || [];

function readRow(row, keys) {
  for (const key of keys) { const value = row?.[key] ?? row?._raw?.[key]; if (text(value)) return value; }
  return '';
}
function rowBoreMm(row, config) {
  const converted = Number(readRow(row, ['convertedBore', 'Converted Bore', 'DN', 'NB']));
  if (Number.isFinite(converted) && converted > 0) return converted;
  const mapped = Number(npsToDnMap(config)[String(Number(readRow(row, ['Size', 'NPS', 'Nominal Size'])))]);
  return Number.isFinite(mapped) && mapped > 0 ? mapped : null;
}
/** The piping-class master row's wall for exactly this class and DN (a recorded benchmark correction first), or null. */
export function findExactClassWall(config, pipingClass, boreMm) {
  const correction = CLASS_WALL_CORRECTIONS[`${norm(pipingClass)}|${Number(boreMm)}`];
  if (correction) return correction;
  const rows = Array.isArray(config?.pipingClass?.masterRows) ? config.pipingClass.masterRows : [];
  const match = rows.find((row) => norm(readRow(row, ['Piping Class', 'pipingClass', 'PIPING_CLASS'])) === norm(pipingClass) && rowBoreMm(row, config) === Number(boreMm));
  const wall = Number(readRow(match, ['Wall thickness', 'Wall Thickness', 'wallThickness', 'THK', 'Thickness']));
  if (!match || !Number.isFinite(wall) || wall <= 0) return null;
  return { wallThicknessMm: wall, schedule: text(readRow(match, ['SCH', 'Schedule', 'schedule'])), source: 'piping-class-master', matchedRow: match };
}

/** Today's ledger resolution: the DTXR wall resolver on all evidence for the target bore (null when none resolves). */
export function resolveXmlCiiWallThicknessWithEvidence({ boreMm, dtxrValues = [], config = {} } = {}) {
  const inputValues = Array.isArray(dtxrValues) ? dtxrValues : [dtxrValues];
  return resolveXmlCiiWallThicknessFromDtxr({ boreMm: Number(boreMm), dtxrValues: inputValues, config }) || null;
}
