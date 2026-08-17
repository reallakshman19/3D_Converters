import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVibrationMechanismAssessmentItem,
  createVibrationMechanismAssessmentSet,
} from '../converters/vibration/mechanisms/contracts.js';
import {
  createRequiredAssessmentSet,
  createVibrationMechanismIdentification,
} from '../converters/vibration/mechanisms/coverage-identification.js';
import {
  createAssessmentCompleteness,
  createMechanismCoverage,
} from '../converters/vibration/mechanisms/coverage.js';

const scope = Object.freeze({ line: 'L-100', caseId: 'NORMAL', canonicalId: 'CAN-1' });

function identification({
  mechanismId = 'fit',
  assessmentKey = 'mainline',
  assessmentUnitType = 'MAIN_LINE_SECTION',
  disposition = 'REQUIRED',
  sourceReference = 'Controlled identification record',
} = {}) {
  return createVibrationMechanismIdentification({
    scope,
    mechanismId,
    assessmentKey,
    assessmentUnitType,
    identificationDisposition: disposition,
    reason: `TEST_${disposition}`,
    evidence: { sourceReference, evidenceClass: 'TEST_ORACLE' },
  });
}

function assessmentSet({
  mechanismId = 'fit',
  childKey = 'mainline',
  implementationState = 'IMPLEMENTED_SCREENING',
  assessmentState = 'CALCULATED',
  resultState = 'CURRENT_RESULT',
  qualification = 'SCREENING',
} = {}) {
  const item = createVibrationMechanismAssessmentItem({
    mechanismId,
    scope,
    childKey,
    implementationState,
    assessmentState,
    resultState,
    readiness: { missing: [], invalid: [], reasons: [] },
    qualification: qualification ? { effective: qualification } : null,
  });
  return createVibrationMechanismAssessmentSet({ mechanismId, scope, items: [item] });
}

function evaluate(identifications, assessmentSets = [], requiredQualificationState = 'SCREENING') {
  const requiredAssessmentSet = createRequiredAssessmentSet({ scope, identifications });
  const mechanismCoverage = createMechanismCoverage({
    requiredAssessmentSet,
    assessmentSets,
    requiredQualificationState,
  });
  const completeness = createAssessmentCompleteness({ requiredAssessmentSet, mechanismCoverage });
  return { requiredAssessmentSet, mechanismCoverage, completeness };
}

test('no identification evidence fails closed as INCOMPLETE', () => {
  const result = evaluate([]);
  assert.equal(result.completeness.state, 'INCOMPLETE');
  assert.deepEqual(result.completeness.reasons, ['IDENTIFICATION_EVIDENCE_MISSING']);
  assert.equal(result.completeness.counts.requiredCount, 0);
});

test('required assessment missing from execution evidence remains INCOMPLETE', () => {
  const result = evaluate([identification()]);
  assert.equal(result.completeness.state, 'INCOMPLETE');
  assert.equal(result.completeness.counts.incompleteCount, 1);
  assert.equal(result.mechanismCoverage.entries[0].reason, 'MISSING_REQUIRED_ASSESSMENT');
});

test('required NOT_IMPLEMENTED assessment cannot satisfy coverage', () => {
  const result = evaluate([identification()], [assessmentSet({
    implementationState: 'NOT_IMPLEMENTED',
    assessmentState: 'NOT_EVALUATED',
    resultState: 'UNRUN',
    qualification: null,
  })]);
  assert.equal(result.completeness.state, 'INCOMPLETE');
  assert.equal(result.mechanismCoverage.entries[0].reason, 'ASSESSMENT_STATE_NOT_EVALUATED');
});

test('stale screening result cannot satisfy current required coverage', () => {
  const result = evaluate([identification()], [assessmentSet({ resultState: 'STALE_RESULT' })]);
  assert.equal(result.completeness.state, 'INCOMPLETE');
  assert.equal(result.mechanismCoverage.entries[0].reason, 'RESULT_STATE_STALE_RESULT');
});

test('candidate-only current result cannot satisfy required SCREENING coverage', () => {
  const result = evaluate([identification({
    mechanismId: 'mechanicalExcitation',
    assessmentKey: 'equipment-1',
  })], [assessmentSet({
    mechanismId: 'mechanicalExcitation',
    childKey: 'equipment-1',
    implementationState: 'IMPLEMENTED_CANDIDATE_MASTER',
    qualification: 'CANDIDATE_MASTER',
  })]);
  assert.equal(result.completeness.state, 'INCOMPLETE');
  assert.equal(result.mechanismCoverage.entries[0].reason, 'QUALIFICATION_CANDIDATE_MASTER');
});

