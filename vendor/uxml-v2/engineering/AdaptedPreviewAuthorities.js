// Ported from 3D_Converters v045/tabs/xml-cii-2019-standalone/ui-adapted/ xml-cii-adapted-preview-bore-wall-authority.js,
// -material-authority.js and -rating-authority.js: the three layers today's preview runs after its core, on the unmodified
// source XML (PlainElements, no DOM). Output fields only the preview table shows (evidence records, candidate lists,
// match reasons) are left out: no later step reads them. Today's default material rows arrive as rows (`defaultMaterialMapRows`).
import { childText as plainChildText, elementsByName } from '../supports/PlainDom.js';
import { resolveXmlCiiNodeDtxr } from '../supports/dtxr/ResolverCore.js';
import {
  buildPipingClassIndex, computeLineNoKey, deriveXmlCiiPipingClassFromBranchName, findBestPipingClassRow, formatValveHint, normalizeLineListRow,
  rankXmlCiiWeightCandidates, resolveConfiguredMaterialCode, resolveXmlCiiAutomaticRating, resolveXmlCiiRatingAuthority,
} from './index.js';
import { normalizeXmlCiiMaterialIdentity, resolveXmlCiiMaterialCodeFromMap } from './MaterialCodeFuzzy.js';
import { ratingKeys, rowText } from './AdaptedPreviewHelpers.js';
import {
  children, childText, collectIndexedStagedBranchWallEvidence, collectXmlBranchWallEvidence, findExactClassWall, indexStagedBranchWallEvidence,
  nodeBoreMm, resolveBranchNominalBore, resolveXmlCiiWallThicknessWithEvidence, text,
} from './WallEvidence.js';

const normalKey = (value) => text(value).toUpperCase().replace(/\s+/g, '');

// --- bore / wall ------------------------------------------------------------------------------------------------------
function wallClassSizeKey(row, boreMm) {
  const pipingClass = normalKey(row?.pipingClass || row?.pipingClassDerived);
  return pipingClass && Number.isFinite(Number(boreMm)) ? `PC:${pipingClass}|DN:${Math.round(Number(boreMm))}` : row?.wallThicknessKey;
}
function correctedRow(row, branch, stagedEvidenceIndex, config) {
  const localBores = branch ? [...new Set(children(branch, 'Node').map(nodeBoreMm).filter((bore) => Number.isFinite(bore) && bore > 0))] : [];
  const boreMm = localBores.length ? localBores[0] : resolveBranchNominalBore(row.branchName, row.sizeMm, config);
  const evidence = [...collectIndexedStagedBranchWallEvidence(stagedEvidenceIndex, row.branchName), ...(branch ? collectXmlBranchWallEvidence(branch) : [])];
  const dtxr = resolveXmlCiiWallThicknessWithEvidence({ boreMm, dtxrValues: evidence, config });
  const classWall = findExactClassWall(config, row.pipingClass || row.pipingClassDerived, boreMm);
  const authority = dtxr?.evidenceKind === 'DIRECT_WALL' ? dtxr : (classWall || dtxr);
  const result = { ...row, sizeMm: boreMm, size: boreMm ? `${boreMm}mm` : row.size, mixedDiameterBranch: localBores.length > 1, branchNodeNominalBoresMm: localBores,
    wallThicknessKey: wallClassSizeKey(row, boreMm) };
  if (authority) { result.wallThickness = Number(authority.wallThicknessMm.toPrecision(6)).toString(); result.wallThicknessSource = authority.source; }
  Object.assign(result, { dtxrWallThickness: dtxr?.wallThicknessMm || '', dtxrWallSchedule: dtxr?.schedule || '', dtxrWallSource: dtxr?.source || '', dtxrWallDtxr: dtxr?.dtxr || '',
    dtxrWallEvidenceKind: dtxr?.evidenceKind || '' });
  return result;
}
function correctNodeRows(nodeRows, root) {
  const bores = new Map();
  for (const branch of elementsByName(root, 'Branch')) {
    const branchName = childText(branch, 'Branchname');
    for (const node of children(branch, 'Node')) {
      bores.set([branchName, childText(node, 'NodeNumber'), childText(node, 'ComponentRefNo').replace(/^=/, ''), childText(node, 'Endpoint')].join('::'), nodeBoreMm(node));
    }
  }
  return (nodeRows || []).map((row) => {
    const boreMm = bores.get([row.branchName, row.nodeNumber, text(row.componentRefNo).replace(/^=/, ''), row.endpoint].join('::'));
    return Number.isFinite(boreMm) ? { ...row, boreMm } : row;
  });
}
/** Branch DN from the node ODs, wall from DIRECT DTXR wall > piping-class row for that DN > DTXR schedule; node row DN. */
export function applyPreviewBoreWallAuthority({ root, stagedJsonText, config = {}, result }) {
  if (!result || !Array.isArray(result.branchRows)) return result;
  const branches = new Map(elementsByName(root, 'Branch').map((branch) => [childText(branch, 'Branchname'), branch]));
  const stagedEvidenceIndex = indexStagedBranchWallEvidence(stagedJsonText);
  return { ...result, branchRows: result.branchRows.map((row) => correctedRow(row, branches.get(row.branchName), stagedEvidenceIndex, config)),
    nodeRows: correctNodeRows(result.nodeRows, root) };
}

