import { assertVibrationRcaHypothesis } from './contracts.js';

export const VIBRATION_RCA_LEDGER_SCHEMA = 'VibrationRcaLedger.v1';

export const VIBRATION_RCA_LEDGER_AUTHORITY = Object.freeze({
  purpose: 'PROJECT_SCOPED_RCA_SESSION_LEDGER_ONLY',
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  numericalAuthority: 'NONE',
  aggregationAuthority: 'NONE',
  persistenceAuthority: 'NONE',
  completionAuthority: 'NONE',
  rootCauseAuthority: 'EXPLICIT_ENGINEER_ATTESTATION_ONLY',
  platformRootCauseInference: false,
  autoConfirmAllowed: false,
  storageSemantics: 'APPEND_ONLY_HYPOTHESIS_REVISION_LEDGER',
  determinesApplicability: false,
  determinesAssessmentCompleteness: false,
  determinesCompletion: false,
  determinesGoverningResult: false,
});

function ledgerError(code, message) {
  const error = new Error(message);
  error.name = 'VibrationRcaLedgerError';
  error.code = code;
  return error;
}

function text(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw ledgerError('VIBRATION_RCA_LEDGER_TEXT_REQUIRED', `${field} is required.`);
  return normalized;
}

function time(value) {
  const normalized = text(value, 'recordedAt');
  if (Number.isNaN(Date.parse(normalized))) throw ledgerError('VIBRATION_RCA_LEDGER_TIME_INVALID', 'recordedAt must be ISO-compatible.');
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function authority(value) {
  for (const [key, expected] of Object.entries(VIBRATION_RCA_LEDGER_AUTHORITY)) {
    if (value?.[key] !== expected) throw ledgerError('VIBRATION_RCA_LEDGER_AUTHORITY_INVALID', `RCA ledger authority mismatch at ${key}.`);
  }
}

function recordId(sequence, projectId, hypothesisId, revision, hypothesisRecordId) {
  return JSON.stringify([sequence, projectId, hypothesisId, revision, hypothesisRecordId]);
}

function hypothesisKey(projectId, hypothesis) {
  return JSON.stringify([projectId, hypothesis.occurrence.occurrenceId, hypothesis.hypothesisId]);
}

export function createVibrationRcaLedger() {
  return deepFreeze({ schema: VIBRATION_RCA_LEDGER_SCHEMA, records: [], authority: VIBRATION_RCA_LEDGER_AUTHORITY });
}

export function assertVibrationRcaLedger(value) {
  if (value?.schema !== VIBRATION_RCA_LEDGER_SCHEMA || !Array.isArray(value.records)) {
    throw ledgerError('VIBRATION_RCA_LEDGER_SCHEMA_INVALID', `Expected ${VIBRATION_RCA_LEDGER_SCHEMA}.`);
  }
  authority(value.authority);
  const revisions = new Map();
  const lastFingerprints = new Map();
  value.records.forEach((record, index) => {
    const sequence = index + 1;
    const projectId = text(record?.projectId, 'record.projectId');
    const hypothesis = assertVibrationRcaHypothesis(record?.hypothesis);
    const key = hypothesisKey(projectId, hypothesis);
    const revision = (revisions.get(key) ?? 0) + 1;
    if (projectId !== hypothesis.projectId
        || record.sequence !== sequence
        || record.hypothesisRevision !== revision
        || record.recordId !== recordId(sequence, projectId, hypothesis.hypothesisId, revision, hypothesis.hypothesisRecordId)) {
      throw ledgerError('VIBRATION_RCA_LEDGER_SEQUENCE_INVALID', 'RCA ledger records must be globally contiguous and hypothesis revisions must be contiguous.');
    }
    time(record.recordedAt);
    if (lastFingerprints.get(key) === hypothesis.hypothesisFingerprint) {
      throw ledgerError('VIBRATION_RCA_LEDGER_DUPLICATE_REVISION', 'An RCA hypothesis revision must change its statement, evidence or conclusion custody.');
    }
    revisions.set(key, revision);
    lastFingerprints.set(key, hypothesis.hypothesisFingerprint);
  });
  return value;
}

export function appendVibrationRcaHypothesis(ledgerInput, projectIdInput, hypothesisInput, recordedAt) {
  const ledger = assertVibrationRcaLedger(ledgerInput);
  const projectId = text(projectIdInput, 'projectId');
  const hypothesis = assertVibrationRcaHypothesis(hypothesisInput);
  if (hypothesis.projectId !== projectId) throw ledgerError('VIBRATION_RCA_LEDGER_PROJECT_MISMATCH', 'RCA hypothesis project does not match ledger append scope.');
  const key = hypothesisKey(projectId, hypothesis);
  const prior = ledger.records.filter((record) => hypothesisKey(record.projectId, record.hypothesis) === key);
  if (prior.at(-1)?.hypothesis.hypothesisFingerprint === hypothesis.hypothesisFingerprint) {
    throw ledgerError('VIBRATION_RCA_LEDGER_DUPLICATE_REVISION', 'An RCA hypothesis revision must change its statement, evidence or conclusion custody.');
  }
  const sequence = ledger.records.length + 1;
  const hypothesisRevision = prior.length + 1;
  const record = deepFreeze({
    sequence,
    hypothesisRevision,
    recordId: recordId(sequence, projectId, hypothesis.hypothesisId, hypothesisRevision, hypothesis.hypothesisRecordId),
    projectId,
    recordedAt: time(recordedAt),
    hypothesis,
  });
  return deepFreeze({
    schema: VIBRATION_RCA_LEDGER_SCHEMA,
    records: [...ledger.records, record],
    authority: VIBRATION_RCA_LEDGER_AUTHORITY,
  });
}
