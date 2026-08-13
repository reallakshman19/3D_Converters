import assert from 'node:assert/strict';
import test from 'node:test';

import { AIV_DEFAULT_ASSUMPTION_PROFILE } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { calculateAiv } from '../converters/vibration/aiv/aiv-calculator.js';
import { createAivFlareNetwork } from '../converters/vibration/aiv/aiv-flare-network.js';
import { generateAivInputTablesFromFlareNetwork } from '../converters/vibration/aiv/aiv-flare-network-table-generator.js';
import { parseAivAssessmentCsv } from '../converters/vibration/aiv/assessment-csv.js';
import { parseAivSourceCsv } from '../converters/vibration/aiv/source-csv.js';
import { parseAivSourceAssessmentCsv } from '../converters/vibration/aiv/source-assessment-csv.js';
import { serializeVibrationCsvRows } from '../converters/vibration/tabular/csv.js';

const FLOW_FOR_POINT_160 = 15.113591636395977;
const FLOW_FOR_POINT_150 = 4.779337319668265;

function sourceNode(canonicalId, massFlow, y) {
  return {
    canonicalId, kind: 'SOURCE', tag: canonicalId, line: 'FL-MULTI', presentation: { x: 100, y },
    sourceInput: {
      caseId: 'SIM-CASE', sourceDeviceType: 'CONTROL_VALVE', sourceState: 'ACTIVE', phase: 'GAS',
      massFlow: { value: massFlow, unit: 'kg/s' },
      upstreamPressure: { value: 5, unit: 'MPa', basis: 'ABSOLUTE' },
      downstreamPressure: { value: 1, unit: 'MPa', basis: 'ABSOLUTE' },
      upstreamTemperature: { value: 300, unit: 'K' },
      molecularWeight: { value: 20, unit: 'g/mol' },
      lowNoiseTrim: { state: 'NONE' }, sonicState: 'NON_SONIC', source: 'AIV_NETWORK_BENCHMARK', sourceRevision: '1',
    },
  };
}

function multiNetwork(secondFlow) {
  return createAivFlareNetwork({
    networkId: 'AIV-MULTI-NETWORK', revision: '1', source: 'AIV_NETWORK_BENCHMARK', sourceRevision: '1',
    nodes: [
      sourceNode('SRC-A', FLOW_FOR_POINT_160, 100),
      sourceNode('SRC-B', secondFlow, 240),
      {
        canonicalId: 'ASSESS-1', kind: 'ASSESSMENT', tag: 'ASSESS-1', line: 'FL-MULTI', presentation: { x: 650, y: 170 },
        assessmentInput: {
          assessmentType: 'WELDOLET', mainOutsideDiameter: { value: 168.3, unit: 'mm' },
          mainInsideDiameter: { value: 154, unit: 'mm' }, mainWallThickness: { value: 7.11, unit: 'mm' },
          branchOutsideDiameter: { value: 60.3, unit: 'mm' }, material: 'CARBON_STEEL', duplexState: 'NO',
          source: 'AIV_NETWORK_BENCHMARK', sourceRevision: '1',
        },
      },
    ],
    segments: [
      { segmentId: 'PIPE-A', fromNodeId: 'SRC-A', toNodeId: 'ASSESS-1', line: 'FL-MULTI', physicalLength: { value: 0.8, unit: 'm' } },
      { segmentId: 'PIPE-B', fromNodeId: 'SRC-B', toNodeId: 'ASSESS-1', line: 'FL-MULTI', physicalLength: { value: 0.8, unit: 'm' } },
    ],
  });
}

function parseGenerated(network) {
  const generated = generateAivInputTablesFromFlareNetwork(network);
  const csv = (table) => serializeVibrationCsvRows([table.header, ...table.rows]);
  return {
    generated,
    sources: parseAivSourceCsv(csv(generated.tables.sources)),
    assessments: parseAivAssessmentCsv(csv(generated.tables.assessments)),
    relationships: parseAivSourceAssessmentCsv(csv(generated.tables.relationships)),
  };
}

function calculate(secondFlow) {
  const parsed = parseGenerated(multiNetwork(secondFlow));
  const result = calculateAiv({
    sources: parsed.sources,
    assessments: parsed.assessments,
    relationships: parsed.relationships,
    exchange: { elements: [{ canonicalId: 'ASSESS-1', line: 'FL-MULTI' }] },
    assumptionProfile: AIV_DEFAULT_ASSUMPTION_PROFILE,
    qualificationMode: 'screening',
  });
  return { parsed, result, assessment: result.assessmentResults[0] };
}

test('drawn two-source network reproduces 160 + 160 benchmark with both canonical source IDs', () => {
  const { parsed, assessment } = calculate(FLOW_FOR_POINT_160);
  assert.equal(parsed.generated.tables.relationships.rows.length, 2);
  assert.deepEqual(assessment.contributingSourceCanonicalIds, ['SRC-A', 'SRC-B']);
  assert.equal(assessment.sourceContributionsAtPoint.length, 2);
  assert.ok(Math.abs(assessment.sourceContributionsAtPoint[0].pointPwlDb - 160) < 1e-10);
  assert.ok(Math.abs(assessment.sourceContributionsAtPoint[1].pointPwlDb - 160) < 1e-10);
  assert.ok(Math.abs(assessment.combinedPointPwlDb - 163.0102999566398) < 1e-10);
});

test('drawn two-source network reproduces 160 + 150 benchmark with both canonical source IDs', () => {
  const { assessment } = calculate(FLOW_FOR_POINT_150);
  assert.deepEqual(assessment.contributingSourceCanonicalIds, ['SRC-A', 'SRC-B']);
  assert.equal(assessment.sourceContributionsAtPoint.length, 2);
  assert.ok(Math.abs(assessment.sourceContributionsAtPoint[0].pointPwlDb - 160) < 1e-10);
  assert.ok(Math.abs(assessment.sourceContributionsAtPoint[1].pointPwlDb - 150) < 1e-10);
  assert.ok(Math.abs(assessment.combinedPointPwlDb - 160.41392685158226) < 1e-10);
});
