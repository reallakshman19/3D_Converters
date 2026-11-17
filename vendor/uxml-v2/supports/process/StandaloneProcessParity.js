// Ported from 3D_Converters v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js lines 25-220
// (applyStandaloneProcessParity, nodeWallThicknessForSize, mappedNodeWeights): after the DTXR step today writes its standalone
// preview rows into the XML. Per matched branch: Pressure1, HydroPressure, Temperature1-3, FluidDensity, MaterialNumber;
// per node: PipingClass, Rating, MaterialName, MaterialCode, WallThickness for the node's own size, CorrosionAllowance, and a
// matched weight where the node has none. On PlainElements, no DOM. The expected-entry list today builds for its run-parity
// evidence check is not ported here (that check gates today's engine input; it changes no value).
import { childText, childrenByName, createElement, elementsByName, firstChild, parsePlainXml, serializePlainXml } from '../PlainDom.js';
import { adaptedDryRunPreview } from '../../engineering/AdaptedPreview.js';
import { xmlCiiClassSizeKey } from '../../engineering/index.js';
import { findExactClassWall, nodeBoreMm } from '../../engineering/WallEvidence.js';

const text = (value) => (value === undefined || value === null ? '' : String(value));
function ensureChild(parent, name) {
  let element = firstChild(parent, name);
  if (element) return element;
  element = createElement(name);
  parent.kids.push(element);
  return element;
}
function setChildText(parent, name, value) {
  const clean = text(value).trim();
  if (!clean) return false;
  ensureChild(parent, name).kids = [{ __text: clean }];
  return true;
}
// Today's character class (`.+-e` is the range '+'..'e'), kept as is.
function numeric(value) {
  const n = Number(text(value).replace(/[^0-9.+-eE]/g, ''));
  return Number.isFinite(n) ? n : null;
}

const WEIGHT_BEARING_TYPES = new Set(['FLAN', 'VALV', 'RIGID', 'INST']);
function mappedNodeWeights(nodeRows, config) {
  const weights = new Map();
  for (const nr of nodeRows || []) {
    if (!WEIGHT_BEARING_TYPES.has(text(nr.componentType).toUpperCase())) continue;
    const override = Number(config?.overrides?.rigidWeight?.[nr.key]);
    const auto = nr.weightMatch && !nr.weightMatch.zeroFallback ? Number(nr.weightMatch.weight) : NaN;
    const weight = Number.isFinite(override) && override > 0 ? override : (Number.isFinite(auto) && auto > 0 ? auto : null);
    if (weight !== null) weights.set(`${text(nr.branchName)}|${text(nr.nodeNumber)}`, weight);
  }
  return weights;
}

/** Owner 11 Nov: each node's own size picks its wall (class+size override, branch value at the branch size, class row). */
export function nodeWallThicknessForSize(row, node, config) {
  const nodeBore = nodeBoreMm(node);
  const branchBore = Number(row?.sizeMm);
  if (!Number.isFinite(nodeBore) || nodeBore <= 0) return { value: row?.wallThickness, source: 'branch' };
  const pipingClass = text(row?.pipingClass || row?.pipingClassDerived);
  const key = xmlCiiClassSizeKey(pipingClass, nodeBore);
  const overrides = config?.overrides?.wallThickness || {};
  if (key && numeric(overrides[key]) !== null && numeric(overrides[key]) > 0) return { value: overrides[key], source: 'class-size-override', key };
  if (Number.isFinite(branchBore) && Math.round(branchBore) === Math.round(nodeBore)) return { value: row?.wallThickness, source: 'branch' };
  const classWall = findExactClassWall(config, pipingClass, nodeBore);
  if (classWall) return { value: String(classWall.wallThicknessMm), source: 'piping-class-master-node-size', key };
  return { value: null, source: 'no-class-row-for-node-size', key };
}

