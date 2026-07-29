// Select one bounded source-graph zone, then run the existing exact auto-pipe
// classifier only for that zone. Whole-model orchestration remains separate.
import { canonicalJson } from '../canonical-json.js';
import { analyseFbxZoneGeometry } from './analyse-zone.js';
import { listFbxZoneScopeSummaries } from './zone-scope.js';
import { mergeWholeModelBranches } from './whole-model-identities.js';

export const FBX_SELECTED_ZONE_AUTO_PIPE_POLICY = 'FbxSelectedZoneAutoPipePolicy.v1';
export const STAGEDJSON_SELECTED_ZONE_PASS = 'STAGEDJSON_SELECTED_ZONE_PASS';
export const BLOCKED_SELECTED_ZONE_AUTO_PIPE = 'BLOCKED_SELECTED_ZONE_AUTO_PIPE';

const DEFAULT_MAX_GEOMETRIES = 2000;
const DEFAULT_MAX_SOURCE_POINTS = 2000000;
const SHAPE_SAMPLE_LIMIT = 512;
const PIPE_NAME = /(^|[^A-Z0-9])(PIPE|PIPING|SPOOL|TUBE|TUBING)([^A-Z0-9]|$)/i;
const NON_PIPE_NAME = /(^|[^A-Z0-9])(BUILDING|STRUCTURE|CABLE|TRAY|EQUIPMENT)([^A-Z0-9]|$)/i;

