import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT,
  buildVibrationFacilityFitPreflightFromTables,
  runVibrationFacilityFitBenchmarkFromTables,
} from '../converters/vibration/facility/index.js';
import {
  VIBRATION_ENRICHMENT_CSV_HEADER,
  VIBRATION_FIT_DATA_BLOCKER_CSV_HEADER,
  VIBRATION_OPERATING_CASE_CSV_HEADER,
} from '../converters/vibration/tabular/index.js';
import {
  VIBRATION_TABLE_EXCHANGE_INTEGRITY,
  VIBRATION_TABLE_EXCHANGE_SCHEMA,
} from '../converters/vibration/exchange/schema.js';

function exchange() {
  return Object.freeze({
    schema: VIBRATION_TABLE_EXCHANGE_SCHEMA,
    completeExchange: true,
    integrityStatus: VIBRATION_TABLE_EXCHANGE_INTEGRITY.DECLARED_NOT_REVERIFIED,
    authority: Object.freeze({ canonicalHash: 'sha256:canonical', projectionHash: 'sha256:projection', datasetId: 'plant-a' }),
    sourceFileName: 'plant-a.xlsx',
    elements: Object.freeze([Object.freeze({ canonicalId: 'CANON-001', line: 'L-100', tag: 'P-100', type: 'PIPE' })]),
  });
}

function enrichmentCsv({ outsideDiameter = 168.3 } = {}) {
  return [
    VIBRATION_ENRICHMENT_CSV_HEADER.join(','),
    'CANON-001,L-100,,FIT_ASSESSMENT_POINT,true,BOOLEAN,,SOURCE,,,,',
    `CANON-001,L-100,,OUTSIDE_DIAMETER,${outsideDiameter},NUMBER,mm,SOURCE,,,,`,
    'CANON-001,L-100,,WALL_THICKNESS,7.11,NUMBER,mm,SOURCE,,,,',
    'CANON-001,L-100,,MAX_UNSUPPORTED_SPAN,4,NUMBER,m,SOURCE,,,,',
  ].join('\n');
}

function blockerCsv(rows) {
  return [VIBRATION_FIT_DATA_BLOCKER_CSV_HEADER.join(','), ...rows].join('\n');
}

function topology() {
  return { format: VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.PARSED_EXCHANGE, data: exchange() };
}

test('ACTIVE blocker rows fill missing process data without overwriting source tables', () => {
  const operating = [
    VIBRATION_OPERATING_CASE_CSV_HEADER.join(','),
    'L-100,NORMAL,,,,,,,,,,,,,,,,SOURCE,,,',
  ].join('\n');
  const dataBlockerCsv = blockerCsv([
    'CANON-001,L-100,NORMAL,PHASE,LIQUID,,USER-INPUT,,B-1,ACTIVE,eng-a,missing phase',
    'CANON-001,L-100,NORMAL,DENSITY,1000,kg/m3,USER-INPUT,,B-2,ACTIVE,eng-a,missing density',
    'CANON-001,L-100,NORMAL,VELOCITY,1,m/s,USER-INPUT,,B-3,ACTIVE,eng-a,missing velocity',
  ]);
  const preflight = buildVibrationFacilityFitPreflightFromTables({
    topology: topology(), operatingCaseCsv: operating, enrichmentCsv: enrichmentCsv(), dataBlockerCsv,
  });
  assert.equal(preflight.imports.dataBlockerCount, 3);
  assert.equal(preflight.imports.activeDataBlockerCount, 3);
  assert.equal(preflight.preflight.counts.ready, 1);
  const request = preflight.preflight.rows[0].sourceTrace;
  assert.equal(request.process.phase.selection, 'DATA_BLOCKER');
  assert.equal(request.process.density.selection, 'DATA_BLOCKER');
  assert.equal(request.process.velocity.selection, 'DATA_BLOCKER');
});

