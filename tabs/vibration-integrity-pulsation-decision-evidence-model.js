import { resolveVibrationRoadmapSourceBinding } from '../converters/vibration/source/registry.js';

export const VIBRATION_PULSATION_DECISION_EVIDENCE_STORE_SCHEMA = 'VibrationPulsationDecisionEvidenceStore.v1';
export const VIBRATION_PULSATION_DECISION_EVIDENCE_RECORD_SCHEMA = 'VibrationPulsationDecisionEvidenceRecord.v1';

export const VIBRATION_PULSATION_DECISION_MECHANISMS = Object.freeze({
  T24_RECIP_PD: 'reciprocatingPulsation',
  T25_ROTATING_STALL: 'rotatingStall',
});

export const VIBRATION_PULSATION_DECISION_EVIDENCE_AUTHORITY = Object.freeze({
  purpose: 'PROJECT_DECISION_EVIDENCE_CUSTODY_ONLY',
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  automaticApplicability: false,
  numericalExecutionAllowed: false,
  governingEligible: false,
  eiMainLineContributionAllowed: false,
  secondarySynthesisAuthority: 'NONE',
});

const APPLICABILITY = Object.freeze(['UNRESOLVED', 'APPLICABLE', 'NOT_APPLICABLE']);

const META = Object.freeze({
  [VIBRATION_PULSATION_DECISION_MECHANISMS.T24_RECIP_PD]: Object.freeze({
    label: 'T2.4 · Reciprocating / positive-displacement pulsation',
    sourceMasterId: 'EI_AVIFF.T2.4.RECIP_PD_RULES.v1',
    evidenceFields: Object.freeze([
      field('equipmentIdentityRef', 'Equipment / pulsation-source identity'),
      field('operatingScenarioRef', 'Operating scenario / case evidence'),
      field('applicabilityBasisRef', 'Applicability disposition basis'),
      field('pulsationEvidenceRef', 'Project / OEM pulsation evidence', true),
      field('systemResponseEvidenceRef', 'System-response / acoustic-study evidence', true),
    ]),
  }),
  [VIBRATION_PULSATION_DECISION_MECHANISMS.T25_ROTATING_STALL]: Object.freeze({
    label: 'T2.5 · Rotating-stall pulsation',
    sourceMasterId: 'EI_AVIFF.T2.5.ROTATING_STALL_RULES.v1',
    evidenceFields: Object.freeze([
      field('equipmentIdentityRef', 'Rotating-equipment identity'),
      field('operatingScenarioRef', 'Operating scenario / case evidence'),
      field('applicabilityBasisRef', 'Applicability disposition basis'),
      field('oemPerformanceMapRef', 'OEM performance-map evidence', true),
      field('operatingPointAssessmentRef', 'Operating-point / stall-assessment evidence', true),
    ]),
  }),
});

