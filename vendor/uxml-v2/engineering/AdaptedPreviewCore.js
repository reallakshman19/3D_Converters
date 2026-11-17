// Ported from 3D_Converters v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js lines 410-669
// (xmlCiiDryRunPreview and _xmlCiiDryRunNodeRow): today's standalone dry-run preview, the rows today's process parity writes
// after the DTXR step. On PlainElements, no DOM. Timing marks are not ported. Row fields only the preview table shows
// (piping-class candidates and scores, from/to, range originals, provenance badges) are left out: no later step reads them.
import { elementsByName, parsePlainXml } from '../supports/PlainDom.js';
import { buildStagedDtxrIndex, resolveXmlCiiNodeDtxr } from '../supports/dtxr/ResolverCore.js';
import {
  buildPipingClassIndex, createXmlCiiWeightBoreIndex, deriveLineKeyFromBranchName, formatValveHint, isXmlCiiWeightReviewNode,
  rankXmlCiiWeightCandidates, resolveBranchProcessData, resolveLineListDensity, xmlCiiNumberText, xmlCiiWeightReviewNodeOverrideKey,
} from './index.js';
import { resolveXmlCiiWallThicknessFromDtxr } from './DtxrWallThickness.js';
import {
  branchBoreFromFirstUsefulNode, branchXmlFallbackFacts, classKey, classSizeKey, deriveBoreFromBranchName, derivePipingClassFromBranchName,
  deriveRatingFromPipingClass, findLineListRow, findSimilarLineListRow, nominalDnFromOd, normaliseLineListMatch, overrideSource,
  pointDistanceMm, processDefaultValue, processSource, processValue, ratingOverride, resolveTemperatureRangeToMax, rowNumber, rowText,
  toText, uniqueKeys, xmlChildren, xmlText,
} from './AdaptedPreviewHelpers.js';

const P1_KEYS = ['p1', 'P1', 'Pressure1', 'Design Pressure', 'DesignPressure', 'Pressure Max kPa(g)', 'Pressure Max', 'PressureMax', 'P1 / Design Pressure'];
const HYDRO_KEYS = ['hydroPressure', 'hydro_pressure', 'HydroPressure', 'Hydro Test Pressure', 'Hydrotest Pressure', 'Hydro Pressure', 'Test Pressure', 'Pressure2', 'Hydro/Test Pressure'];
const T1_KEYS = ['t1', 'T1', 'Temperature1', 'Design Temp', 'Design Temperature', 'Temp Max ºC', 'Temp Max °C', 'Temp Max', 'T1 (ºC)'];
const T2_KEYS = ['t2', 'T2', 'Temperature2', 'Temp. ºC', 'Temp. °C', 'Operating Temp', 'Operating Temperature', 'T2 (ºC)'];
const T3_KEYS = ['t3', 'T3', 'Temperature3', 'Temp Min ºC', 'Temp Min °C', 'Temp Min', 'Minimum Temp', 'T3 (ºC)'];
const INS_KEYS = ['insThk', 'InsThk', 'Insulation Thickness', 'InsulationThickness', 'Insulation Thk'];

/** Today's node cleanup (parity with the node-block cleanup): drop gasket and short nodes from the preview's own copy. */
function dropCleanupNodes(el, config) {
  const thresholdMm = Math.max(0, Number(config.shortElementLengthDropThresholdMm ?? 6));
  const dropGask = config.disableGasketNodes === true || config.disableGasketInOutput === true || (config.dropGasketNodes !== false && config.dropGasketsInEnrichment !== false);
  const dropShort = config.dropShortElementLengthNodes !== false && thresholdMm > 0;
  const drop = (node) => {
    const explicitLength = xmlCiiNumberText(xmlText(node, 'ElementLengthMm'));
    return (dropGask && xmlText(node, 'ComponentType').toUpperCase() === 'GASK') || (dropShort && explicitLength !== null && explicitLength <= thresholdMm);
  };
  const walk = (parent) => {
    parent.kids = (parent.kids || []).filter((k) => !(k.__el === 'Node' && drop(k)));
    for (const k of parent.kids) if (k.__el && k.__el !== 'Node') walk(k);
  };
  walk(el);
}