test('explicit NOT_APPLICABLE evidence remains distinct from missing assessment', () => {
  const result = evaluate([identification({ disposition: 'NOT_APPLICABLE' })]);
  assert.equal(result.completeness.state, 'NOT_APPLICABLE');
  assert.equal(result.completeness.counts.notApplicableCount, 1);
  assert.equal(result.completeness.counts.incompleteCount, 0);
  assert.equal(result.mechanismCoverage.entries[0].coverageState, 'NOT_APPLICABLE');
});

test('unresolved identification blocks completeness without inventing applicability', () => {
  const result = evaluate([identification({ disposition: 'UNRESOLVED' })]);
  assert.equal(result.completeness.state, 'INCOMPLETE');
  assert.equal(result.completeness.counts.unresolvedIdentificationCount, 1);
  assert.ok(result.completeness.reasons.includes('IDENTIFICATION_UNRESOLVED'));
});

test('all required current SCREENING assessments produce COMPLETE', () => {
  const result = evaluate([identification()], [assessmentSet()]);
  assert.equal(result.completeness.state, 'COMPLETE');
  assert.equal(result.completeness.counts.requiredCount, 1);
  assert.equal(result.completeness.counts.completeCount, 1);
  assert.deepEqual(result.completeness.reasons, []);
});

test('mixed required complete and explicit not-applicable remains COMPLETE', () => {
  const result = evaluate([
    identification(),
    identification({
      mechanismId: 'rotatingStall',
      assessmentKey: 'mainline',
      disposition: 'NOT_APPLICABLE',
    }),
  ], [assessmentSet()]);
  assert.equal(result.completeness.state, 'COMPLETE');
  assert.equal(result.completeness.counts.completeCount, 1);
  assert.equal(result.completeness.counts.notApplicableCount, 1);
});

test('unknown mechanism IDs fail closed during identification', () => {
  assert.throws(
    () => identification({ mechanismId: 'universalVibrationRisk' }),
    /mechanismId must be one of/u,
  );
});

test('duplicate or contradictory identification identity fails closed', () => {
  const required = identification();
  const contradictory = createVibrationMechanismIdentification({
    scope,
    mechanismId: 'fit',
    assessmentKey: 'mainline',
    assessmentUnitType: 'MAIN_LINE_SECTION',
    identificationDisposition: 'NOT_APPLICABLE',
    evidence: { sourceReference: 'Conflicting explicit record' },
  });
  assert.throws(
    () => createRequiredAssessmentSet({ scope, identifications: [required, contradictory] }),
    /Duplicate or contradictory mechanism identification/u,
  );
});

test('required-set identity is input-order independent but changes with evidence', () => {
  const fit = identification();
  const aiv = identification({
    mechanismId: 'aiv',
    assessmentKey: 'SRC-1->A-1',
    assessmentUnitType: 'AIV_SOURCE_ASSESSMENT_PAIR',
  });
  const forward = createRequiredAssessmentSet({ scope, identifications: [fit, aiv] });
  const reverse = createRequiredAssessmentSet({ scope, identifications: [aiv, fit] });
  const changed = createRequiredAssessmentSet({
    scope,
    identifications: [fit, identification({
      mechanismId: 'aiv',
      assessmentKey: 'SRC-1->A-1',
      assessmentUnitType: 'AIV_SOURCE_ASSESSMENT_PAIR',
      sourceReference: 'Different controlled identification record',
    })],
  });
  assert.equal(forward.setId, reverse.setId);
  assert.notEqual(forward.setId, changed.setId);
});

test('coverage rejects assessment evidence from a different facility scope', () => {
  const requiredAssessmentSet = createRequiredAssessmentSet({
    scope,
    identifications: [identification()],
  });
  const otherScope = { line: 'L-200', caseId: 'NORMAL', canonicalId: 'CAN-2' };
  const item = createVibrationMechanismAssessmentItem({
    mechanismId: 'fit',
    scope: otherScope,
    childKey: 'mainline',
    implementationState: 'IMPLEMENTED_SCREENING',
    assessmentState: 'CALCULATED',
    resultState: 'CURRENT_RESULT',
    qualification: { effective: 'SCREENING' },
  });
  const wrongSet = createVibrationMechanismAssessmentSet({
    mechanismId: 'fit', scope: otherScope, items: [item],
  });
  assert.throws(
    () => createMechanismCoverage({ requiredAssessmentSet, assessmentSets: [wrongSet] }),
    /Assessment set scope mismatch/u,
  );
});
