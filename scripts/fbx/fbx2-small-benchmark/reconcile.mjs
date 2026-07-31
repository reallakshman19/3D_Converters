function compareText(left, right) {
  const a = String(left ?? ''), b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function orderedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort(compareText);
}

function crosswalkIndex(componentCrosswalk) {
  return new Map((componentCrosswalk?.managedComponents || [])
    .map((record) => [record.managedRecordId, record]));
}

function evidenceIndex(familyEvidence) {
  const entries = [
    ['ELBOW', familyEvidence?.elbowEvidence?.elbowEvidence],
    ['TEE', familyEvidence?.teeEvidence?.teeEvidence],
    ['REDUCER', familyEvidence?.reducerEvidence?.reducerEvidence],
    ['BRANCH_FITTING', familyEvidence?.branchFittingEvidence?.branchFittingEvidence],
    ['INLINE_ASSEMBLY', familyEvidence?.inlineAssemblyEvidence?.inlineAssemblyEvidence],
  ];
  return Object.fromEntries(entries.map(([family, records]) => [
    family,
    new Map((records || []).map((record) => [record.managedRecordId, record])),
  ]));
}

function sourceIndexes(sourceInventory) {
  const byOccurrence = new Map(), byModel = new Map(), byGeometry = new Map();
  for (const record of sourceInventory.records || []) {
    byOccurrence.set(record.sourceOccurrenceId, record);
    const modelValues = byModel.get(record.sourceModelObjectId) || [];
    modelValues.push(record.sourceOccurrenceId); byModel.set(record.sourceModelObjectId, modelValues);
    for (const geometryId of record.geometryObjectIds || []) {
      const geometryValues = byGeometry.get(geometryId) || [];
      geometryValues.push(record.sourceOccurrenceId); byGeometry.set(geometryId, geometryValues);
    }
  }
  return { byOccurrence, byModel, byGeometry };
}

function supportIndexes(supportEvidence, hostEvidence) {
  return {
    candidateByOccurrence: new Map((supportEvidence?.candidates || [])
      .map((record) => [record.occurrenceId, record])),
    hostByOccurrence: new Map((hostEvidence?.candidateDispositions || [])
      .map((record) => [record.occurrenceId, record])),
  };
}

function pipeIndex(autoPipe) {
  return new Map((autoPipe?.classificationDispositions || [])
    .map((record) => [record.sourceOccurrenceId, record]));
}

function supportBinding(record, sources) {
  if (record.sourceOccurrenceId) {
    return sources.byOccurrence.has(record.sourceOccurrenceId)
      ? { exact: record.sourceOccurrenceId, candidates: [], disposition: 'MATCHED_SOURCE_COMPONENT' }
      : { exact: null, candidates: [], disposition: 'UNRESOLVED_SOURCE_BINDING' };
  }
  const candidates = [];
  if (record.sourceModelObjectId) candidates.push(...(sources.byModel.get(record.sourceModelObjectId) || []));
  for (const geometryId of record.sourceGeometryObjectIds || []) {
    candidates.push(...(sources.byGeometry.get(geometryId) || []));
  }
  const unique = orderedUnique(candidates);
  return {
    exact: null,
    candidates: unique,
    disposition: unique.length ? 'SOURCE_OCCURRENCE_CANDIDATES' : 'UNMATCHED_MANAGED_COMPONENT',
  };
}

function bindingFor(record, indexes) {
  if (record.family === 'SUPPORT') return supportBinding(record, indexes.sources);
  const crosswalk = indexes.crosswalk.get(record.managedRecordId);
  return {
    exact: crosswalk?.exactSourceOccurrenceId ?? null,
    candidates: crosswalk?.candidateSourceOccurrenceIds || [],
    disposition: crosswalk?.disposition ?? 'UNMATCHED_MANAGED_COMPONENT',
  };
}

function unresolved(record, binding, reason) {
  return {
    status: 'UNRESOLVED',
    disposition: reason,
    exactSourceOccurrenceId: binding.exact,
    candidateSourceOccurrenceIds: binding.candidates,
    reasons: [reason],
  };
}

function generatedDisposition(record, binding) {
  const reason = record.generationDisposition === 'EVIDENCED'
    ? 'REFERENCE_GENERATED_COMPONENT_NOT_REPLAYED'
    : 'GENERATED_PROVENANCE_UNRESOLVED';
  return unresolved(record, binding, reason);
}

function pipeDisposition(binding, indexes) {
  const classification = indexes.pipe.get(binding.exact);
  if (!classification) {
    return { status: 'BLOCKED', disposition: 'PIPE_EVIDENCE_MISSING', reasons: ['PIPE_EVIDENCE_MISSING'] };
  }
  if (classification.admitted === true) {
    return { status: 'PASS', disposition: 'PIPE_GEOMETRY_PARITY_PASS', reasons: [] };
  }
  return {
    status: 'BLOCKED',
    disposition: 'PIPE_GEOMETRY_PARITY_BLOCKED',
    reasons: [classification.reason || 'PIPE_ADMISSION_BLOCKED'],
  };
}

