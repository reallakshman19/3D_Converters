import { createBoltMasterStore } from './master-store.js';

/**
 * Bolt master records transcribed from the committed source workbooks.
 *
 * TRANSCRIBED / ENGINEERING_SANDBOX records, the ceiling the v1 store allows.
 * They let the console offer governed lookups instead of free-typed numbers.
 * They are not design authority, and one grade is deliberately unusable — see
 * the Titanium record below.
 */

const TORQUES_SOURCE_ID = 'BOLT_TORQUES_BS3580';
const DETAILED_SOURCE_ID = 'BOLT_TORQUE_CALC_DETAILED';

const SOURCES = [
  {
    recordId: 'source/bolt-torques',
    sourceId: TORQUES_SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    path: 'docs/flange/Bolt Torques(1).xls',
    sha256: 'ac216a681f070d4795ebf9074efddc0fb5372dbc5d177a01b92d134c3ee459bf',
    method: 'BS 3580 Appendix B eq. 2',
  },
  {
    recordId: 'source/bolt-torque-calc',
    sourceId: DETAILED_SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    path: 'docs/flange/Bolt Torque Calc(1).xls',
    sha256: 'efba9f80138500464b38b773a53d6f524803513ca9453528c8e95d818493370f',
    method: 'Detailed V-thread torque',
  },
];

/** [nominalDiameterMm, tensileStressAreaMm2] as tabulated in the source. */
const METRIC_THREADS = [
  [6, 20.1],
  [8, 36.6],
  [10, 58],
  [12, 84.3],
  [14, 115],
  [16, 157],
  [18, 192],
  [20, 245],
  [22, 303],
  [24, 353],
  [27, 459],
  [30, 561],
  [33, 761],
  [36, 817],];

/** [lubricantCondition, nutFactor] */
const FRICTION_CONDITIONS = [
  ["No lubricant - clean mild steel bolts", 0.25],
  ["No lubricant clean st. stl. Bolts", 0.3],
  ["Zinc plate (dry)", 0.29],
  ["Machine Oil", 0.2],
  ["Molybdenum disulphide based grease", 0.15],
  ["copper based anti-seize", 0.15],
  ["solid PTFE film", 0.12],];

const UNRESOLVED = Object.freeze([
  'Reference strengths are tabulated without a temperature; they are recorded without one.',
  'The tensile stress area basis is tabulated, not derived, for the metric threads.',
  'Titanium reference strength does not reproduce the source table and is not usable.',
]);

function threadRecords() {
  const metric = METRIC_THREADS.map(([nominalDiameterMm, tensileStressAreaMm2]) => ({
    recordId: `thread/m${nominalDiameterMm}`,
    sourceId: TORQUES_SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    designation: `M${nominalDiameterMm}`,
    series: 'METRIC_COARSE',
    nominalDiameterMm,
    nominalDiameterM: nominalDiameterMm / 1000,
    tensileStressAreaMm2,
    tensileStressAreaM2: tensileStressAreaMm2 * 1e-6,
    areaBasis: 'TABULATED_IN_SOURCE',
  }));

  // The detailed workbook derives its own thread geometry rather than tabulating
  // an area, so this record carries the geometry the derivation needs.
  metric.push({
    recordId: 'thread/1in-8un',
    sourceId: DETAILED_SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    designation: '1"-8UN',
    series: 'UNIFIED_8_THREAD',
    nominalDiameterM: 0.0254,
    pitchM: 0.125 * 0.0254,
    threadsPerInch: 8,
    includedThreadAngleDeg: 60,
    areaBasis: 'DERIVED_FROM_THREAD_GEOMETRY',
  });
  return metric;
}

function materialRecords() {
  const reproducible = [
    ['4.6/304/316', 'grade-4-6-304-316', 230],
    ['8.8', 'grade-8-8', 620],
    ['B7', 'grade-b7', 730],
  ].map(([grade, slug, referenceStrengthMPa]) => ({
    recordId: `material/${slug}`,
    sourceId: TORQUES_SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    grade,
    referenceStrengthMPa,
    referenceStrengthPa: referenceStrengthMPa * 1e6,
    temperatureC: null,
    reproducesSourceTable: true,
  }));

  // Titanium is recorded so the gap is visible, and made unusable rather than
  // plausible: its tabulated torques need an effective strength-times-nut-factor
  // product a third higher than the values the sheet prints, and the two
  // candidate readings cannot be separated from cell values alone.
  reproducible.push({
    recordId: 'material/titanium',
    sourceId: TORQUES_SOURCE_ID,
    recordState: 'SOURCE_PENDING',
    useAuthority: 'NONE',
    grade: 'Titanium',
    referenceStrengthMPa: null,
    statedReferenceStrengthMPa: 275,
    temperatureC: null,
    reproducesSourceTable: false,
    unresolvedReason: 'Stated 275 MPa does not reproduce the source torque column at the stated nut factor 0.15. Consistent with either 366.67 MPa at K=0.15 or 275 MPa at K=0.2; indistinguishable from cell values.',
  });
  return reproducible;
}

function frictionConditionRecords() {
  return FRICTION_CONDITIONS.map(([condition, nutFactor], index) => ({
    recordId: `friction/${index + 1}`,
    sourceId: TORQUES_SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    condition,
    nutFactor,
    measured: false,
    note: 'Tabulated guidance value. A critical joint needs a measured nut factor for its actual finish and lubricant.',
  }));
}

export function buildBoltMasterStore() {
  return createBoltMasterStore({
    metadata: {
      datasetId: 'bolt-master-dataset/v1',
      transcribedFrom: [TORQUES_SOURCE_ID, DETAILED_SOURCE_ID],
      unresolved: UNRESOLVED,
      note: 'Transcription of project workbooks, not governed master data.',
    },
    collections: {
      sources: SOURCES,
      threads: threadRecords(),
      materials: materialRecords(),
      frictionConditions: frictionConditionRecords(),
    },
  });
}

export { UNRESOLVED as BOLT_MASTER_DATASET_UNRESOLVED };
