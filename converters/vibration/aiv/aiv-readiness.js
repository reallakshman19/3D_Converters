import { buildAivTopologyViewModel } from './aiv-topology-view-model.js';

export const AIV_READINESS_SCHEMA = 'AivReadinessPlan.v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function issue(code, field, message) {
  return { code, field, message };
}

function recordTrace(row) {
  return {
    source: row.source,
    sourceRevision: row.sourceRevision ?? null,
    recordId: row.recordId ?? null,
    status: row.status ?? null,
    reviewer: row.reviewer ?? null,
  };
}

function quantityTrace(quantity, record) {
  if (!quantity) return null;
  return { value: quantity.value, unit: quantity.unit, ...record };
}

function trimTrace(row) {
  const trim = row.lowNoiseTrim;
  return {
    state: trim.state,
    reduction: trim.reduction ? { value: trim.reduction.value, unit: trim.reduction.unit } : null,
    source: trim.source ?? null,
    sourceRevision: trim.sourceRevision ?? null,
  };
}

function buildSourceTrace(row) {
  const record = recordTrace(row);
  return {
    record,
    sourceCanonicalId: row.sourceCanonicalId,
    assessmentCanonicalId: row.assessmentCanonicalId,
    caseId: row.caseId,
    sourceDeviceType: row.sourceDeviceType,
    sourceState: row.sourceState,
    phase: row.phase,
    sonicState: row.sonicState,
    lowNoiseTrim: trimTrace(row),
    massFlow: quantityTrace(row.massFlow, record),
    upstreamPressure: { ...quantityTrace(row.upstreamPressure, record), basis: row.upstreamPressure.basis },
    downstreamPressure: { ...quantityTrace(row.downstreamPressure, record), basis: row.downstreamPressure.basis },
    referencePressure: quantityTrace(row.referencePressure, record),
    upstreamTemperature: quantityTrace(row.upstreamTemperature, record),
    molecularWeight: quantityTrace(row.molecularWeight, record),
  };
}

function validateTrim(row, missing, invalid) {
  const trim = row.lowNoiseTrim;
  if (trim.state === 'UNRESOLVED') {
    missing.push(issue(
      'AIV_LOW_NOISE_TRIM_STATE_UNRESOLVED',
      'lowNoiseTrim',
      'Low-noise-trim state is unresolved; readiness will not assume that trim is absent.',
    ));
    return;
  }
  if (trim.state === 'NONE') {
    if (trim.reduction || trim.source || trim.sourceRevision) {
      invalid.push(issue(
        'AIV_LOW_NOISE_TRIM_NONE_CONFLICT',
        'lowNoiseTrim',
        'Low-noise-trim state NONE conflicts with supplied trim reduction/vendor evidence.',
      ));
    }
    return;
  }
  if (!trim.reduction) {
    missing.push(issue(
      'AIV_LOW_NOISE_TRIM_REDUCTION_REQUIRED',
      'lowNoiseTrim.reduction',
      'Manufacturer-reduction trim requires an explicit reduction quantity.',
    ));
  } else {
    if (!(trim.reduction.value > 0)) {
      invalid.push(issue(
        'AIV_LOW_NOISE_TRIM_REDUCTION_NOT_POSITIVE',
        'lowNoiseTrim.reduction',
        'Manufacturer low-noise-trim reduction must be greater than zero.',
      ));
    }
    if (trim.reduction.unit.trim().toLowerCase() !== 'db') {
      invalid.push(issue(
        'AIV_LOW_NOISE_TRIM_UNIT_UNSUPPORTED',
        'lowNoiseTrim.reduction',
        'The controlled EI worked-example trim reduction is a dB reduction; readiness requires unit dB.',
      ));
    }
  }
  if (!trim.source) {
    missing.push(issue(
      'AIV_LOW_NOISE_TRIM_SOURCE_REQUIRED',
      'lowNoiseTrim.source',
      'Manufacturer-reduction trim requires explicit vendor/manufacturer source provenance.',
    ));
  }
}

