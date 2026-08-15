function text(value) {
  return String(value ?? '').trim();
}

function screeningRequestError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'AivScreeningRequestError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function assertRecords(rows, label, identityFields) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw screeningRequestError(
      'AIV_SCREENING_REQUEST_TABLE_REQUIRED',
      `${label} must contain at least one record before screening.`,
      { label },
    );
  }
  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw screeningRequestError(
        'AIV_SCREENING_REQUEST_RECORD_INVALID',
        `${label} record ${index + 1} is missing or invalid. Recheck AIV readiness before screening.`,
        { label, index },
      );
    }
    const missing = identityFields.filter((field) => !text(row[field]));
    if (missing.length) {
      throw screeningRequestError(
        'AIV_SCREENING_REQUEST_IDENTITY_REQUIRED',
        `${label} record ${index + 1} is missing screening identity: ${missing.join(', ')}.`,
        { label, index, missing },
      );
    }
  });
  return rows;
}

function assertReadiness(envelope) {
  if (envelope?.schema !== 'AivReadinessTableEnvelope.v2') {
    throw screeningRequestError(
      'AIV_SCREENING_REQUEST_READINESS_REQUIRED',
      'Run AIV readiness again before screening.',
    );
  }
  const counts = envelope.readiness?.counts;
  if (!counts || Number(counts.readyForQualification) < 1
    || Number(counts.notReady) !== 0 || Number(counts.methodGap) !== 0) {
    throw screeningRequestError(
      'AIV_SCREENING_REQUEST_NOT_READY',
      'AIV screening requires at least one READY_FOR_QUALIFICATION relationship and no NOT_READY or METHOD_GAP blockers.',
      { counts: counts ?? null },
    );
  }
  assertRecords(envelope.readiness?.rows, 'Readiness', [
    'sourceCanonicalId', 'assessmentCanonicalId', 'caseId',
  ]);
  assertRecords(envelope.sources, 'Sources', ['sourceCanonicalId', 'caseId']);
  assertRecords(envelope.assessments, 'Assessments', ['assessmentCanonicalId']);
  assertRecords(envelope.sourceAssessments, 'Source→Assessment', [
    'sourceCanonicalId', 'assessmentCanonicalId', 'caseId',
  ]);
}

function relationshipKey(row) {
  return JSON.stringify([text(row?.sourceCanonicalId), text(row?.assessmentCanonicalId), text(row?.caseId)]);
}

function qualifiedInputRecords(envelope) {
  const readyRows = envelope.readiness.rows.filter((row) => row.status === 'READY_FOR_QUALIFICATION');
  const readyKeys = new Set(readyRows.map(relationshipKey));
  const relationships = envelope.sourceAssessments.filter((row) => (
    row?.applicabilityDisposition === 'APPLICABLE' && readyKeys.has(relationshipKey(row))
  ));
  const sourceKeys = new Set(relationships.map((row) => JSON.stringify([row.sourceCanonicalId, row.caseId])));
  const assessmentIds = new Set(relationships.map((row) => row.assessmentCanonicalId));
  return {
    readyRows,
    relationships,
    sources: envelope.sources.filter((row) => sourceKeys.has(JSON.stringify([row.sourceCanonicalId, row.caseId]))),
    assessments: envelope.assessments.filter((row) => assessmentIds.has(row.assessmentCanonicalId)),
  };
}

function assertJoinIntegrity(sources, assessments, relationships) {
  const sourceKeys = new Set(sources.map((row) => `${row.sourceCanonicalId}\u0000${row.caseId}`));
  const assessmentIds = new Set(assessments.map((row) => row.assessmentCanonicalId));
  for (const [index, row] of relationships.entries()) {
    const sourceKey = `${row.sourceCanonicalId}\u0000${row.caseId}`;
    if (!sourceKeys.has(sourceKey) || !assessmentIds.has(row.assessmentCanonicalId)) {
      throw screeningRequestError(
        'AIV_SCREENING_REQUEST_JOIN_INVALID',
        `Source→Assessment record ${index + 1} no longer matches the readiness-qualified Source/Assessment identities. Recheck readiness.`,
        {
          index,
          sourceCanonicalId: row.sourceCanonicalId,
          assessmentCanonicalId: row.assessmentCanonicalId,
          caseId: row.caseId,
        },
      );
    }
  }
}

function assertQualifiedProjection(records) {
  if (records.relationships.length !== records.readyRows.length) {
    throw screeningRequestError(
      'AIV_SCREENING_REQUEST_READY_PROJECTION_MISMATCH',
      'Readiness-qualified relationships no longer project one-to-one into the screening request. Recheck readiness.',
      { readyRows: records.readyRows.length, relationships: records.relationships.length },
    );
  }
}

export function buildAivEngineeringScreeningRequest({ readinessEnvelope, assumptionProfile } = {}) {
  assertReadiness(readinessEnvelope);
  const records = qualifiedInputRecords(readinessEnvelope);
  assertQualifiedProjection(records);
  const sources = assertRecords(records.sources, 'Qualified Sources', ['sourceCanonicalId', 'caseId']);
  const assessments = assertRecords(records.assessments, 'Qualified Assessments', ['assessmentCanonicalId']);
  const relationships = assertRecords(records.relationships, 'Qualified Source→Assessment', [
    'sourceCanonicalId', 'assessmentCanonicalId', 'caseId',
  ]);
  if (!readinessEnvelope.exchange || typeof readinessEnvelope.exchange !== 'object') {
    throw screeningRequestError(
      'AIV_SCREENING_REQUEST_TOPOLOGY_REQUIRED',
      'The readiness-qualified topology exchange is missing. Recheck AIV readiness.',
    );
  }
  assertJoinIntegrity(sources, assessments, relationships);
  return Object.freeze({
    calculationId: 'VIB.AIV.ACOUSTIC',
    inputs: Object.freeze({
      sources,
      assessments,
      relationships,
      topology: readinessEnvelope.exchange,
      assumptionProfile,
    }),
    options: Object.freeze({ qualificationMode: 'screening', includeEvidence: true }),
  });
}