const valid = (kind, value) => (kind === 'number' ? numeric(value) !== null : text(value).trim() !== '');
function writeBranch(branch, row) {
  const pressure = ensureChild(branch, 'Pressure'), temperature = ensureChild(branch, 'Temperature');
  const writes = [[pressure, 'Pressure1', row.p1, 'number'], [pressure, 'HydroPressure', row.hydroPressure, 'number'], [temperature, 'Temperature1', row.t1, 'number'],
    [temperature, 'Temperature2', row.t2, 'number'], [temperature, 'Temperature3', row.t3, 'number'], [branch, 'FluidDensity', row.density, 'number'],
    [branch, 'MaterialNumber', row.materialCode, 'text']];
  return writes.filter(([owner, name, value, kind]) => valid(kind, value) && setChildText(owner, name, value)).length;
}
function writeNodes(branch, branchName, row, config, nodeWeights, wallBySize) {
  let fields = 0;
  for (const node of childrenByName(branch, 'Node')) {
    const nodeNumber = childText(node, 'NodeNumber');
    const nodeWall = nodeWallThicknessForSize(row, node, config);
    if (nodeWall.source !== 'branch') wallBySize.push({ branchName, nodeNumber, ...nodeWall });
    const writes = [['PipingClass', row.pipingClass, 'text'], ['Rating', row.rating, 'text'], ['MaterialName', row.material, 'text'], ['MaterialCode', row.materialCode, 'text'],
      ['WallThickness', nodeWall.value, 'number'], ['CorrosionAllowance', row.corrosion, 'number']];
    fields += writes.filter(([name, value, kind]) => valid(kind, value) && setChildText(node, name, value)).length;
    const mapped = nodeWeights.get(`${branchName}|${nodeNumber}`);
    const existingWeight = numeric(childText(node, 'Weight'));
    if (mapped !== undefined && (existingWeight === null || existingWeight === 0) && setChildText(node, 'Weight', mapped)) fields += 1;
  }
  return fields;
}

/**
 * Today's process parity on `xmlText` (the XML after the DTXR step), with the raw job `config`.
 * Returns { xmlText, branchRows, nodeRows, appliedFields, nodeWallBySize }; pushes today's two diagnostics.
 */
export function applyStandaloneProcessParity(xmlText, config, stagedJsonText, diagnostics, { defaultMaterialMapRows = [] } = {}) {
  const preview = adaptedDryRunPreview(xmlText, config, stagedJsonText || '', { defaultMaterialMapRows });
  const result = { xmlText, branchRows: preview.branchRows || [], nodeRows: preview.nodeRows || [], appliedFields: 0, nodeWallBySize: [] };
  if (!result.branchRows.length) return result;
  const nodeWeights = mappedNodeWeights(result.nodeRows, config);
  const byBranch = new Map(result.branchRows.map((row) => [text(row.branchName), row]));
  const doc = parsePlainXml(xmlText);
  for (const branch of elementsByName(doc.root, 'Branch')) {
    const branchName = childText(branch, 'Branchname');
    const row = byBranch.get(branchName);
    if (!row) continue;
    result.appliedFields += writeBranch(branch, row) + writeNodes(branch, branchName, row, config, nodeWeights, result.nodeWallBySize);
  }
  if (result.nodeWallBySize.length) {
    const missing = result.nodeWallBySize.filter((item) => item.value === null).length, count = result.nodeWallBySize.length;
    diagnostics.push({ type: 'standalone-node-wall-by-size', severity: missing ? 'warning' : 'info', count, missing,
      message: `${count} node(s) on mixed-diameter branches use the wall for their own size` + (missing ? `; ${missing} have no piping-class row for their size and keep the source wall.` : '.') });
  }
  if (!result.appliedFields) return result;
  diagnostics.push({ type: 'standalone-process-parity-applied', fields: result.appliedFields,
    message: 'Branch process and node facts were synchronised from the standalone Preview and Weight Match authorities.' });
  result.xmlText = serializePlainXml(doc);
  return result;
}