function validateEvidence(row, exchange, topology) {
  const missing = [];
  const invalid = [];
  const methodGaps = [];
  const warnings = [];

  if (exchange.completeExchange !== true) {
    invalid.push(issue(
      'AIV_COMPLETE_TOPOLOGY_REQUIRED',
      'topology',
      'AIV readiness requires the complete five-sheet topology exchange with Connections and provenance.',
    ));
  }
  if (row.sourceCanonicalId === row.assessmentCanonicalId) {
    invalid.push(issue(
      'AIV_SOURCE_ASSESSMENT_IDENTITY_COLLISION',
      'assessmentCanonicalId',
      'Source-device identity and assessment-point identity must be distinct for this qualification envelope.',
    ));
  }
  if (topology.pathStatus !== 'RESOLVED') {
    invalid.push(issue(
      `AIV_TOPOLOGY_${topology.pathStatus}`,
      'topologyPath',
      topology.diagnostics[0]?.message ?? 'Certified source-to-assessment topology path is unresolved.',
    ));
  }
  if (row.phase !== 'GAS') {
    methodGaps.push(issue(
      'AIV_PHASE_OUTSIDE_CURRENT_QUALIFICATION_ENVELOPE',
      'phase',
      'Current controlled EI T2.7 worked-example qualification envelope is gas only; this phase remains unqualified.',
    ));
  }
  if (!(row.massFlow.value > 0)) {
    invalid.push(issue('AIV_MASS_FLOW_NOT_POSITIVE', 'massFlow', 'Active AIV source-case mass flow must be greater than zero.'));
  }
  if (!(row.molecularWeight.value > 0)) {
    invalid.push(issue('AIV_MOLECULAR_WEIGHT_NOT_POSITIVE', 'molecularWeight', 'Molecular weight must be greater than zero.'));
  }
  if (row.upstreamPressure.basis === 'ABSOLUTE' && !(row.upstreamPressure.value > 0)) {
    invalid.push(issue('AIV_UPSTREAM_ABSOLUTE_PRESSURE_NOT_POSITIVE', 'upstreamPressure', 'Absolute upstream pressure must be greater than zero.'));
  }
  if (row.downstreamPressure.basis === 'ABSOLUTE' && !(row.downstreamPressure.value > 0)) {
    invalid.push(issue('AIV_DOWNSTREAM_ABSOLUTE_PRESSURE_NOT_POSITIVE', 'downstreamPressure', 'Absolute downstream pressure must be greater than zero.'));
  }
  const gaugePresent = row.upstreamPressure.basis === 'GAUGE' || row.downstreamPressure.basis === 'GAUGE';
  if (gaugePresent && !row.referencePressure) {
    missing.push(issue(
      'AIV_REFERENCE_PRESSURE_REQUIRED',
      'referencePressure',
      'Gauge pressure is present; an explicit reference pressure quantity is required before absolute-pressure resolution.',
    ));
  }
  if (row.referencePressure && !(row.referencePressure.value > 0)) {
    invalid.push(issue('AIV_REFERENCE_PRESSURE_NOT_POSITIVE', 'referencePressure', 'Reference pressure must be greater than zero.'));
  }
  if (!gaugePresent && row.referencePressure) {
    warnings.push(issue(
      'AIV_REFERENCE_PRESSURE_NOT_REQUIRED',
      'referencePressure',
      'Both process pressures are already absolute; the supplied reference pressure is retained as provenance but is not selected by readiness.',
    ));
  }
  validateTrim(row, missing, invalid);
  if (row.sourceState === 'CLOSED') {
    methodGaps.push(issue(
      'AIV_CLOSED_SOURCE_OUTSIDE_CURRENT_ACTIVE_SOURCE_ENVELOPE',
      'sourceState',
      'The current qualification envelope covers active/open source cases; closed-source behavior requires separate method disposition.',
    ));
  }
  if (row.sonicState === 'UNRESOLVED') {
    missing.push(issue(
      'AIV_SONIC_STATE_UNRESOLVED',
      'sonicState',
      'Sonic/non-sonic branch selection is unresolved; readiness will not infer it from process data.',
    ));
  } else if (row.sonicState === 'SONIC') {
    methodGaps.push(issue(
      'AIV_SONIC_SFF6_BRANCH_UNQUALIFIED',
      'sonicState',
      'The controlled D.2.3 examples exercise SFF = 0 only; the sonic SFF = 6 branch requires independent qualification.',
    ));
  }

  return { missing, invalid, methodGaps, warnings };
}

function statusFor(groups) {
  if (groups.missing.length || groups.invalid.length) return 'NOT_READY';
  if (groups.methodGaps.length) return 'METHOD_GAP';
  return 'READY_FOR_QUALIFICATION';
}

function buildRow(exchange, row) {
  const topology = buildAivTopologyViewModel(exchange, {
    sourceCanonicalId: row.sourceCanonicalId,
    assessmentCanonicalId: row.assessmentCanonicalId,
  });
  const groups = validateEvidence(row, exchange, topology);
  const status = statusFor(groups);
  const sourceElement = exchange.elements.find((element) => element.canonicalId === row.sourceCanonicalId) ?? null;
  const assessmentElement = exchange.elements.find((element) => element.canonicalId === row.assessmentCanonicalId) ?? null;
  return {
    rowKey: JSON.stringify([row.sourceCanonicalId, row.assessmentCanonicalId, row.caseId]),
    status,
    calculationId: 'VIB.AIV.ACOUSTIC',
    sourceCanonicalId: row.sourceCanonicalId,
    assessmentCanonicalId: row.assessmentCanonicalId,
    sourceTag: sourceElement?.tag ?? null,
    assessmentTag: assessmentElement?.tag ?? null,
    sourceLine: sourceElement?.line ?? null,
    assessmentLine: assessmentElement?.line ?? null,
    caseId: row.caseId,
    sourceDeviceType: row.sourceDeviceType,
    sourceState: row.sourceState,
    phase: row.phase,
    sonicState: row.sonicState,
    lowNoiseTrimState: row.lowNoiseTrim.state,
    missing: groups.missing,
    invalid: groups.invalid,
    methodGaps: groups.methodGaps,
    warnings: groups.warnings,
    requestPrepared: false,
    numericalExecutionAuthorized: false,
    sourceTrace: buildSourceTrace(row),
    topology,
  };
}

export function buildAivReadiness(exchange, sourceCases = []) {
  if (!exchange || typeof exchange !== 'object') throw new TypeError('AIV readiness requires a parsed vibration topology exchange.');
  if (!Array.isArray(sourceCases)) throw new TypeError('AIV readiness sourceCases must be an array.');
  const rows = sourceCases.map((row) => buildRow(exchange, row));
  const counts = {
    rows: rows.length,
    readyForQualification: rows.filter((row) => row.status === 'READY_FOR_QUALIFICATION').length,
    methodGap: rows.filter((row) => row.status === 'METHOD_GAP').length,
    notReady: rows.filter((row) => row.status === 'NOT_READY').length,
  };
  return deepFreeze({
    schema: AIV_READINESS_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    authority: {
      calculationState: 'BLOCKED',
      qualificationState: 'BLOCKED',
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
    },
    counts,
    rows,
    notes: [
      'Readiness validates controlled identities, process/device evidence and topology only.',
      'READY_FOR_QUALIFICATION does not mean benchmark/screening execution is authorized.',
      'No AIV source power, attenuation, LOF or assessment result is calculated by this plan.',
    ],
  });
}
