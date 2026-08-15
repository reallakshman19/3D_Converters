import {
  evaluateMechanicalFacilityCandidate,
  mechanicalFacilityScopeId,
} from '../converters/vibration/mechanical/facility.js';

export function createMechanicalFacilityUiState() {
  return {
    mechanicalFacilityScopeId: '',
    mechanicalSourceKeysByScope: {},
    mechanicalCandidateResultsByScope: {},
    mechanicalPendingByScope: {},
    mechanicalEvaluationSequence: 0,
  };
}

function sourceKeys(state, scopeId) {
  return state.mechanicalSourceKeysByScope?.[scopeId] ?? [];
}

function candidateRow(state, scopeId) {
  const rows = state.workspace?.rows ?? [];
  return rows.find((row) => mechanicalFacilityScopeId(row) === scopeId) ?? null;
}

function setSourceKeys(state, scopeId, keys) {
  state.mechanicalSourceKeysByScope = {
    ...state.mechanicalSourceKeysByScope,
    [scopeId]: Object.freeze([...keys]),
  };
  const results = { ...state.mechanicalCandidateResultsByScope };
  delete results[scopeId];
  state.mechanicalCandidateResultsByScope = results;
}

export function openMechanicalFacilityInputs(state, scopeId, render) {
  state.workspaceTab = 'mechanical';
  state.mechanicalFacilityScopeId = String(scopeId ?? '').trim();
  state.error = null;
  render();
}

function clearMechanicalFacilityInputs(state, render) {
  const scopeId = state.mechanicalFacilityScopeId;
  if (!scopeId) return;
  setSourceKeys(state, scopeId, []);
  state.error = null;
  render();
}

function commitEvaluation(state, scopeId, token, result, render) {
  if (state.mechanicalPendingByScope?.[scopeId] !== token) return;
  state.mechanicalCandidateResultsByScope = {
    ...state.mechanicalCandidateResultsByScope,
    [scopeId]: result,
  };
  const pending = { ...state.mechanicalPendingByScope };
  delete pending[scopeId];
  state.mechanicalPendingByScope = pending;
  state.error = null;
  render();
}

function failEvaluation(state, scopeId, token, error, render) {
  if (state.mechanicalPendingByScope?.[scopeId] !== token) return;
  const pending = { ...state.mechanicalPendingByScope };
  delete pending[scopeId];
  state.mechanicalPendingByScope = pending;
  state.error = String(error?.message || error);
  render();
}

function evaluateMechanicalInputs(state, render) {
  const scopeId = state.mechanicalFacilityScopeId;
  const row = candidateRow(state, scopeId);
  const keys = [...sourceKeys(state, scopeId)];
  if (!row) {
    state.error = 'Mechanical facility scope is not available in the current facility register.';
    render();
    return;
  }
  const token = state.mechanicalEvaluationSequence + 1;
  state.mechanicalEvaluationSequence = token;
  state.mechanicalPendingByScope = { ...state.mechanicalPendingByScope, [scopeId]: token };
  state.error = null;
  render();
  evaluateMechanicalFacilityCandidate(row, keys)
    .then((result) => commitEvaluation(state, scopeId, token, result, render))
    .catch((error) => failEvaluation(state, scopeId, token, error, render));
}

export function handleMechanicalFacilityClick(state, event, render) {
  const scopeId = event.target.closest('[data-vi-mechanical-facility-scope]')
    ?.dataset.viMechanicalFacilityScope;
  if (scopeId) {
    openMechanicalFacilityInputs(state, scopeId, render);
    return true;
  }
  if (event.target.closest('[data-vi-mechanical-evaluate]')) {
    evaluateMechanicalInputs(state, render);
    return true;
  }
  if (event.target.closest('[data-vi-mechanical-clear]')) {
    clearMechanicalFacilityInputs(state, render);
    return true;
  }
  return false;
}

export function handleMechanicalFacilityChange(state, event, render) {
  const sourceKey = event.target.dataset.viMechanicalSource;
  if (!sourceKey) return false;
  const scopeId = state.mechanicalFacilityScopeId;
  if (!scopeId) return true;
  const selected = new Set(sourceKeys(state, scopeId));
  if (event.target.checked) selected.add(sourceKey);
  else selected.delete(sourceKey);
  setSourceKeys(state, scopeId, [...selected]);
  state.error = null;
  render();
  return true;
}