function cachedNodeDtxr(node, stagedIndex, config, cache, root) {
  if (cache.has(node)) return cache.get(node);
  const resolved = resolveXmlCiiNodeDtxr(node, stagedIndex, config, root);
  cache.set(node, resolved);
  return resolved;
}
export function branchDtxrValues(branch, stagedIndex, config, cache, root) {
  const values = [];
  for (const node of xmlChildren(branch, 'Node')) {
    for (const key of ['DTXR', 'DTXR_POS', 'TEEDESC_POS', 'DTXR_PS']) { const v = xmlText(node, key); if (v) values.push(v); }
    const res = cachedNodeDtxr(node, stagedIndex, config, cache, root);
    if (res?.value) values.push(res.value);
  }
  return uniqueKeys(values);
}

function lineMatchOf(branchName, lineKey, config) {
  const exact = lineKey ? findLineListRow(lineKey, config) : null;
  if (exact) return { raw: exact, method: 'exact', confidence: 1, proposed: '' };
  const similar = findSimilarLineListRow(branchName, lineKey, config);
  if (similar) return { raw: { row: similar.row, index: similar.index }, method: similar.method, confidence: similar.confidence, proposed: similar.proposedKey };
  return { raw: null, method: 'none', confidence: 0, proposed: '' };
}

function processFields(lineListMatch, pdOverride, config) {
  const temp = (keys, field) => { const raw = processValue(pdOverride, lineListMatch, field, keys, config); const r = resolveTemperatureRangeToMax(raw); return r !== null ? String(r) : raw; };
  const hydro = processValue(pdOverride, lineListMatch, 'hydroPressure', HYDRO_KEYS, config);
  const densityInfo = resolveLineListDensity(lineListMatch, pdOverride);
  const defaultDensity = processDefaultValue(config, 'density');
  const insThk = processValue(pdOverride, lineListMatch, 'insThk', INS_KEYS, config);
  return {
    p1: processValue(pdOverride, lineListMatch, 'p1', P1_KEYS, config), hydroPressure: hydro || '0', t1: temp(T1_KEYS, 't1'), t2: temp(T2_KEYS, 't2'), t3: temp(T3_KEYS, 't3'),
    density: densityInfo.value || defaultDensity, densitySource: densityInfo.value ? densityInfo.source : (defaultDensity ? 'default' : 'none'),
    p1Source: processSource(pdOverride, lineListMatch, 'p1', P1_KEYS, config),
    hydroPressureSource: hydro ? processSource(pdOverride, lineListMatch, 'hydroPressure', HYDRO_KEYS, config) : 'default-zero',
    t1Source: processSource(pdOverride, lineListMatch, 't1', T1_KEYS, config), t2Source: processSource(pdOverride, lineListMatch, 't2', T2_KEYS, config),
    t3Source: processSource(pdOverride, lineListMatch, 't3', T3_KEYS, config),
    insThk, insThkSource: insThk ? processSource(pdOverride, lineListMatch, 'insThk', INS_KEYS, config) : 'none',
  };
}

