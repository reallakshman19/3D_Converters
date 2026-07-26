import { deepFreeze, fail, requireEnum } from './audit-utils.js';

export const POPULATION_KINDS = deepFreeze([
  'ZONE_BRANCH',
  'COMPONENT',
  'SUPPORT',
  'TOPOLOGY_BRANCH',
  'TOPOLOGY_RELATIONSHIP',
  'TOPOLOGY_JUNCTION',
  'TOPOLOGY_BOUNDARY',
]);

const POPULATION_KIND_SET = new Set(POPULATION_KINDS);

const DEFINITIONS = {
  ZONE_BRANCH: {
    ledgerSchema: 'FbxZoneMembershipIndex.v1',
    states: {
      ASSIGNED: 'PASS',
      SHARED_BOUNDARY: 'OBSERVATION',
      CONFLICT: 'FAIL',
      UNASSIGNED: 'FAIL',
      EXCLUDED: 'OBSERVATION',
    },
  },
  COMPONENT: {
    ledgerSchema: 'FbxComponentBenchmarkReport.v1',
    states: {
      EXACT_MATCH: 'PASS',
      APPROVED_EQUIVALENT: 'OBSERVATION',
      TOPOLOGY_MISMATCH: 'FAIL',
      GEOMETRY_MISMATCH: 'FAIL',
      ATTRIBUTE_MISMATCH: 'FAIL',
      MISSING_ACTUAL: 'FAIL',
      UNEXPECTED_ACTUAL: 'FAIL',
      AMBIGUOUS_MATCH: 'BLOCKED',
      BLOCKED_IDENTITY: 'BLOCKED',
    },
  },
  SUPPORT: {
    ledgerSchema: 'FbxSupportBenchmarkReport.v1',
    states: {
      EXACT_MATCH: 'PASS',
      APPROVED_EQUIVALENT: 'OBSERVATION',
      TYPE_MISMATCH: 'FAIL',
      POSITION_MISMATCH: 'FAIL',
      ORIENTATION_MISMATCH: 'FAIL',
      PROPERTY_MISMATCH: 'FAIL',
      HOST_MISMATCH: 'FAIL',
      MISSING_ACTUAL: 'FAIL',
      UNEXPECTED_ACTUAL: 'FAIL',
      DUPLICATE_IDENTITY: 'FAIL',
      ORPHAN_SUPPORT: 'FAIL',
      AMBIGUOUS_MATCH: 'BLOCKED',
      BLOCKED: 'BLOCKED',
    },
  },
  TOPOLOGY_BRANCH: topologyDefinition(),
  TOPOLOGY_RELATIONSHIP: topologyDefinition(),
  TOPOLOGY_JUNCTION: topologyDefinition(),
  TOPOLOGY_BOUNDARY: topologyDefinition(),
};

function topologyDefinition() {
  return {
    ledgerSchema: 'FbxTopologyBenchmarkReport.v1',
    states: {
      EXACT_MATCH: 'PASS',
      APPROVED_EQUIVALENT: 'OBSERVATION',
      ENDPOINT_MISMATCH: 'FAIL',
      RELATIONSHIP_KIND_CONFLICT: 'FAIL',
      RECIPROCITY_MISMATCH: 'FAIL',
      ZONE_BOUNDARY_MISMATCH: 'FAIL',
      MISSING_ACTUAL: 'FAIL',
      UNEXPECTED_ACTUAL: 'FAIL',
      DUPLICATE_EDGE: 'FAIL',
      SELF_CONNECTION: 'FAIL',
      DEGREE_MISMATCH: 'FAIL',
      AMBIGUOUS_MATCH: 'BLOCKED',
      BLOCKED_IDENTITY: 'BLOCKED',
    },
  };
}

export const LEDGER_VOCABULARIES = deepFreeze(DEFINITIONS);

export function requirePopulationKind(value, label = 'populationKind') {
  return requireEnum(value, POPULATION_KIND_SET, label);
}

export function vocabularyForPopulation(populationKind) {
  const kind = requirePopulationKind(populationKind);
  return LEDGER_VOCABULARIES[kind];
}

export function requireLedgerSchema(populationKind, value, label = 'ledgerSchema') {
  const expected = vocabularyForPopulation(populationKind).ledgerSchema;
  if (value !== expected) fail('BLOCKED_AUDIT_VOCABULARY', `${label} must be ${expected} for ${populationKind}.`);
  return value;
}

export function requireTerminalState(populationKind, value, label = 'state') {
  const states = vocabularyForPopulation(populationKind).states;
  return requireEnum(value, new Set(Object.keys(states)), label);
}

export function terminalClassForState(populationKind, state) {
  const normalized = requireTerminalState(populationKind, state);
  return vocabularyForPopulation(populationKind).states[normalized];
}