// --- material code ----------------------------------------------------------------------------------------------------
const materialClassKey = (row) => { const pc = normalKey(row?.pipingClass || row?.pipingClassDerived || row?.resolvedPipingClass); return pc ? `PC:${pc}` : ''; };
function materialClassSizeKey(row) {
  const key = materialClassKey(row), bore = Number(row?.sizeMm ?? text(row?.size).replace(/[^0-9.+-]/g, ''));
  return key && Number.isFinite(bore) && bore > 0 ? `${key}|DN:${Math.round(bore)}` : key;
}
function materialOverride(config, row) {
  const bucket = config?.overrides?.materialCode;
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return null;
  const keys = [...new Set([row?.materialCodeKey, materialClassSizeKey(row), materialClassKey(row), row?.lineKey, row?.branchName, row?.material].map(text).filter(Boolean))];
  for (const key of keys) { const value = text(bucket[key]); if (value) return { key, value }; }
  return null;
}
function materialScopedOverride(record, material) {
  if (!record?.key || !material) return false;
  const identity = normalizeXmlCiiMaterialIdentity(material);
  const key = normalKey(record.key).replace(/^MAT(?:ERIAL)?:/, '');
  return key === normalKey(material) || key === identity.compact || key === normalKey(identity.canonical);
}
const lineKeyAliases = (value) => { const c = normalKey(value); return c ? [...new Set([c, c.replace(/^[A-Z](?=\d{5,}$)/, '')].filter(Boolean))] : []; };
function processLineListMaterial(row, config) {
  const direct = text(row?.processMaterial || row?.lineListMaterial);
  if (direct) return direct;
  const rows = Array.isArray(config?.linelist?.masterRows) ? config.linelist.masterRows : [];
  const fieldMap = config?.linelist?.fieldMap || {};
  const wanted = new Set([...lineKeyAliases(row?.lineKey), ...lineKeyAliases(row?.lineKeyProposed)]);
  if (!wanted.size) return '';
  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index], normalized = normalizeLineListRow(raw, fieldMap, index);
    if (!lineKeyAliases(computeLineNoKey(raw, fieldMap) || normalized.lineKey).some((alias) => wanted.has(alias))) continue;
    return text(normalized.material || raw?.material || raw?.Material || raw?.MATERIAL || raw?.MOC || raw?.['Material Name'] || raw?.Material_Name);
  }
  return '';
}
const manualMaterial = (row) => (text(row?.materialSource).toLowerCase().includes('override') ? text(row?.material) : '');
const nonClassMaterial = (row) => { const m = text(row?.material); return !m || text(row?.materialSource).toLowerCase().includes('piping-class') ? '' : m; };
const unresolved = (material, override) => (material ? { material, materialSource: 'process-linelist-material', materialCode: '' }
  : override ? { material: '', materialSource: 'material-code-override', materialCode: override.value } : { material: '', materialSource: 'unresolved', materialCode: '' });

