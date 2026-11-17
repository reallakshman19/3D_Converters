// Ported from 3D_Converters v045/converters/xml-cii2019-core/staged-geometry-authority.js lines 4-27 (index and node
// lookup only; the geometry authority pass itself is not here). Staged JSON components by ref -> length and bore.
import { childText } from '../supports/PlainDom.js';

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());
function numberValue(value) {
  const match = text(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}
const normalizeRef = (value) => text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
const normalizeType = (value) => text(value).toUpperCase();
function parsePoint(point) {
  if (!point && point !== 0) return null;
  if (Array.isArray(point) && point.length >= 3) {
    const x = Number(point[0]), y = Number(point[1]), z = Number(point[2]);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  if (typeof point === 'object') {
    const x = Number(point.x ?? point.X), y = Number(point.y ?? point.Y), z = Number(point.z ?? point.Z);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  const nums = text(point).match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return nums.length >= 3 ? { x: nums[0], y: nums[1], z: nums[2] } : null;
}
function pointDistance(a, b) {
  const pa = parsePoint(a), pb = parsePoint(b);
  if (!pa || !pb) return null;
  const length = Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z);
  return Number.isFinite(length) && length > 0 ? length : null;
}
function readAttr(attrs, names) {
  const entries = Object.entries(attrs || {});
  for (const wanted of names) {
    const direct = attrs?.[wanted];
    if (text(direct)) return direct;
    const upper = wanted.toUpperCase();
    for (const [key, value] of entries) if (key.toUpperCase() === upper && text(value)) return value;
  }
  return '';
}
function stagedLengthMm(attrs) {
  for (const [fromKey, toKey] of [['APOS', 'LPOS'], ['HPOS', 'TPOS'], ['BPOS', 'TPOS'], ['SPOS', 'EPOS']]) {
    const length = pointDistance(readAttr(attrs, [fromKey]), readAttr(attrs, [toKey]));
    if (length !== null) return length;
  }
  return numberValue(readAttr(attrs, ['LENGTH', 'Length', 'LEN', 'lengthMm', 'ElementLengthMm']));
}
function stagedBoreMm(attrs) {
  const values = ['ABORE', 'LBORE', 'PBORE', 'HBORE', 'TBORE', 'HBOR', 'TBOR', 'BORE', 'DN', 'NB']
    .map((key) => numberValue(readAttr(attrs, [key]))).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return null;
  return values.find((value) => value < 1000) || values[0];
}
const stagedDtxr = (attrs, component) => text(readAttr(attrs, ['DTXR_POS', 'DTXR', 'DESC', 'DESCRIPTION', 'NAME']) || component?.name || '');
function walkStaged(value, branchName = '', out = []) {
  if (Array.isArray(value)) { value.forEach((item) => walkStaged(item, branchName, out)); return out; }
  if (!value || typeof value !== 'object') return out;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = normalizeType(value.type || attrs.TYPE || attrs.RAW_TYPE);
  const currentBranch = type === 'BRANCH' || Array.isArray(value.children) ? text(value.name || attrs.NAME || attrs.OWNER || branchName) : branchName;
  out.push({ component: value, attrs, type, branchName: currentBranch });
  if (Array.isArray(value.children)) value.children.forEach((child) => walkStaged(child, currentBranch, out));
  return out;
}

export function buildXmlCiiStagedGeometryIndex(stagedJsonText) {
  const index = { byRef: new Map(), count: 0 };
  if (!text(stagedJsonText)) return index;
  let parsed = null;
  try { parsed = typeof stagedJsonText === 'string' ? JSON.parse(stagedJsonText) : stagedJsonText; } catch { return index; }
  for (const item of walkStaged(parsed)) {
    const attrs = item.attrs || {};
    const refs = [readAttr(attrs, ['REF', 'ComponentRefNo', 'COMPONENTREFNO']), readAttr(attrs, ['NAME']), item.component?.name].map(normalizeRef).filter(Boolean);
    if (!refs.length) continue;
    const geometry = { ref: refs[0], rawRefs: refs, stagedType: item.type, branchName: item.branchName, lengthMm: stagedLengthMm(attrs), boreMm: stagedBoreMm(attrs), dtxr: stagedDtxr(attrs, item.component) };
    if (geometry.lengthMm === null && geometry.boreMm === null) continue;
    for (const ref of refs) if (!index.byRef.has(ref)) index.byRef.set(ref, geometry);
    index.count += 1;
  }
  return index;
}

export function resolveXmlCiiStagedGeometryForNode(node, stagedIndex) {
  if (!node || !stagedIndex?.byRef) return null;
  const ref = normalizeRef(childText(node, 'ComponentRefNo'));
  return ref ? stagedIndex.byRef.get(ref) || null : null;
}
