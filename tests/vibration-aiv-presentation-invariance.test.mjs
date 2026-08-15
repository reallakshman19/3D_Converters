import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateEngineering } from '../converters/engineering-calculations/index.js';
import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  resolveAivWorkingTablesWithAssumptions,
} from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { moveAivFlareNetworkNodePresentation } from '../converters/vibration/aiv/aiv-flare-network.js';
import {
  AIV_TOPOLOGY_INPUT_FORMAT,
  buildAivReadinessFromTables,
} from '../converters/vibration/aiv/aiv-readiness-tables.js';
import { projectAivFlareNetworkIntoWorkspace } from '../tabs/vibration-aiv-flare-network-state.js';
import { serializeAivInputTable } from '../tabs/vibration-aiv-input-model.js';
import { createAivSmallFlareMockNetwork } from '../tabs/vibration-aiv-mock-flare-network.js';
import { buildAivEngineeringScreeningRequest } from '../tabs/vibration-aiv-screening-request.js';

function executeRegisteredScreening(network) {
  const projected = projectAivFlareNetworkIntoWorkspace(network);
  const assumptionResolution = resolveAivWorkingTablesWithAssumptions(
    projected.tables,
    AIV_DEFAULT_ASSUMPTION_PROFILE,
  );
  const envelope = buildAivReadinessFromTables({
    topology: {
      format: AIV_TOPOLOGY_INPUT_FORMAT.FLARE_NETWORK,
      data: projected.topologyInput.data,
      sourceFileName: projected.topologyInput.sourceFileName,
    },
    sourceCsv: serializeAivInputTable(assumptionResolution.tables.sources),
    assessmentCsv: serializeAivInputTable(assumptionResolution.tables.assessments),
    sourceAssessmentCsv: serializeAivInputTable(assumptionResolution.tables.relationships),
  });
  const request = buildAivEngineeringScreeningRequest({
    readinessEnvelope: envelope,
    assumptionProfile: AIV_DEFAULT_ASSUMPTION_PROFILE,
  });
  return Object.freeze({
    projected,
    envelope,
    result: calculateEngineering(request),
  });
}

function engineeringPathEvidence(execution) {
  return execution.projected.generatedInputSet.pathEvidence.map((item) => ({
    sourceCanonicalId: item.sourceCanonicalId,
    assessmentCanonicalId: item.assessmentCanonicalId,
    status: item.status,
    physicalDistanceM: item.physicalDistanceM,
    segmentIds: item.segmentIds,
  }));
}

test('moving flare-network presentation cannot change engineering inputs, distance or registered AIV results', () => {
  const initial = createAivSmallFlareMockNetwork();
  const movedJunction = moveAivFlareNetworkNodePresentation(initial, 'J-101', 9999, -4000);
  const moved = moveAivFlareNetworkNodePresentation(movedJunction, 'AIV-ASSESS-HDR-001', -2500, 7000);

  const before = executeRegisteredScreening(initial);
  const after = executeRegisteredScreening(moved);

  assert.equal(before.result.ok, true);
  assert.equal(after.result.ok, true);
  assert.deepEqual(engineeringPathEvidence(after), engineeringPathEvidence(before));
  assert.deepEqual(after.projected.tables.sources, before.projected.tables.sources);
  assert.deepEqual(after.projected.tables.assessments, before.projected.tables.assessments);
  assert.deepEqual(after.projected.tables.relationships, before.projected.tables.relationships);
  assert.deepEqual(after.envelope.readiness.counts, before.envelope.readiness.counts);
  assert.deepEqual(after.result.outputs.sourceResults, before.result.outputs.sourceResults);
  assert.deepEqual(after.result.outputs.assessmentResults, before.result.outputs.assessmentResults);
  assert.deepEqual(after.result.outputs.lineCaseSummaries, before.result.outputs.lineCaseSummaries);
  assert.equal(moved.policy.svgPixelsAuthoritativeForDistance, false);

  assert.deepEqual(engineeringPathEvidence(after).map((item) => [
    item.sourceCanonicalId,
    item.physicalDistanceM,
  ]), [
    ['RV-101', 38],
    ['RV-102', 41],
  ]);
  assert.equal(after.result.outputs.screeningResultScope, 'ASSESSMENT');
  assert.equal(after.result.assessment.designAuthority, false);
});