/** Today's material code: line-list / process material through the material map, else the piping-class fallback. */
export function resolvePreviewMaterialCodeAuthority(row, config = {}, defaultMaterialMapRows = []) {
  const processMaterial = manualMaterial(row) || processLineListMaterial(row, config) || nonClassMaterial(row);
  const materialRows = Array.isArray(config?.material?.mapRows) && config.material.mapRows.length ? config.material.mapRows : defaultMaterialMapRows;
  const fuzzyConfig = config?.materialCodeFuzzy || config?.material?.fuzzy || {};
  const override = materialOverride(config, { ...row, material: processMaterial || row?.material });
  if (processMaterial) {
    const resolved = resolveXmlCiiMaterialCodeFromMap(processMaterial, materialRows, fuzzyConfig);
    const threshold = Number.isFinite(Number(fuzzyConfig.overrideConflictThreshold)) ? Number(fuzzyConfig.overrideConflictThreshold) : 0.92;
    const materialSource = manualMaterial(row) ? 'override' : 'process-linelist-material';
    if (override && materialScopedOverride(override, processMaterial)) return { material: processMaterial, materialSource, materialCode: override.value };
    if (!!resolved.materialCode && resolved.confidence >= threshold && !resolved.ambiguous) return { material: processMaterial, materialSource, materialCode: resolved.materialCode };
    return unresolved(processMaterial, override);
  }
  if (override) return unresolved('', override);
  const fallback = resolveConfiguredMaterialCode({ pipingClass: text(row?.pipingClass || row?.pipingClassDerived || row?.resolvedPipingClass), config });
  if (fallback) return { material: text(fallback.materialName), materialSource: 'piping-class-fallback', materialCode: text(fallback.materialCode) };
  return unresolved('', null);
}
export function applyPreviewMaterialCodeAuthority({ config = {}, result, defaultMaterialMapRows = [] } = {}) {
  const branchRows = Array.isArray(result?.branchRows) ? result.branchRows : [];
  if (!branchRows.length) return result || { branchRows: [], nodeRows: [] };
  return { ...result, branchRows: branchRows.map((row) => ({ ...row, ...resolvePreviewMaterialCodeAuthority(row, config, defaultMaterialMapRows) })) };
}

