import {
  addVibrationDynamicWorkItem,
  createVibrationDynamicWorkItemUiState,
  deleteVibrationDynamicWorkItem,
  evaluateVibrationDynamicWorkItem,
  updateVibrationDynamicWorkItemEvidence,
  updateVibrationDynamicWorkItemScope,
  updateVibrationDynamicWorkItemValue,
} from './vibration-integrity-pulsation-transient-model.js?v=20260819-vib-pulsation-transient-workbench-1';

export { createVibrationDynamicWorkItemUiState };

function update(state, nextStore, render, audit, action, details = {}, scopeId = null) {
  state.vibrationDynamicWorkItems = nextStore;
  state.error = null;
  audit?.('VIBRATION_DYNAMIC_WORK_ITEM_CHANGED', { action, ...details }, scopeId);
  render();
}

export function handleVibrationDynamicWorkItemClick(state, event, render, audit) {
  const addMode = event.target.closest('[data-vi-dynamic-add]')?.dataset.viDynamicAdd;
  if (addMode) {
    try {
      update(state, addVibrationDynamicWorkItem(state.vibrationDynamicWorkItems, addMode), render, audit, 'WORK_ITEM_ADDED', { mode: addMode });
    } catch (error) {
      state.error = String(error?.message || error); render();
    }
    return true;
  }
  const deleteId = event.target.closest('[data-vi-dynamic-delete]')?.dataset.viDynamicDelete;
  if (deleteId) {
    try {
      update(state, deleteVibrationDynamicWorkItem(state.vibrationDynamicWorkItems, deleteId), render, audit, 'WORK_ITEM_DELETED', { workItemId: deleteId });
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
    update(state, next, render, audit, 'WORK_ITEM_EVALUATED', {
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

export function handleVibrationDynamicWorkItemChange(state, event, render, audit) {
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
    update(state, next, render, audit, action, { workItemId, field, resultCurrentness: item?.result ? 'STALE_RESULT' : 'UNRUN' }, item?.scopeId ?? null);
  } catch (error) {
    state.error = String(error?.message || error); render();
  }
  return true;
}
