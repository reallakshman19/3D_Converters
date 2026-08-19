import {
  addVibrationPulsationDecisionEvidenceRecord,
  buildVibrationPulsationDecisionEvidenceWorkspace,
  createVibrationPulsationDecisionEvidenceUiState,
  deleteVibrationPulsationDecisionEvidenceRecord,
  recordVibrationPulsationDecisionReview,
  updateVibrationPulsationDecisionApplicability,
  updateVibrationPulsationDecisionEvidenceRef,
  updateVibrationPulsationDecisionScope,
} from './vibration-integrity-pulsation-decision-evidence-model.js?v=20260819-vib-t24-t25-evidence-1';
import {
  addVibrationDynamicWorkItem,
  createVibrationDynamicWorkItemUiState,
  deleteVibrationDynamicWorkItem,
  evaluateVibrationDynamicWorkItem,
  updateVibrationDynamicWorkItemEvidence,
  updateVibrationDynamicWorkItemScope,
  updateVibrationDynamicWorkItemValue,
} from './vibration-integrity-pulsation-transient-model.js?v=20260819-vib-pulsation-transient-workbench-1';

export { createVibrationDynamicWorkItemUiState, createVibrationPulsationDecisionEvidenceUiState };

function updateDynamic(state, nextStore, render, audit, action, details = {}, scopeId = null) {
  state.vibrationDynamicWorkItems = nextStore;
  state.error = null;
  audit?.('VIBRATION_DYNAMIC_WORK_ITEM_CHANGED', { action, ...details }, scopeId);
  render();
}

function updateDecisionEvidence(state, nextStore, render, audit, action, details = {}, scopeId = null) {
  state.vibrationPulsationDecisionEvidence = nextStore;
  state.error = null;
  audit?.('VIBRATION_PULSATION_DECISION_EVIDENCE_CHANGED', { action, ...details }, scopeId);
  render();
}

function evidenceScope(record) {
  if (!record) return null;
  return [record.scope?.line, record.scope?.caseId, record.scope?.canonicalId].filter(Boolean).join(' / ') || null;
}

function handleDecisionEvidenceClick(state, event, render, audit) {
  const addMechanism = event.target.closest('[data-vi-puls-decision-add]')?.dataset.viPulsDecisionAdd;
  if (addMechanism) {
    try {
      const next = addVibrationPulsationDecisionEvidenceRecord(state.vibrationPulsationDecisionEvidence, addMechanism);
      updateDecisionEvidence(state, next, render, audit, 'EVIDENCE_RECORD_ADDED', { mechanismId: addMechanism });
    } catch (error) {
      state.error = String(error?.message || error); render();
    }
    return true;
  }
  const deleteId = event.target.closest('[data-vi-puls-decision-delete]')?.dataset.viPulsDecisionDelete;
  if (deleteId) {
    try {
      const record = state.vibrationPulsationDecisionEvidence.records.find((entry) => entry.recordId === deleteId);
      const next = deleteVibrationPulsationDecisionEvidenceRecord(state.vibrationPulsationDecisionEvidence, deleteId);
      updateDecisionEvidence(state, next, render, audit, 'EVIDENCE_RECORD_DELETED', { recordId: deleteId }, evidenceScope(record));
    } catch (error) {
      state.error = String(error?.message || error); render();
    }
    return true;
  }
  const reviewId = event.target.closest('[data-vi-puls-decision-review]')?.dataset.viPulsDecisionReview;
  if (!reviewId) return false;
  try {
    const projection = buildVibrationPulsationDecisionEvidenceWorkspace(state.vibrationPulsationDecisionEvidence)
      .records.find((entry) => entry.recordId === reviewId);
    if (!projection?.projectEvidenceComplete) throw new Error('PULSATION_DECISION_PROJECT_EVIDENCE_INCOMPLETE');
    const card = event.target.closest('[data-vi-puls-decision-card]');
    const reviewer = card?.querySelector('[data-vi-puls-reviewer]')?.value ?? '';
    const reviewRecordRef = card?.querySelector('[data-vi-puls-review-record]')?.value ?? '';
    const next = recordVibrationPulsationDecisionReview(
      state.vibrationPulsationDecisionEvidence,
      reviewId,
      reviewer,
      reviewRecordRef,
    );
    const record = next.records.find((entry) => entry.recordId === reviewId);
    updateDecisionEvidence(state, next, render, audit, 'PROJECT_REVIEW_RECORDED', {
      recordId: reviewId,
      reviewer,
      reviewRecordRef,
      authorityPromotion: false,
    }, evidenceScope(record));
  } catch (error) {
    state.error = String(error?.message || error); render();
  }
  return true;
}