function field(key, label, applicableOnly = false) {
  return Object.freeze({ key, label, applicableOnly });
}

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function mechanismMeta(mechanismId) {
  const meta = META[text(mechanismId)];
  if (!meta) throw new RangeError(`UNSUPPORTED_PULSATION_DECISION_MECHANISM:${text(mechanismId) || 'EMPTY'}`);
  return meta;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function nextStore(records, nextSequence) {
  return deepFreeze({
    schema: VIBRATION_PULSATION_DECISION_EVIDENCE_STORE_SCHEMA,
    records,
    nextSequence,
    authority: VIBRATION_PULSATION_DECISION_EVIDENCE_AUTHORITY,
  });
}

export function createVibrationPulsationDecisionEvidenceStore() {
  return nextStore([], 1);
}

export function createVibrationPulsationDecisionEvidenceUiState() {
  return { vibrationPulsationDecisionEvidence: createVibrationPulsationDecisionEvidenceStore() };
}

function newRecord(mechanismId, sequence) {
  mechanismMeta(mechanismId);
  return deepFreeze({
    schema: VIBRATION_PULSATION_DECISION_EVIDENCE_RECORD_SCHEMA,
    recordId: `VIB-PULS-${String(sequence).padStart(4, '0')}`,
    mechanismId,
    revision: 0,
    scope: { line: '', caseId: '', canonicalId: '' },
    applicabilityDisposition: 'UNRESOLVED',
    evidenceRefs: {},
    review: { reviewerName: '', reviewRecordRef: '', reviewedRevision: null },
    authority: VIBRATION_PULSATION_DECISION_EVIDENCE_AUTHORITY,
  });
}

export function addVibrationPulsationDecisionEvidenceRecord(store, mechanismId) {
  const record = newRecord(mechanismId, store.nextSequence);
  return nextStore([...store.records, record], store.nextSequence + 1);
}

function recordIndex(store, recordId) {
  const index = store.records.findIndex((record) => record.recordId === recordId);
  if (index < 0) throw new RangeError(`PULSATION_DECISION_EVIDENCE_RECORD_NOT_FOUND:${recordId}`);
  return index;
}

function replaceRecord(store, recordId, transform) {
  const index = recordIndex(store, recordId);
  const records = store.records.map((record, current) => current === index ? deepFreeze(transform(record)) : record);
  return nextStore(records, store.nextSequence);
}

function revise(record, patch) {
  return { ...record, revision: record.revision + 1, ...patch };
}

export function deleteVibrationPulsationDecisionEvidenceRecord(store, recordId) {
  const index = recordIndex(store, recordId);
  return nextStore(store.records.filter((_, current) => current !== index), store.nextSequence);
}

export function updateVibrationPulsationDecisionScope(store, recordId, fieldName, value) {
  if (!['line', 'caseId', 'canonicalId'].includes(fieldName)) throw new RangeError(`PULSATION_DECISION_SCOPE_FIELD_INVALID:${fieldName}`);
  return replaceRecord(store, recordId, (record) => revise(record, {
    scope: { ...record.scope, [fieldName]: text(value) },
  }));
}

export function updateVibrationPulsationDecisionApplicability(store, recordId, value) {
  const disposition = text(value).toUpperCase();
  if (!APPLICABILITY.includes(disposition)) throw new RangeError(`PULSATION_DECISION_APPLICABILITY_INVALID:${disposition}`);
  return replaceRecord(store, recordId, (record) => revise(record, { applicabilityDisposition: disposition }));
}

export function updateVibrationPulsationDecisionEvidenceRef(store, recordId, fieldName, value) {
  return replaceRecord(store, recordId, (record) => {
    const allowed = mechanismMeta(record.mechanismId).evidenceFields.some((fieldMeta) => fieldMeta.key === fieldName);
    if (!allowed) throw new RangeError(`PULSATION_DECISION_EVIDENCE_FIELD_INVALID:${fieldName}`);
    return revise(record, { evidenceRefs: { ...record.evidenceRefs, [fieldName]: text(value) } });
  });
}

export function recordVibrationPulsationDecisionReview(store, recordId, reviewerName, reviewRecordRef) {
  return replaceRecord(store, recordId, (record) => {
    const projection = buildVibrationPulsationDecisionEvidenceProjection(record);
    if (!projection.projectEvidenceComplete) throw new Error('PULSATION_DECISION_PROJECT_EVIDENCE_INCOMPLETE');
    const reviewer = text(reviewerName);
    const reviewRef = text(reviewRecordRef);
    if (!reviewer || !reviewRef) throw new Error('PULSATION_DECISION_REVIEWER_AND_RECORD_REQUIRED');
    return {
      ...record,
      review: { reviewerName: reviewer, reviewRecordRef: reviewRef, reviewedRevision: record.revision },
    };
  });
}

function requiredEvidenceFields(record, meta) {
  return meta.evidenceFields.filter((fieldMeta) => !fieldMeta.applicableOnly || record.applicabilityDisposition === 'APPLICABLE');
}

export function buildVibrationPulsationDecisionEvidenceProjection(record) {
  const meta = mechanismMeta(record.mechanismId);
  const source = resolveVibrationRoadmapSourceBinding({ mechanismId: record.mechanismId });
  const missingScope = ['line', 'canonicalId'].filter((key) => !text(record.scope[key]));
  if (!text(record.scope.caseId)) missingScope.push('caseId');
  const requiredFields = requiredEvidenceFields(record, meta);
  const fields = meta.evidenceFields.map((fieldMeta) => deepFreeze({
    ...fieldMeta,
    required: requiredFields.includes(fieldMeta),
    evidenceRef: text(record.evidenceRefs[fieldMeta.key]),
  }));
  const missingEvidence = fields.filter((fieldMeta) => fieldMeta.required && !fieldMeta.evidenceRef).map((fieldMeta) => fieldMeta.key);
  const applicabilityResolved = record.applicabilityDisposition !== 'UNRESOLVED';
  const projectEvidenceComplete = missingScope.length === 0 && applicabilityResolved && missingEvidence.length === 0;
  const reviewCurrent = record.review.reviewedRevision === record.revision
    && Boolean(text(record.review.reviewerName)) && Boolean(text(record.review.reviewRecordRef));
  let status = 'PROJECT_EVIDENCE_INCOMPLETE';
  if (projectEvidenceComplete) status = 'PROJECT_EVIDENCE_COMPLETE_SOURCE_RECONCILIATION_REQUIRED';
  if (projectEvidenceComplete && reviewCurrent) status = 'PROJECT_REVIEW_CURRENT_SOURCE_RECONCILIATION_REQUIRED';
  return deepFreeze({
    schema: 'VibrationPulsationDecisionEvidenceProjection.v1',
    recordId: record.recordId,
    mechanismId: record.mechanismId,
    label: meta.label,
    sourceMasterId: meta.sourceMasterId,
    sourceBinding: source,
    revision: record.revision,
    scope: { ...record.scope },
    applicabilityDisposition: record.applicabilityDisposition,
    fields,
    missingScope,
    missingEvidence,
    projectEvidenceComplete,
    review: { ...record.review, current: reviewCurrent },
    status,
    controlledRuleContentExecuted: false,
    numericalExecutionAllowed: false,
    authority: VIBRATION_PULSATION_DECISION_EVIDENCE_AUTHORITY,
  });
}

export function buildVibrationPulsationDecisionEvidenceWorkspace(store) {
  return deepFreeze({
    schema: 'VibrationPulsationDecisionEvidenceWorkspace.v1',
    records: store.records.map(buildVibrationPulsationDecisionEvidenceProjection),
    controlledRuleContentExecuted: false,
    numericalExecutionAllowed: false,
    authority: VIBRATION_PULSATION_DECISION_EVIDENCE_AUTHORITY,
  });
}
