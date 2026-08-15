import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAivEngineeringScreeningRequest } from '../tabs/vibration-aiv-screening-request.js';

function source(id, caseId) { return { sourceCanonicalId: id, caseId }; }
function assessment(id) { return { assessmentCanonicalId: id }; }
function relationship(sourceCanonicalId, assessmentCanonicalId, caseId, applicabilityDisposition) {
  return { sourceCanonicalId, assessmentCanonicalId, caseId, applicabilityDisposition };
}
function row(sourceCanonicalId, assessmentCanonicalId, caseId, status) {
  return { sourceCanonicalId, assessmentCanonicalId, caseId, status };
}

function envelope() {
  return {
    schema: 'AivReadinessTableEnvelope.v2',
    sources: [source('SRC-READY', 'CASE-1'), source('SRC-NA', 'CASE-1'), source('SRC-UNUSED', 'CASE-2')],
    assessments: [assessment('ASSMT-READY'), assessment('ASSMT-NA'), assessment('ASSMT-UNUSED')],
    sourceAssessments: [
      relationship('SRC-READY', 'ASSMT-READY', 'CASE-1', 'APPLICABLE'),
      relationship('SRC-NA', 'ASSMT-NA', 'CASE-1', 'NOT_APPLICABLE'),
    ],
    readiness: {
      counts: { rows: 2, readyForQualification: 1, methodGap: 0, notReady: 0, notApplicable: 1 },
      rows: [
        row('SRC-READY', 'ASSMT-READY', 'CASE-1', 'READY_FOR_QUALIFICATION'),
        row('SRC-NA', 'ASSMT-NA', 'CASE-1', 'NOT_APPLICABLE'),
      ],
    },
    exchange: { schema: 'VibrationTableExchange.v1', elements: [] },
  };
}

test('request includes only READY_FOR_QUALIFICATION + APPLICABLE identities', () => {
  const request = buildAivEngineeringScreeningRequest({ readinessEnvelope: envelope(), assumptionProfile: {} });
  assert.deepEqual(request.inputs.sources.map((item) => item.sourceCanonicalId), ['SRC-READY']);
  assert.deepEqual(request.inputs.assessments.map((item) => item.assessmentCanonicalId), ['ASSMT-READY']);
  assert.deepEqual(request.inputs.relationships.map((item) => item.sourceCanonicalId), ['SRC-READY']);
  assert.equal(request.inputs.relationships[0].applicabilityDisposition, 'APPLICABLE');
});

test('non-applicable and unconnected loaded records cannot poison the numerical request', () => {
  const value = envelope();
  value.sources[1].invalidForCalculator = true;
  value.assessments[2].assessmentType = 'WELDED_SUPPORT';
  const request = buildAivEngineeringScreeningRequest({ readinessEnvelope: value, assumptionProfile: {} });
  assert.equal(request.inputs.sources.some((item) => item.sourceCanonicalId === 'SRC-NA'), false);
  assert.equal(request.inputs.sources.some((item) => item.sourceCanonicalId === 'SRC-UNUSED'), false);
  assert.equal(request.inputs.assessments.some((item) => item.assessmentCanonicalId === 'ASSMT-UNUSED'), false);
});

test('ready-row to applicable-relationship drift fails closed', () => {
  const value = envelope();
  value.sourceAssessments[0] = relationship('SRC-READY', 'ASSMT-READY', 'CASE-1', 'NOT_APPLICABLE');
  assert.throws(
    () => buildAivEngineeringScreeningRequest({ readinessEnvelope: value, assumptionProfile: {} }),
    (error) => error?.code === 'AIV_SCREENING_REQUEST_READY_PROJECTION_MISMATCH',
  );
});