test('component-derived multiphase can be supplied entirely through the separate blocker table', () => {
  const dataBlockerCsv = blockerCsv([
    'CANON-001,L-100,NORMAL,PHASE,MULTIPHASE,,USER-INPUT,,B-1,ACTIVE,eng-a,',
    'CANON-001,L-100,NORMAL,MULTIPHASE_RESOLUTION_MODE,COMPONENT_DERIVED,,USER-INPUT,,B-2,ACTIVE,eng-a,',
    'CANON-001,L-100,NORMAL,GAS_MASS_FLOW,10,kg/s,USER-INPUT,,B-3,ACTIVE,eng-a,',
    'CANON-001,L-100,NORMAL,GAS_DENSITY,20,kg/m3,USER-INPUT,,B-4,ACTIVE,eng-a,',
    'CANON-001,L-100,NORMAL,LIQUID_MASS_FLOW,100,kg/s,USER-INPUT,,B-5,ACTIVE,eng-a,',
    'CANON-001,L-100,NORMAL,LIQUID_DENSITY,800,kg/m3,USER-INPUT,,B-6,ACTIVE,eng-a,',
  ]);
  const result = runVibrationFacilityFitBenchmarkFromTables({
    topology: topology(), enrichmentCsv: enrichmentCsv({ outsideDiameter: 711.2 }), dataBlockerCsv,
  });
  assert.equal(result.workflow.register.rows.length, 1);
  assert.equal(result.workflow.register.rows[0].status, 'CALCULATED_BENCHMARK');
  const central = result.workflow.result.rows[0].centralResult;
  assert.equal(central.provenance.inputResolution.mode, 'COMPONENT_DERIVED');
  assert.equal(central.qualification.effective, 'BENCHMARK_ONLY');
  assert.equal(result.screeningAuthorized, false);
});

test('manual blocker input fails closed when it collides with an existing source value', () => {
  const operating = [
    VIBRATION_OPERATING_CASE_CSV_HEADER.join(','),
    'L-100,NORMAL,,LIQUID,,,900,kg/m3,,,,,,,,,SOURCE,,,',
  ].join('\n');
  const dataBlockerCsv = blockerCsv([
    'CANON-001,L-100,NORMAL,DENSITY,1000,kg/m3,USER-INPUT,,B-1,ACTIVE,eng-a,',
  ]);
  assert.throws(
    () => buildVibrationFacilityFitPreflightFromTables({
      topology: topology(), operatingCaseCsv: operating, enrichmentCsv: enrichmentCsv(), dataBlockerCsv,
    }),
    (error) => error.code === 'FIT_DATA_BLOCKER_SOURCE_COLLISION',
  );
});

test('HOLD blocker rows remain audit-only and do not satisfy readiness', () => {
  const operating = [
    VIBRATION_OPERATING_CASE_CSV_HEADER.join(','),
    'L-100,NORMAL,,LIQUID,,,,,,,,,,,,,,SOURCE,,,',
  ].join('\n');
  const dataBlockerCsv = blockerCsv([
    'CANON-001,L-100,NORMAL,DENSITY,1000,kg/m3,USER-INPUT,,B-1,HOLD,eng-a,awaiting confirmation',
    'CANON-001,L-100,NORMAL,VELOCITY,1,m/s,USER-INPUT,,B-2,HOLD,eng-a,awaiting confirmation',
  ]);
  const preflight = buildVibrationFacilityFitPreflightFromTables({
    topology: topology(), operatingCaseCsv: operating, enrichmentCsv: enrichmentCsv(), dataBlockerCsv,
  });
  assert.equal(preflight.imports.dataBlockerCount, 2);
  assert.equal(preflight.imports.activeDataBlockerCount, 0);
  assert.equal(preflight.preflight.counts.ready, 0);
  assert(preflight.preflight.rows[0].missing.includes('density'));
});

test('method/domain gaps cannot be bypassed by inventing a data-blocker field', () => {
  const dataBlockerCsv = blockerCsv([
    'CANON-001,L-100,NORMAL,SUPPORT_SIZE_FAMILY,SMALL,,USER-INPUT,,B-1,ACTIVE,eng-a,attempted QST-003 bypass',
  ]);
  assert.throws(
    () => buildVibrationFacilityFitPreflightFromTables({
      topology: topology(), enrichmentCsv: enrichmentCsv({ outsideDiameter: 250 }), dataBlockerCsv,
    }),
    (error) => error.code === 'FIT_DATA_BLOCKER_FIELD_UNSUPPORTED',
  );
});