function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function finiteLimit(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
function sampledBounds(points) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const stride = Math.max(1, Math.ceil(points.length / SHAPE_SAMPLE_LIMIT));
  for (let index = 0; index < points.length; index += stride) {
    const point = points[index];
    if (!Array.isArray(point) || point.length < 3) continue;
    for (let axis = 0; axis < 3; axis += 1) {
      const value = point[axis];
      if (!Number.isFinite(value)) continue;
      min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
    }
  }
  return min.map((value, axis) => max[axis] - value);
}
function pipeShapeHint(geometry) {
  const points = geometry?.kind === 'MESH' ? geometry.verticesMm : null;
  if (!Array.isArray(points) || points.length < 8) return 0;
  const extents = sampledBounds(points).filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  if (extents.length !== 3) return 0;
  const slenderness = extents[2] / extents[1], crossSectionRatio = extents[0] / extents[1];
  return slenderness >= 2.5 && crossSectionRatio >= 0.35 ? 1 : 0;
}
function geometryName(geometry, sourceById) {
  const source = sourceById.get(geometry?.sourceObjectId);
  return [source?.displayName, source?.domSourceName, source?.domSubtype].filter(Boolean).join(' ');
}
function candidateEvidence(summary, maps, shapeCache, limits) {
  let pipeLikeGeometryCount = 0, positiveNames = PIPE_NAME.test(summary.label) ? 1 : 0;
  let negativeNames = NON_PIPE_NAME.test(summary.label) ? 1 : 0;
  for (const id of summary.selectedGeometryIds) {
    const geometry = maps.geometryById.get(id);
    if (!shapeCache.has(id)) shapeCache.set(id, pipeShapeHint(geometry));
    pipeLikeGeometryCount += shapeCache.get(id);
    const name = geometryName(geometry, maps.sourceById);
    positiveNames += PIPE_NAME.test(name) ? 1 : 0;
    negativeNames += NON_PIPE_NAME.test(name) ? 1 : 0;
  }
  const eligible = summary.selectedGeometryCount <= limits.maxGeometries
    && summary.sourcePointCount <= limits.maxSourcePoints;
  return Object.freeze({ ...summary, eligible, positiveNames, negativeNames,
    pipeLikeGeometryCount, pipeLikeRatio: summary.selectedGeometryCount
      ? pipeLikeGeometryCount / summary.selectedGeometryCount : 0 });
}
function compareCandidates(left, right) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  const leftNames = left.positiveNames - left.negativeNames;
  const rightNames = right.positiveNames - right.negativeNames;
  if (leftNames !== rightNames) return rightNames - leftNames;
  if (left.pipeLikeRatio !== right.pipeLikeRatio) return right.pipeLikeRatio - left.pipeLikeRatio;
  if (left.pipeLikeGeometryCount !== right.pipeLikeGeometryCount) {
    return right.pipeLikeGeometryCount - left.pipeLikeGeometryCount;
  }
  return left.selectedGeometryCount - right.selectedGeometryCount
    || left.sourcePointCount - right.sourcePointCount
    || compareText(left.label, right.label) || compareText(left.zoneId, right.zoneId);
}
function selectedEvidence(candidate, candidates, reason) {
  return Object.freeze({
    policy: FBX_SELECTED_ZONE_AUTO_PIPE_POLICY, reason,
    zoneId: candidate.zoneId, label: candidate.label,
    sourcePointCount: candidate.sourcePointCount,
    selectedOccurrenceCount: candidate.selectedOccurrenceCount,
    selectedGeometryCount: candidate.selectedGeometryCount,
    pipeLikeGeometryCount: candidate.pipeLikeGeometryCount,
    pipeLikeRatio: candidate.pipeLikeRatio,
    positiveNameHints: candidate.positiveNames,
    negativeNameHints: candidate.negativeNames,
    candidateCount: candidates.length,
    eligibleCandidateCount: candidates.filter((item) => item.eligible).length,
  });
}
export function selectFbxAutoPipeZone(sourceGraph, options = {}) {
  const summaries = listFbxZoneScopeSummaries(sourceGraph);
  if (!summaries.length) throw new Error(`${BLOCKED_SELECTED_ZONE_AUTO_PIPE} no mesh-bearing zone is available.`);
  const maps = {
    geometryById: new Map(sourceGraph.geometries.map((item) => [item.geometryObjectId, item])),
    sourceById: new Map(sourceGraph.sourceObjects.map((item) => [item.sourceObjectId, item])),
  };
  const limits = {
    maxGeometries: finiteLimit(options.maxGeometries, DEFAULT_MAX_GEOMETRIES),
    maxSourcePoints: finiteLimit(options.maxSourcePoints, DEFAULT_MAX_SOURCE_POINTS),
  };
  const shapeCache = new Map();
  const candidates = summaries.map((item) => candidateEvidence(item, maps, shapeCache, limits))
    .sort(compareCandidates);
  const requested = options.zoneId
    ? candidates.find((item) => item.zoneId === options.zoneId) : null;
  if (options.zoneId && !requested) throw new Error(
    `${BLOCKED_SELECTED_ZONE_AUTO_PIPE} requested zone ${options.zoneId} is unavailable.`);
  const selected = requested || candidates.find((item) => item.eligible);
  if (!selected?.eligible) throw new Error(
    `${BLOCKED_SELECTED_ZONE_AUTO_PIPE} every zone exceeds the automatic resource ceiling.`);
  return selectedEvidence(selected, candidates, requested ? 'explicit-zone' : 'ranked-source-graph');
}
function validatedBranches(text) {
  const value = JSON.parse(text);
  if (!Array.isArray(value) || value.some((branch) => !branch || branch.type !== 'BRANCH'
    || !Array.isArray(branch.children) || !branch.children.length)) {
    throw new Error('STAGEDJSON_PASS selected-zone payload is malformed.');
  }
  return value;
}
function blocked(selection, report, reason) {
  return { conversionStatus: BLOCKED_SELECTED_ZONE_AUTO_PIPE, stagedJsonText: null,
    selectedZone: selection, zoneReports: [report], duplicateIdentifiers: [],
    unresolvedCrefs: [], blockingReasons: [reason],
    counts: { totalZones: selection?.candidateCount || 0,
      eligibleZones: selection?.eligibleCandidateCount || 0, attemptedZones: 1,
      passedZones: 0, blockedZones: report.status === 'ERROR' ? 0 : 1,
      errorZones: report.status === 'ERROR' ? 1 : 0, branches: 0 } };
}
export async function runFbxSelectedZoneAutoPipe({
  sourceGraph, geometryBundle, selection, analyse = analyseFbxZoneGeometry,
} = {}) {
  let selected = selection;
  try {
    selected ||= selectFbxAutoPipeZone(sourceGraph);
    const result = await analyse({ sourceGraph, geometryBundle, zoneId: selected.zoneId,
      includeZonePackageInputs: false });
    const status = result?.autoPipe?.status || 'UNKNOWN';
    const report = { zoneId: selected.zoneId, label: selected.label, status,
      admittedPipes: result?.counts?.admittedPipes || 0, error: result?.autoPipe?.error || null };
    if (status !== 'STAGEDJSON_PASS') return blocked(selected, report, status);
    const branches = validatedBranches(result.autoPipe.stagedJsonText);
    const identity = await mergeWholeModelBranches([
      { zoneId: selected.zoneId, status: 'STAGEDJSON_PASS', branches },
    ]);
    if (identity.duplicateIdentifiers.length || identity.unresolvedCrefs.length) {
      return { ...blocked(selected, report, 'SELECTED_ZONE_IDENTITY_INVALID'), ...identity };
    }
    return { conversionStatus: STAGEDJSON_SELECTED_ZONE_PASS,
      stagedJsonText: canonicalJson(identity.merged), selectedZone: selected,
      zoneReports: [report], duplicateIdentifiers: [], unresolvedCrefs: [],
      blockingReasons: [], counts: { totalZones: selected.candidateCount,
        eligibleZones: selected.eligibleCandidateCount, attemptedZones: 1,
        passedZones: 1, blockedZones: 0, errorZones: 0,
        branches: identity.merged.length } };
  } catch (error) {
    const message = error?.message || String(error);
    const report = { zoneId: selected?.zoneId || null, label: selected?.label || null,
      status: 'ERROR', admittedPipes: 0, error: message };
    return blocked(selected, report, message);
  }
}