// --- rating -----------------------------------------------------------------------------------------------------------
const BLOCKED_DTXR_RATING_TYPES = new Set(['SUPPORT', 'RESTRAINT', 'ATTA', 'GASK']);
function branchDtxrEvidence(branch, stagedIndex, config, root) {
  const out = [];
  for (const node of children(branch, 'Node')) {
    const componentType = plainChildText(node, 'ComponentType'), componentRefNo = plainChildText(node, 'ComponentRefNo');
    if (BLOCKED_DTXR_RATING_TYPES.has(componentType.toUpperCase())) continue;
    for (const key of ['DTXR', 'DTXR_POS', 'TEEDESC_POS', 'DTXR_PS']) { const dtxr = plainChildText(node, key); if (dtxr) out.push({ dtxr, source: `xml-${key.toLowerCase()}`, componentType, componentRefNo }); }
    const resolved = resolveXmlCiiNodeDtxr(node, stagedIndex, config, root);
    if (resolved?.value) out.push({ dtxr: resolved.value, source: resolved.source || 'staged-dtxr', componentType, componentRefNo });
  }
  const seen = new Set();
  return out.filter((item) => { const key = `${item.dtxr}\u0000${item.source}\u0000${item.componentType}\u0000${item.componentRefNo}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
function ratingOverrideRecord(config, keys) {
  const rating = config?.overrides?.rating;
  if (rating && typeof rating === 'object' && !Array.isArray(rating)) for (const key of keys) { const value = text(rating[key]); if (value) return { value, key }; }
  const processData = config?.overrides?.processData;
  if (processData && typeof processData === 'object' && !Array.isArray(processData)) for (const key of keys) { const value = text(processData[key]?.rating); if (value) return { value, key }; }
  return { value: '', key: '' };
}
function pipingClassRating(row, pipingClassIndex, config) {
  const pipingClass = text(row?.pipingClass || row?.pipingClassDerived), boreMm = Number(row?.sizeMm);
  if (!pipingClass || !Number.isFinite(boreMm) || boreMm <= 0) return '';
  const match = findBestPipingClassRow({ pipingClass, boreMm, componentType: 'PIPE', rating: '', schedule: '', pipingClassIndex, overrides: config?.overrides || {}, config });
  return rowText(match?.row, ['rating', 'Rating', 'RATING', 'Pressure Class', 'classRating', 'Class Rating', 'PRESSURE_CLASS']);
}
function rerankNodeRows(nodeRows, branchRows, config) {
  const byBranch = new Map(branchRows.map((row) => [row.branchName, row]));
  return (nodeRows || []).map((nodeRow) => {
    const rating = text(byBranch.get(nodeRow.branchName)?.rating || '');
    const empty = { ...nodeRow, rating, valveHint: '', weightMatch: null, weightCandidates: [], rejectedWeightCandidates: [] };
    if (!rating || !Number.isFinite(Number(nodeRow.boreMm)) || !Number.isFinite(Number(nodeRow.lengthMm))) return empty;
    const ranking = rankXmlCiiWeightCandidates({ boreMm: nodeRow.boreMm, rating, lengthMm: nodeRow.lengthMm, nodeName: nodeRow.nodeName || '', componentType: nodeRow.componentType || nodeRow.type || '',
      componentRefNo: nodeRow.componentRefNo || '', dtxr: nodeRow.dtxr || '' }, config, { includeRejected: true });
    const candidates = ranking.candidates.slice(0, 5);
    const selectedWeight = Number(nodeRow.weightMatch?.selectedWeight ?? nodeRow.weightMatch?.weight);
    const weightMatch = nodeRow.weightMatch?.selectedOverride === true && Number.isFinite(selectedWeight) && selectedWeight > 0
      ? { ...(candidates[0] || nodeRow.weightMatch || {}), selectedWeight, suggestedWeight: selectedWeight, weight: selectedWeight, selectedOverride: true } : (ranking.best || null);
    return { ...nodeRow, rating, valveHint: formatValveHint(ranking.nodeHint), weightMatch, weightCandidates: candidates, rejectedWeightCandidates: ranking.rejectedCandidates.slice(0, 3) };
  });
}
/** Today's rating: manual > piping-class row > DTXR evidence > automatic; then node weight candidates re-ranked by it. */
export function applyPreviewRatingAuthority({ root, config = {}, stagedIndex, result }) {
  const branchRows = Array.isArray(result?.branchRows) ? result.branchRows : [];
  if (!branchRows.length) return result || { branchRows: [], nodeRows: [] };
  const branches = elementsByName(root, 'Branch');
  const pipingClassIndex = buildPipingClassIndex(config?.pipingClass?.masterRows || []);
  const ratedRows = branchRows.map((row, index) => {
    const branch = branches[index] || branches.find((item) => plainChildText(item, 'Branchname') === row.branchName);
    const branchPipingClass = deriveXmlCiiPipingClassFromBranchName(row.branchName, config);
    const manual = ratingOverrideRecord(config, ratingKeys(row));
    const pipingClass = text(row.pipingClass || branchPipingClass || row.pipingClassDerived);
    const classRating = pipingClassRating({ ...row, pipingClass }, pipingClassIndex, config);
    const dtxrValues = branch ? branchDtxrEvidence(branch, stagedIndex, config, root) : [];
    const authority = resolveXmlCiiRatingAuthority({ manualRating: manual.value, pipingClassRating: classRating, pipingClass, branchName: row.branchName, config, dtxrValues });
    const automatic = resolveXmlCiiAutomaticRating({ pipingClassRating: classRating, pipingClass, branchName: row.branchName, config });
    const fetched = !!manual.key && !!config?.overrides?.__dtxrRatingKeys?.[manual.key];
    return { ...row, pipingClassDerived: branchPipingClass || row.pipingClassDerived, pipingClassSource: branchPipingClass ? 'branch-name' : (row.pipingClassSource || 'line-list'),
      rating: authority.rating || '', ratingDerived: automatic.rating || '', ratingSource: fetched ? 'dtxr-rating-fetched' : authority.source };
  });
  return { ...result, branchRows: ratedRows, nodeRows: rerankNodeRows(result?.nodeRows || [], ratedRows, config) };
}
