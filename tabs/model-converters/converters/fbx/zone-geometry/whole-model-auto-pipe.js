// Runs the existing per-zone auto-pipe classification (analyse-zone.js)
// across every preview zone automatically, and merges the admitted
// per-zone StagedJSON branches into one document. This removes the need
// for a user to manually select a zone and click "Analyse zone geometry"
// before StagedJSON can be produced; it does not change per-zone admission
// rules or widen FbxAutoPipeProfile.v1 in any way.
import { analyseFbxZoneGeometry } from './analyse-zone.js';
import { listFbxSourceGraphPreviewZones } from '../../../fbx-source-graph-preview.js';
import { UNOWNED_ZONE_ID } from './zone-scope.js';
import { canonicalJson } from '../canonical-json.js';

function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }

function zoneIdsFrom(sourceGraph, zoneIds) {
  if (Array.isArray(zoneIds)) return zoneIds;
  return listFbxSourceGraphPreviewZones(sourceGraph)
    .map((zone) => zone.zoneId)
    .filter((zoneId) => zoneId !== UNOWNED_ZONE_ID);
}

async function analyseOneZone(analyse, sourceGraph, geometryBundle, zoneId) {
  try {
    const result = await analyse({ sourceGraph, geometryBundle, zoneId });
    const status = result?.autoPipe?.status || 'UNKNOWN';
    const branches = status === 'STAGEDJSON_PASS' ? JSON.parse(result.autoPipe.stagedJsonText) : [];
    return { zoneId, status, branches, admittedPipes: result?.counts?.admittedPipes || 0, error: null };
  } catch (error) {
    return { zoneId, status: 'ERROR', branches: [], admittedPipes: 0, error: error?.message || String(error) };
  }
}

function mergeBranches(zoneResults) {
  const merged = [];
  const refCounts = new Map();
  for (const zone of [...zoneResults].sort((left, right) => compareText(left.zoneId, right.zoneId))) {
    for (const branch of zone.branches) {
      const ref = String(branch?.attributes?.REF || branch?.id || '');
      refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
      merged.push(branch);
    }
  }
  const duplicateRefs = [...refCounts].filter(([, count]) => count > 1).map(([ref]) => ref).sort(compareText);
  return { merged, duplicateRefs };
}

/**
 * Automatically runs auto-pipe classification for every preview zone (or an
 * explicit `zoneIds` subset for testing) and merges the zones that pass into
 * one StagedJSON document. Zones that block, and any duplicate branch
 * identifier across zones, are reported rather than silently dropped or
 * merged — a duplicate identifier blocks the whole-model result the same
 * way an unresolved candidate blocks Phase 4 host-authority binding.
 */
export async function runFbxWholeModelAutoPipe({
  sourceGraph, geometryBundle, zoneIds, analyse = analyseFbxZoneGeometry,
} = {}) {
  const ids = zoneIdsFrom(sourceGraph, zoneIds);
  const zoneResults = await Promise.all(
    ids.map((zoneId) => analyseOneZone(analyse, sourceGraph, geometryBundle, zoneId)),
  );
  const { merged, duplicateRefs } = mergeBranches(zoneResults);
  const passedZones = zoneResults.filter((zone) => zone.status === 'STAGEDJSON_PASS').length;
  const conversionStatus = merged.length && !duplicateRefs.length
    ? 'STAGEDJSON_PASS' : 'BLOCKED_WHOLE_MODEL_AUTO_PIPE';
  return {
    conversionStatus,
    stagedJsonText: conversionStatus === 'STAGEDJSON_PASS' ? canonicalJson(merged) : null,
    zoneReports: zoneResults.map(({ zoneId, status, admittedPipes, error }) => ({ zoneId, status, admittedPipes, error })),
    duplicateRefs,
    counts: { totalZones: ids.length, passedZones, branches: merged.length },
  };
}