function branchRowOf(branch, ctx) {
  const { config, stagedIndex, pipingClassIndex, materialMap, dtxrCache, root } = ctx;
  const branchName = xmlText(branch, 'Branchname');
  const lineKey = deriveLineKeyFromBranchName(branchName, config);
  const line = lineMatchOf(branchName, lineKey, config);
  const lineListMatch = normaliseLineListMatch(line.raw, config);
  const derivedClassRaw = rowText(lineListMatch, ['pipingClass', 'Piping Class', 'PIPING_CLASS']) || derivePipingClassFromBranchName(branchName, config);
  const boreMm = branchBoreFromFirstUsefulNode(branch) || deriveBoreFromBranchName(branchName, config) || rowNumber(lineListMatch, ['convertedBore', 'Bore', 'DN', 'NB']);
  const manualRating = ratingOverride(config, uniqueKeys([lineKey, branchName, derivedClassRaw]));
  const rowRating = rowText(lineListMatch, ['rating', 'Rating', 'RATING']);
  const inputRating = manualRating || rowRating || deriveRatingFromPipingClass(derivedClassRaw, config);
  const facts = branchXmlFallbackFacts(branch);
  const resolved = resolveBranchProcessData({ branchName, lineKey, lineRow: { ...(lineListMatch || {}), pipingClass: derivedClassRaw }, boreMm, componentType: 'PIPE',
    rating: inputRating, materialMap, pipingClassIndex, overrides: config.overrides || {}, xmlNode: facts, xmlBranch: facts, config });
  const branchRating = manualRating || resolved.rating || deriveRatingFromPipingClass(resolved.pipingClass, config) || rowRating;
  const pdOverride = (lineKey && config?.overrides?.processData?.[lineKey]) || {};
  const dtxrWall = resolveXmlCiiWallThicknessFromDtxr({ boreMm, dtxrValues: branchDtxrValues(branch, stagedIndex, config, dtxrCache, root), config });
  const row = {
    branchName, lineKey, lineKeyMethod: line.method, lineKeyConfidence: line.confidence, lineKeyProposed: line.proposed, lineMiss: !lineListMatch,
    size: boreMm != null ? `${boreMm}mm` : '', sizeMm: boreMm, pipingClass: resolved.pipingClass || '', pipingClassDerived: derivedClassRaw || '',
    material: resolved.material || '', materialSource: resolved.materialSource || overrideSource(config.overrides, 'material', lineKey),
    materialCode: resolved.materialCode || '', rating: branchRating || '', ratingSource: manualRating ? 'override' : overrideSource(config.overrides, 'rating', lineKey),
    ...processFields(lineListMatch, pdOverride, config),
    wallThickness: resolved.wallThicknessMm != null ? Number(resolved.wallThicknessMm.toPrecision(6)).toString() : '',
    wallThicknessSource: resolved.wallThicknessSource || overrideSource(config.overrides, 'wallThickness', lineKey),
    wallThicknessKey: resolved.wallThicknessKey || classSizeKey({ pipingClass: resolved.pipingClass || derivedClassRaw, sizeMm: boreMm }),
    dtxrWallThickness: dtxrWall?.wallThicknessMm || '', dtxrWallSchedule: dtxrWall?.schedule || '', dtxrWallSource: dtxrWall?.source || '', dtxrWallDtxr: dtxrWall?.dtxr || '',
    corrosion: resolved.corrosionAllowanceMm != null ? String(resolved.corrosionAllowanceMm) : '',
    corrosionKey: resolved.corrosionKey || classKey({ pipingClass: resolved.pipingClass || derivedClassRaw }),
    materialCodeKey: resolved.materialCodeKey || classKey({ pipingClass: resolved.pipingClass || derivedClassRaw }),
  };
  return { row, branchName, boreMm, branchRating, resolvedPipingClass: resolved.pipingClass };
}

