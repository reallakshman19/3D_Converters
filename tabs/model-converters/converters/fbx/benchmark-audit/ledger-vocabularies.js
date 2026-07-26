import { deepFreeze, fail, requireEnum } from './audit-utils.js';

export const POPULATION_KINDS = deepFreeze([
  'ZONE_BRANCH','COMPONENT','SUPPORT','TOPOLOGY_BRANCH','TOPOLOGY_RELATIONSHIP','TOPOLOGY_JUNCTION','TOPOLOGY_BOUNDARY',
]);
const POPULATION_KIND_SET = new Set(POPULATION_KINDS);
export const DIAGNOSTIC_STATES = deepFreeze([
  'DIAGNOSTIC_CANDIDATE','DIAGNOSTIC_COLLISION','DIAGNOSTIC_SPATIAL','DIAGNOSTIC_STRUCTURAL',
]);
const DIAGNOSTIC_STATE_SET = new Set(DIAGNOSTIC_STATES);

function topologyDefinition() {
  return { ledgerSchema: 'FbxTopologyBenchmarkReport.v1', states: {
    EXACT_MATCH:'PASS', APPROVED_EQUIVALENT:'OBSERVATION', ENDPOINT_MISMATCH:'FAIL',
    RELATIONSHIP_KIND_CONFLICT:'FAIL', RECIPROCITY_MISMATCH:'FAIL', ZONE_BOUNDARY_MISMATCH:'FAIL',
    MISSING_ACTUAL:'FAIL', UNEXPECTED_ACTUAL:'FAIL', DUPLICATE_EDGE:'FAIL', SELF_CONNECTION:'FAIL',
    DEGREE_MISMATCH:'FAIL', AMBIGUOUS_MATCH:'BLOCKED', BLOCKED_IDENTITY:'BLOCKED',
  }};
}
const DEFINITIONS = {
  ZONE_BRANCH: { ledgerSchema:'FbxZoneMembershipIndex.v1', states: {
    ASSIGNED:'PASS', SHARED_BOUNDARY:'OBSERVATION', CONFLICT:'BLOCKED', UNASSIGNED:'BLOCKED', EXCLUDED:'BLOCKED',
  }},
  COMPONENT: { ledgerSchema:'FbxComponentBenchmarkReport.v1', states: {
    EXACT_MATCH:'PASS', APPROVED_EQUIVALENT:'OBSERVATION', TOPOLOGY_MISMATCH:'FAIL', GEOMETRY_MISMATCH:'FAIL',
    ATTRIBUTE_MISMATCH:'FAIL', MISSING_ACTUAL:'FAIL', UNEXPECTED_ACTUAL:'FAIL', AMBIGUOUS_MATCH:'BLOCKED', BLOCKED_IDENTITY:'BLOCKED',
  }},
  SUPPORT: { ledgerSchema:'FbxSupportBenchmarkReport.v1', states: {
    EXACT_MATCH:'PASS', APPROVED_EQUIVALENT:'OBSERVATION', TYPE_MISMATCH:'FAIL', POSITION_MISMATCH:'FAIL',
    ORIENTATION_MISMATCH:'FAIL', PROPERTY_MISMATCH:'FAIL', HOST_MISMATCH:'FAIL', MISSING_ACTUAL:'FAIL',
    UNEXPECTED_ACTUAL:'FAIL', DUPLICATE_IDENTITY:'FAIL', ORPHAN_SUPPORT:'FAIL', AMBIGUOUS_MATCH:'BLOCKED', BLOCKED:'BLOCKED',
  }},
  TOPOLOGY_BRANCH: topologyDefinition(), TOPOLOGY_RELATIONSHIP: topologyDefinition(),
  TOPOLOGY_JUNCTION: topologyDefinition(), TOPOLOGY_BOUNDARY: topologyDefinition(),
};
export const LEDGER_VOCABULARIES = deepFreeze(DEFINITIONS);
export function requirePopulationKind(value,label='populationKind'){ return requireEnum(value,POPULATION_KIND_SET,label); }
export function vocabularyForPopulation(kind){ return LEDGER_VOCABULARIES[requirePopulationKind(kind)]; }
export function requireLedgerSchema(kind,value,label='ledgerSchema'){
  const expected=vocabularyForPopulation(kind).ledgerSchema;
  if(value!==expected) fail('BLOCKED_AUDIT_VOCABULARY',`${label} must be ${expected} for ${kind}.`);
  return value;
}
export function requireTerminalState(kind,value,label='state'){
  return requireEnum(value,new Set(Object.keys(vocabularyForPopulation(kind).states)),label);
}
export function requireDiagnosticState(value,label='diagnosticState'){ return requireEnum(value,DIAGNOSTIC_STATE_SET,label); }
export function terminalClassForState(kind,state){ return vocabularyForPopulation(kind).states[requireTerminalState(kind,state)]; }
