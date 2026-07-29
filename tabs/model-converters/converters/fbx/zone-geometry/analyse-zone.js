import { runFbxAutoPipe } from '../auto-pipe/pipeline.js';
import { canonicalJson } from '../canonical-json.js';
import { buildSolidFittingPortEvidence } from '../solid-fitting-ports/evidence.js';
import { buildLiveZonePackageInputs } from '../zone-package/live-input.js';
import { buildDerivedPortEvidence } from './derived-ports.js';
import { asZoneGeometryError } from './errors.js';
import { prepareZoneGeometryEvidence } from './zone-evidence.js';
import { ZONE_GEOMETRY_STATUS } from './constants.js';
import { buildFbxZoneWireframeData } from './wireframe-preview.js';

function packagePrefix(artifact) {
  return String(artifact.selectedZone.label || artifact.selectedZone.zoneId)
    .trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '')
    || 'selected-zone';
}
async function optionalPackageInputs(input, prepared, autoPipe) {
  if (input.includeZonePackageInputs === false) {
    return { zonePackageInputs: null, zonePackageError: null };
  }
  try {
    const zonePackageInputs = await buildLiveZonePackageInputs({
      zoneGeometryEvidence: prepared.artifact,
      scope: prepared.scope,
      selections: prepared.selections,
      stagedJsonText: autoPipe.status === 'STAGEDJSON_PASS'
        ? autoPipe.stagedJsonText : null,
    });
    zonePackageInputs.fileNamePrefix = packagePrefix(prepared.artifact);
    return { zonePackageInputs, zonePackageError: null };
  } catch (error) {
    return {
      zonePackageInputs: null,
      zonePackageError: Object.freeze({
        code: error?.code || 'ZONE_PACKAGE_PREPARATION_FAILED',
        message: error?.message || String(error),
      }),
    };
  }
}

async function gatherPipeEvidence(prepared) {
  const derivedPortEvidence = await buildDerivedPortEvidence(
    prepared.artifact, prepared.scope, prepared.selections);
  const closedSolidPipeEvidence = await buildSolidFittingPortEvidence(
    prepared.artifact, prepared.scope, prepared.selections);
  const autoPipe = await runFbxAutoPipe({
    zoneGeometryEvidence: prepared.artifact,
    derivedPortEvidence,
    closedSolidPipeEvidence,
    selections: prepared.selections,
  });
  return { derivedPortEvidence, closedSolidPipeEvidence, autoPipe };
}

function analysisCounts(prepared, derivedPortEvidence, wireframePreview, autoPipe) {
  return Object.freeze({
    selectedOccurrences: prepared.artifact.conservation.selectedOccurrenceCount,
    selectedGeometries: prepared.artifact.conservation.selectedGeometryCount,
    admittedLoops: derivedPortEvidence.admittedPortCount,
    rejectedLoops: derivedPortEvidence.rejectedPortCount,
    previewSegments: wireframePreview.displayedSegmentCount,
    admittedPipes: autoPipe.counts?.admittedPipes || 0,
    pipeLinks: autoPipe.counts?.links || 0,
    stagedBranches: autoPipe.counts?.branches || 0,
  });
}

export async function analyseFbxZoneGeometry(input) {
  try {
    const prepared = await prepareZoneGeometryEvidence(input);
    const wireframePreview = buildFbxZoneWireframeData({
      scope: prepared.scope, selections: prepared.selections,
    });
    const { derivedPortEvidence, closedSolidPipeEvidence, autoPipe } = await gatherPipeEvidence(prepared);
    const packageResult = await optionalPackageInputs(input, prepared, autoPipe);
    return Object.freeze({
      status: ZONE_GEOMETRY_STATUS.PASS,
      zoneGeometryEvidence: prepared.artifact,
      derivedPortEvidence,
      closedSolidPipeEvidence,
      wireframePreview,
      autoPipe,
      ...packageResult,
      zoneGeometryJson: canonicalJson(prepared.artifact),
      derivedPortJson: canonicalJson(derivedPortEvidence),
      closedSolidPipeJson: canonicalJson(closedSolidPipeEvidence),
      counts: analysisCounts(prepared, derivedPortEvidence, wireframePreview, autoPipe),
    });
  } catch (error) {
    throw asZoneGeometryError(error);
  }
}