export function handleVibrationDynamicWorkItemClick(state, event, render, audit) {
  if (handleDecisionEvidenceClick(state, event, render, audit)) return true;
  const addMode = event.target.closest('[data-vi-dynamic-add]')?.dataset.viDynamicAdd;
  if (addMode) {
    try {
      updateDynamic(state, addVibrationDynamicWorkItem(state.vibrationDynamicWorkItems, addMode), render, audit, 'WORK_ITEM_ADDED', { mode: addMode });
    } catch (error) {
      state.error = String(error?.message || error); render();
    }
    return true;
  }
  const deleteId = event.target.closest('[data-vi-dynamic-delete]')?.dataset.viDynamicDelete;
  if (deleteId) {
    try {
      updateDynamic(state, deleteVibrationDynamicWorkItem(state.vibrationDynamicWorkItems, deleteId), render, audit, 'WORK_ITEM_DELETED', { workItemId: deleteId });
    } catch (error) {
      state.error = String(error?.message || error); render();
    }
    return true;
  }
  const evaluateId = event.target.closest('[data-vi-dynamic-evaluate]')?.dataset.viDynamicEvaluate;
  if (!evaluateId) return false;
  try {
    const next = evaluateVibrationDynamicWorkItem(state.vibrationDynamicWorkItems, evaluateId);
    const item = next.items.find((entry) => entry.workItemId === evaluateId);
    updateDynamic(state, next, render, audit, 'WORK_ITEM_EVALUATED', {
      workItemId: evaluateId,
      mode: item?.mode ?? null,
      lof: item?.result?.payload?.lof ?? null,
      calculationState: 'BENCHMARK_ONLY',
    }, item?.scopeId ?? null);
  } catch (error) {
    state.error = String(error?.message || error); render();
  }
  return true;
}

function handleDecisionEvidenceChange(state, event, render, audit) {
  const recordId = event.target.dataset.viPulsDecisionRecord;
  if (!recordId) return false;
  try {
    let next = null;
    let action = null;
    let field = null;
    if (event.target.dataset.viPulsDecisionScope) {
      field = event.target.dataset.viPulsDecisionScope;
      next = updateVibrationPulsationDecisionScope(state.vibrationPulsationDecisionEvidence, recordId, field, event.target.value);
      action = 'SCOPE_CHANGED';
    } else if (event.target.matches('[data-vi-puls-decision-applicability]')) {
      next = updateVibrationPulsationDecisionApplicability(state.vibrationPulsationDecisionEvidence, recordId, event.target.value);
      action = 'APPLICABILITY_DISPOSITION_CHANGED';
    } else if (event.target.dataset.viPulsDecisionEvidence) {
      field = event.target.dataset.viPulsDecisionEvidence;
      next = updateVibrationPulsationDecisionEvidenceRef(state.vibrationPulsationDecisionEvidence, recordId, field, event.target.value);
      action = 'PROJECT_EVIDENCE_CHANGED';
    } else return false;
    const record = next.records.find((entry) => entry.recordId === recordId);
    updateDecisionEvidence(state, next, render, audit, action, {
      recordId,
      field,
      reviewCurrentness: record?.review?.reviewedRevision === record?.revision ? 'CURRENT_PROJECT_REVIEW' : 'STALE_OR_UNREVIEWED',
      authorityPromotion: false,
    }, evidenceScope(record));
  } catch (error) {
    state.error = String(error?.message || error); render();
  }
  return true;
}

export function handleVibrationDynamicWorkItemChange(state, event, render, audit) {
  if (handleDecisionEvidenceChange(state, event, render, audit)) return true;
  const workItemId = event.target.dataset.viDynamicItem;
  if (!workItemId) return false;
  try {
    let next = null;
    let action = null;
    let field = null;
    if (event.target.matches('[data-vi-dynamic-scope]')) {
      next = updateVibrationDynamicWorkItemScope(state.vibrationDynamicWorkItems, workItemId, event.target.value);
      action = 'SCOPE_CHANGED';
    } else if (event.target.dataset.viDynamicValue) {
      field = event.target.dataset.viDynamicValue;
      next = updateVibrationDynamicWorkItemValue(state.vibrationDynamicWorkItems, workItemId, field, event.target.value);
      action = 'VALUE_CHANGED';
    } else if (event.target.dataset.viDynamicEvidence) {
      field = event.target.dataset.viDynamicEvidence;
      next = updateVibrationDynamicWorkItemEvidence(state.vibrationDynamicWorkItems, workItemId, field, event.target.value);
      action = 'EVIDENCE_CHANGED';
    } else return false;
    const item = next.items.find((entry) => entry.workItemId === workItemId);
    updateDynamic(state, next, render, audit, action, { workItemId, field, resultCurrentness: item?.result ? 'STALE_RESULT' : 'UNRUN' }, item?.scopeId ?? null);
  } catch (error) {
    state.error = String(error?.message || error); render();
  }
  return true;
}