function fittingDisposition(record, indexes) {
  const evidence = indexes.family[record.family]?.get(record.managedRecordId);
  if (!evidence) {
    return { status: 'BLOCKED', disposition: 'FAMILY_EVIDENCE_MISSING', reasons: ['FAMILY_EVIDENCE_MISSING'] };
  }
  if (evidence.disposition === 'ADMITTED') {
    return { status: 'PASS', disposition: `${record.family}_GEOMETRY_PARITY_PASS`, reasons: [] };
  }
  return {
    status: 'BLOCKED',
    disposition: `${record.family}_GEOMETRY_PARITY_BLOCKED`,
    reasons: orderedUnique(evidence.blockingReasons || ['FAMILY_EVIDENCE_BLOCKED']),
  };
}

function supportDisposition(binding, indexes) {
  const candidate = indexes.support.candidateByOccurrence.get(binding.exact);
  if (!candidate) {
    return { status: 'BLOCKED', disposition: 'SUPPORT_CANDIDATE_NOT_EVIDENCED', reasons: ['SUPPORT_CANDIDATE_NOT_EVIDENCED'] };
  }
  const host = indexes.support.hostByOccurrence.get(binding.exact);
  if (!host) {
    return { status: 'BLOCKED', disposition: 'SUPPORT_HOST_EVIDENCE_MISSING', reasons: ['SUPPORT_HOST_EVIDENCE_MISSING'] };
  }
  if (['SINGLE_HOST_PROVED', 'MULTI_HOST_PROVED'].includes(host.hostDisposition)) {
    return { status: 'PASS', disposition: 'SUPPORT_HOST_PARITY_PASS', reasons: host.reasons || [] };
  }
  return {
    status: 'BLOCKED',
    disposition: 'SUPPORT_HOST_PARITY_BLOCKED',
    reasons: orderedUnique(host.reasons || [host.hostDisposition]),
  };
}

function exactDisposition(record, binding, indexes) {
  if (record.family === 'PIPE') return pipeDisposition(binding, indexes);
  if (record.family === 'SUPPORT') return supportDisposition(binding, indexes);
  if (indexes.family[record.family]) return fittingDisposition(record, indexes);
  return unresolved(record, binding, 'UNSUPPORTED_MANAGED_FAMILY');
}

function recordDisposition(record, indexes) {
  const binding = bindingFor(record, indexes);
  if (record.identityDisposition !== 'EXPLICIT'
      || record.branchIdentityDisposition !== 'EXPLICIT') {
    return unresolved(record, binding, 'MANAGED_IDENTITY_NOT_EXPLICIT');
  }
  if (record.generated) return generatedDisposition(record, binding);
  if (!binding.exact) {
    const reason = binding.disposition === 'SOURCE_OCCURRENCE_CANDIDATES'
      ? 'NON_AUTHORITATIVE_SOURCE_CANDIDATES'
      : binding.disposition === 'UNRESOLVED_SOURCE_BINDING'
        ? 'EXPLICIT_SOURCE_BINDING_OUTSIDE_SELECTED_ZONE'
        : 'EXACT_SOURCE_BINDING_MISSING';
    return unresolved(record, binding, reason);
  }
  const result = exactDisposition(record, binding, indexes);
  return { ...result, exactSourceOccurrenceId: binding.exact, candidateSourceOccurrenceIds: [] };
}

function benchmarkRecord(record, indexes) {
  return Object.freeze({
    managedRecordId: record.managedRecordId,
    branchId: record.branchId,
    reference: record.reference,
    outerType: record.outerType,
    rawType: record.rawType,
    family: record.family,
    generated: record.generated,
    generationMethod: record.generationMethod,
    ...recordDisposition(record, indexes),
  });
}

function countRecords(records, family, status) {
  return records.filter((record) => (!family || record.family === family)
    && (!status || record.status === status)).length;
}

function familySummary(records) {
  const families = orderedUnique(records.map((record) => record.family));
  return families.map((family) => {
    const total = countRecords(records, family);
    const pass = countRecords(records, family, 'PASS');
    const blocked = countRecords(records, family, 'BLOCKED');
    const unresolved = total - pass - blocked;
    return Object.freeze({ family, total, pass, blocked, unresolved, parityRatio: total ? pass / total : 0 });
  });
}

function summaryOf(records) {
  const total = records.length;
  const pass = countRecords(records, null, 'PASS');
  const blocked = countRecords(records, null, 'BLOCKED');
  const unresolved = total - pass - blocked;
  return Object.freeze({
    managedComponentCount: total,
    terminalDispositionCount: total,
    passCount: pass,
    blockedCount: blocked,
    unresolvedCount: unresolved,
    coverageRatio: total ? 1 : 0,
    parityRatio: total ? pass / total : 0,
    parityTargetRatio: 1,
    parityTargetMet: total > 0 && pass === total,
  });
}

export function reconcileFbx2SmallBenchmark({
  managedInventory,
  componentCrosswalk,
  sourceInventory,
  autoPipe,
  familyEvidence,
  supportEvidence,
  supportHostEvidence,
} = {}) {
  if (!Array.isArray(managedInventory?.components) || !Array.isArray(sourceInventory?.records)) {
    throw new TypeError('FBX2 small benchmark managed and source inventories are required.');
  }
  const indexes = {
    crosswalk: crosswalkIndex(componentCrosswalk),
    family: evidenceIndex(familyEvidence),
    sources: sourceIndexes(sourceInventory),
    pipe: pipeIndex(autoPipe),
    support: supportIndexes(supportEvidence, supportHostEvidence),
  };
  const records = managedInventory.components.map((record) => benchmarkRecord(record, indexes));
  return Object.freeze({
    records: Object.freeze(records),
    familySummary: Object.freeze(familySummary(records)),
    summary: summaryOf(records),
  });
}
