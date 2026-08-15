import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertAivExecutableContract,
  findAivUnsupportedSimultaneousScopes,
  validateAivExecutableContract,
} from '../converters/vibration/aiv/aiv-executable-contract.js';
import { buildAivReadiness } from '../converters/vibration/aiv/aiv-readiness.js';

function topology() {
  return {
    schema: 'AivFlareNetworkTopologyExchange.v1',
    elements: [
      { canonicalId: 'SRC-1', tag: 'SRC-1', type: 'VALV', line: 'L-1' },
      { canonicalId: 'SRC-2', tag: 'SRC-2', type: 'VALV', line: 'L-1' },
      { canonicalId: 'ASSMT-1', tag: 'ASSMT-1', type: 'OLET', line: 'L-1' },
    ],
    segments: [
      { segmentId: 'SEG-1', fromNodeId: 'SRC-1', toNodeId: 'ASSMT-1' },
      { segmentId: 'SEG-2', fromNodeId: 'SRC-2', toNodeId: 'ASSMT-1' },
    ],
  };
}

function source(overrides = {}) {
  return {
    sourceCanonicalId: 'SRC-1', caseId: 'CASE-1', sourceDeviceType: 'RELIEF_VALVE',
    sourceState: 'RELIEVING', phase: 'GAS', massFlow: { value: 10, unit: 'kg/s' },
    upstreamPressure: { value: 5, unit: 'MPa', basis: 'ABSOLUTE' },
    downstreamPressure: { value: 1, unit: 'MPa', basis: 'ABSOLUTE' },
    upstreamTemperature: { value: 300, unit: 'K' }, molecularWeight: { value: 20, unit: 'g/mol' },
    lowNoiseTrim: { state: 'NONE' }, sonicState: 'NON_SONIC', source: 'TEST',
    sourceRevision: 'R1', recordId: 'SRC-REC-1', ...overrides,
  };
}

function assessment(overrides = {}) {
  return {
    assessmentCanonicalId: 'ASSMT-1', assessmentType: 'WELDOLET',
    mainOutsideDiameter: { value: 168.3, unit: 'mm' },
    mainInsideDiameter: { value: 154, unit: 'mm' },
    mainWallThickness: { value: 7.11, unit: 'mm' },
    branchOutsideDiameter: { value: 60.3, unit: 'mm' },
    material: 'CS', duplexState: 'NO', source: 'TEST', sourceRevision: 'R1', recordId: 'ASSMT-REC-1',
    ...overrides,
  };
}

function relationship(overrides = {}) {
  return {
    sourceCanonicalId: 'SRC-1', assessmentCanonicalId: 'ASSMT-1', caseId: 'CASE-1',
    physicalDistance: { value: 0.8, unit: 'm' }, distanceSource: 'TEST', distanceSourceRevision: 'R1',
    simultaneousSourceGroup: 'G1', applicabilityDisposition: 'APPLICABLE', source: 'TEST',
    sourceRevision: 'R1', recordId: 'REL-REC-1', ...overrides,
  };
}

function secondSource() {
  return source({ sourceCanonicalId: 'SRC-2', recordId: 'SRC-REC-2' });
}

function secondRelationship(group = 'G1') {
  return relationship({ sourceCanonicalId: 'SRC-2', simultaneousSourceGroup: group, recordId: 'REL-REC-2' });
}

function readiness({ sources = [source()], assessments = [assessment()], relationships = [relationship()] } = {}) {
  return buildAivReadiness(topology(), sources, assessments, relationships);
}

test('valid WELDOLET screening input satisfies shared executable contract and readiness', () => {
  const input = { sources: [source()], assessments: [assessment()], relationships: [relationship()] };
  assert.equal(validateAivExecutableContract(input).valid, true);
  assert.equal(readiness(input).rows[0].status, 'READY_FOR_QUALIFICATION');
});

test('readiness fails before execution when resolved pressure drop is non-positive', () => {
  const result = readiness({
    sources: [source({
      upstreamPressure: { value: 1, unit: 'MPa', basis: 'ABSOLUTE' },
      downstreamPressure: { value: 1, unit: 'MPa', basis: 'ABSOLUTE' },
    })],
  });
  assert.equal(result.rows[0].status, 'NOT_READY');
  assert(result.rows[0].invalid.some((item) => item.code === 'AIV_EXECUTABLE_PRESSURE_DROP_INVALID'));
});

test('readiness rejects temperature below absolute zero and unsupported execution units', () => {
  const cold = readiness({ sources: [source({ upstreamTemperature: { value: -300, unit: 'degC' } })] }).rows[0];
  assert.equal(cold.status, 'NOT_READY');
  assert(cold.invalid.some((item) => item.code === 'AIV_EXECUTABLE_TEMPERATURE_NOT_POSITIVE_K'));

  const distance = readiness({ relationships: [relationship({ physicalDistance: { value: 3, unit: 'ft' } })] }).rows[0];
  assert.equal(distance.status, 'NOT_READY');
  assert(distance.invalid.some((item) => item.code === 'AIV_EXECUTABLE_UNIT_UNSUPPORTED'));
});

test('current Stage-8 readiness fails closed for unsupported welded-support assessment scope', () => {
  const item = readiness({ assessments: [assessment({ assessmentType: 'WELDED_SUPPORT', branchOutsideDiameter: null })] }).rows[0];
  assert.equal(item.status, 'METHOD_GAP');
  assert(item.methodGaps.some((entry) => entry.code === 'AIV_EXECUTABLE_ASSESSMENT_TYPE_OUTSIDE_STAGE8_ENVELOPE'));
});

test('one simultaneous group may contain multiple sources for one Assessment + Case', () => {
  const result = readiness({
    sources: [source(), secondSource()],
    relationships: [relationship(), secondRelationship('G1')],
  });
  assert.equal(result.counts.readyForQualification, 2);
  assert.equal(result.counts.methodGap, 0);
  assert.equal(findAivUnsupportedSimultaneousScopes([relationship(), secondRelationship('G1')]).length, 0);
});

test('distinct simultaneous groups under one Assessment + Case fail closed before logarithmic combination', () => {
  const relationships = [relationship({ simultaneousSourceGroup: 'G1' }), secondRelationship('G2')];
  const result = readiness({ sources: [source(), secondSource()], relationships });
  assert.equal(result.counts.readyForQualification, 0);
  assert.equal(result.counts.methodGap, 2);
  assert(result.rows.every((row) => row.methodGaps.some((entry) => entry.code === 'AIV_MULTIPLE_SIMULTANEOUS_GROUPS_UNSUPPORTED')));
  assert.equal(findAivUnsupportedSimultaneousScopes(relationships).length, 1);
  assert.throws(
    () => assertAivExecutableContract({ sources: [source(), secondSource()], assessments: [assessment()], relationships }),
    (error) => error?.code === 'AIV_EXECUTABLE_CONTRACT_INVALID'
      && error.details.issues.some((item) => item.code === 'AIV_MULTIPLE_SIMULTANEOUS_GROUPS_UNSUPPORTED'),
  );
});

test('different operating cases remain separate even when group labels differ', () => {
  const relationships = [
    relationship({ simultaneousSourceGroup: 'G1' }),
    secondRelationship('G2'),
  ];
  relationships[1] = { ...relationships[1], caseId: 'CASE-2' };
  const sources = [source(), secondSource()];
  sources[1] = { ...sources[1], caseId: 'CASE-2' };
  assert.equal(findAivUnsupportedSimultaneousScopes(relationships).length, 0);
  assert.equal(validateAivExecutableContract({ sources, assessments: [assessment()], relationships }).valid, true);
});