function nodeRowsOf(branch, { branchName, boreMm, branchRating, resolvedPipingClass }, ctx, nodeRows) {
  const { config, stagedIndex, weightBoreIndex, dtxrCache, root } = ctx;
  let previousPosition = null;
  xmlChildren(branch, 'Node').forEach((node, nodeIdx) => {
    const positionText = xmlText(node, 'Position');
    const computedLengthMm = previousPosition ? pointDistanceMm(previousPosition, positionText) : null;
    const explicitLengthMm = xmlCiiNumberText(xmlText(node, 'ElementLengthMm'));
    const lengthMm = explicitLengthMm !== null ? explicitLengthMm : computedLengthMm;
    const componentType = xmlText(node, 'ComponentType');
    const weightEligible = isXmlCiiWeightReviewNode(node);
    const dtxrRes = weightEligible ? cachedNodeDtxr(node, stagedIndex, config, dtxrCache, root) : { value: '', source: 'not-weight-eligible', matchedKey: '' };
    const od = Number(xmlText(node, 'OutsideDiameter'));
    const mappedDn = Number.isFinite(od) && od > 0 ? nominalDnFromOd(od) : null;
    const nodeBore = mappedDn !== null ? (mappedDn !== od ? mappedDn : null) : (Number(xmlText(node, 'BoreMm')) > 0 ? Number(xmlText(node, 'BoreMm')) : boreMm);
    const ranking = (weightEligible && nodeBore != null && branchRating && lengthMm != null)
      ? rankXmlCiiWeightCandidates({ boreMm: nodeBore, rating: branchRating, lengthMm, nodeName: xmlText(node, 'NodeName'), componentType, componentRefNo: xmlText(node, 'ComponentRefNo'), dtxr: dtxrRes.value || '' },
        config, { includeRejected: true, candidateRows: weightBoreIndex.forBore(nodeBore) })
      : { nodeHint: null, candidates: [], rejectedCandidates: [], best: null };
    const candidates = ranking.candidates.slice(0, 5);
    const weightKey = xmlCiiWeightReviewNodeOverrideKey(branchName, node, nodeIdx);
    const overrideWeight = Number(config?.overrides?.rigidWeight?.[weightKey]);
    const selectedWeight = Number.isFinite(overrideWeight) && overrideWeight > 0 ? overrideWeight : null;
    const weightMatch = selectedWeight != null ? { ...(candidates[0] || {}), selectedWeight, suggestedWeight: selectedWeight, weight: selectedWeight, selectedOverride: true } : (ranking.best || null);
    if (weightEligible && (candidates.length || ranking.rejectedCandidates.length)) {
      nodeRows.push({ key: weightKey, branchName, nodeNumber: xmlText(node, 'NodeNumber'), componentType, boreMm: nodeBore, rating: branchRating, resolvedPipingClass, lengthMm,
        dtxr: dtxrRes.value || '', dtxrSource: dtxrRes.source || 'none', dtxrMatchedKey: dtxrRes.matchedKey || '', valveHint: formatValveHint(ranking.nodeHint), weightMatch,
        weightCandidates: candidates, rejectedWeightCandidates: ranking.rejectedCandidates.slice(0, 3), componentRefNo: xmlText(node, 'ComponentRefNo') || '', endpoint: xmlText(node, 'Endpoint') || '' });
    }
    previousPosition = positionText || previousPosition;
  });
}

/**
 * Today's core preview. `xmlText` is parsed into the preview's own copy (gasket / short nodes dropped from it);
 * `stagedIndex` may be shared with the rating layer. Returns { branchRows, nodeRows }; unparsable XML gives empty rows.
 */
export function adaptedCorePreview(xmlTextIn, config, stagedJsonText, { stagedIndex = null } = {}) {
  let root;
  try { root = parsePlainXml(toText(xmlTextIn)).root; } catch { return { branchRows: [], nodeRows: [] }; }
  dropCleanupNodes(root, config);
  const ctx = { config, root, dtxrCache: new WeakMap(), pipingClassIndex: buildPipingClassIndex(config.pipingClass?.masterRows || []),
    weightBoreIndex: createXmlCiiWeightBoreIndex(config), stagedIndex: stagedIndex || buildStagedDtxrIndex(stagedJsonText || '', config), materialMap: config.material?.mapRows || [] };
  const branchRows = [], nodeRows = [];
  for (const branch of elementsByName(root, 'Branch')) {
    const b = branchRowOf(branch, ctx);
    branchRows.push(b.row);
    nodeRowsOf(branch, b, ctx, nodeRows);
  }
  return { branchRows, nodeRows };
}
