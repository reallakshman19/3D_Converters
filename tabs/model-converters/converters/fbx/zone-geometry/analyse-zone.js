import { runFbxAutoPipe } from '../auto-pipe/pipeline.js?v=20260729-fbx2-direct-pipe-1';
import { canonicalJson } from '../canonical-json.js';
import { buildBranchFittingPortEvidence } from '../fitting-kernels/branch-fitting/evidence.js';
import {
  buildBranchFittingReviewModel,
  unavailableBranchFittingReview,
} from '../fitting-kernels/branch-fitting/review-model.js';
import { buildSelectedZoneComponentCrosswalk } from '../parity/component-crosswalk.js';
import { buildSolidFittingPortEvidence } from '../solid-fitting-ports/evidence.js?v=20260729-fbx2-direct-pipe-1';
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

async function branchFittingAnalysis(input, prepared, solidEvidence) {
  const mappingStatus = input.mappedStageStatus || 'MAPPED_STAGE_NOT_AVAILABLE';
  if (!Array.isArray(input.stagedBranches)) {
    return Object.freeze({
      status: 'MAPPING_REQUIRED', componentCrosswalk: null,
      branchFittingEvidence: null,
      review: unavailableBranchFittingReview(mappingStatus),
    });
  }
  const componentCrosswalk = await buildSelectedZoneComponentCrosswalk({
    sourceGraph: prepared.canonicalGraph,
    zoneGeometryEvidence: prepared.artifact,
    stagedBranches: input.stagedBranches,
  });
  const branchFittingEvidence = await buildBranchFittingPortEvidence({
    componentCrosswalk,
    solidFittingPortEvidence: solidEvidence,
  });
  return Object.freeze({
    status: 'EVALUATED', componentCrosswalk, branchFittingEvidence,
    review: buildBranchFittingReviewModel(branchFittingEvidence, mappingStatus),
  });
}

function analysisCounts(prepared, derivedPortEvidence, wireframePreview, autoPipe, branchFitting) {
  const review = branchFitting.review;
  return Object.freeze({
    selectedOccurrences: prepared.artifact.conservation.selectedOccurrenceCount,
    selectedGeometries: prepared.artifact.conservation.selectedGeometryCount,
    admittedLoops: derivedPortEvidence.admittedPortCount,
    rejectedLoops: derivedPortEvidence.rejectedPortCount,
    previewSegments: wireframePreview.displayedSegmentCount,
    admittedPipes: autoPipe.counts?.admittedPipes || 0,
    pipeLinks: autoPipe.counts?.links || 0,
    stagedBranches: autoPipe.counts?.branches || 0,
    mappedBranchFittings: review.managedCount,
    admittedBranchFittings: review.admittedCount,
    blockedBranchFittings: review.blockedCount,
  });
}

function optionalJson(value) {
  return value ? canonicalJson(value) : null;
}

export async function analyseFbxZoneGeometry(input) {
  try {
    const prepared = await prepareZoneGeometryEvidence(input);
    const wireframePreview = buildFbxZoneWireframeData({
      scope: prepared.scope, selections: prepared.selections,
    });
    const pipeEvidence = await gatherPipeEvidence(prepared);
    const branchFitting = await branchFittingAnalysis(
      input, prepared, pipeEvidence.closedSolidPipeEvidence);
    const packageResult = await optionalPackageInputs(input, prepared, pipeEvidence.autoPipe);
    return Object.freeze({
      status: ZONE_GEOMETRY_STATUS.PASS,
      zoneGeometryEvidence: prepared.artifact,
      derivedPortEvidence: pipeEvidence.derivedPortEvidence,
      closedSolidPipeEvidence: pipeEvidence.closedSolidPipeEvidence,
      componentCrosswalk: branchFitting.componentCrosswalk,
      branchFittingEvidence: branchFitting.branchFittingEvidence,
      branchFittingReview: branchFitting.review,
      wireframePreview,
      autoPipe: pipeEvidence.autoPipe,
      ...packageResult,
      zoneGeometryJson: canonicalJson(prepared.artifact),
      derivedPortJson: canonicalJson(pipeEvidence.derivedPortEvidence),
      closedSolidPipeJson: canonicalJson(pipeEvidence.closedSolidPipeEvidence),
      componentCrosswalkJson: optionalJson(branchFitting.componentCrosswalk),
      branchFittingJson: optionalJson(branchFitting.branchFittingEvidence),
      counts: analysisCounts(
        prepared, pipeEvidence.derivedPortEvidence, wireframePreview,
        pipeEvidence.autoPipe, branchFitting),
    });
  } catch (error) {
    throw asZoneGeometryError(error);
  }
}
