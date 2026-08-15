import { calculateSbcType3MasterAssistedCandidate } from '../converters/vibration/sbc/type3-master-assisted.js';
import { SBC_TYPE3_BLOCKERS, SBC_TYPE3_RECORD_KEY } from '../converters/vibration/sbc/type3-user-data.js';
import {
  addVibrationUserEngineeringDataRow,
  deleteVibrationUserEngineeringDataRow,
  vibrationUserEngineeringDataResolverRows,
} from './vibration-integrity-user-data-model.js';

const CURVE_BLOCKERS = new Set([
  SBC_TYPE3_BLOCKERS.figureT31, SBC_TYPE3_BLOCKERS.figureT32,
  SBC_TYPE3_BLOCKERS.figureT33, SBC_TYPE3_BLOCKERS.figureT34,
]);

export function createSbcMasterAssistedUiState() {
  return {
    sbcType3Busy: false,
    sbcType3PhysicalByScope: {},
    sbcType3MainlineByScope: {},
    sbcFacilityCandidateResults: {},
    sbcMasterAssistedScopes: {},
  };
}

function requireScope(state) {
  const scopeId = String(state.sbcType3ScopeId ?? '').trim();
  if (!scopeId) throw new Error('Enter an SBC scope / assessment ID first.');
  return scopeId;
}

export function invalidateSbcMasterAssistedScope(state, scopeId) {
  if (!scopeId || !state.sbcFacilityCandidateResults?.[scopeId]) return;
  const next = { ...state.sbcFacilityCandidateResults };
  delete next[scopeId];
  state.sbcFacilityCandidateResults = next;
  if (state.sbcType3ScopeId === scopeId) state.sbcType3Result = null;
}

export function setSbcMasterAssistedMode(state, scopeId, enabled, invalidate = true) {
  const next = { ...state.sbcMasterAssistedScopes };
  if (enabled) next[scopeId] = true;
  else delete next[scopeId];
  state.sbcMasterAssistedScopes = next;
  if (invalidate) invalidateSbcMasterAssistedScope(state, scopeId);
}

export function openSbcMasterAssistedScope(state, scopeId) {
  state.sbcType3ScopeId = scopeId;
  setSbcMasterAssistedMode(state, scopeId, true, false);
  state.sbcType3Result = state.sbcFacilityCandidateResults?.[scopeId] ?? null;
}

function physicalForScope(state, scopeId) {
  const raw = state.sbcType3PhysicalByScope?.[scopeId] ?? {};
  const mass = String(raw.firstSpanHasUnsupportedMass ?? '').toUpperCase();
  return {
    ...raw,
    firstSpanHasUnsupportedMass: mass === 'TRUE' ? true : mass === 'FALSE' ? false : undefined,
  };
}

function removeCurveRows(table, scopeId) {
  let next = table;
  for (let index = next.rows.length - 1; index >= 0; index -= 1) {
    const row = next.rows[index];
    if (row.scopeId === scopeId && row.recordKey === SBC_TYPE3_RECORD_KEY
      && CURVE_BLOCKERS.has(row.blockerId)) {
      next = deleteVibrationUserEngineeringDataRow(next, index);
    }
  }
  return next;
}

async function curveSeedsAfterPhysicalValidation(state, scopeId) {
  const probe = await calculateSbcType3MasterAssistedCandidate({
    scopeId,
    physical: physicalForScope(state, scopeId),
    mainlineLof: state.sbcType3MainlineByScope?.[scopeId] ?? null,
    userRows: [],
  });
  if (probe.curveRequests?.length === 3) return probe.curveRequests;
  const reason = probe.problems?.[0]?.reason ?? 'SBC_T3_PHYSICAL_INPUT_NOT_READY';
  throw new Error(reason);
}

async function generateCurveRows(state, render) {
  let scopeId = null;
  try {
    scopeId = requireScope(state);
    setSbcMasterAssistedMode(state, scopeId, true);
    state.sbcType3Busy = true;
    state.error = null;
    render();
    const seeds = await curveSeedsAfterPhysicalValidation(state, scopeId);
    let table = removeCurveRows(state.userEngineeringData, scopeId);
    for (const seed of seeds) table = addVibrationUserEngineeringDataRow(table, seed);
    state.userEngineeringData = table;
    state.sbcType3Result = null;
  } catch (error) {
    state.error = String(error?.message || error);
  } finally {
    state.sbcType3Busy = false;
    render();
  }
}

async function evaluateMasterAssisted(state, render) {
  let scopeId = null;
  try {
    scopeId = requireScope(state);
    setSbcMasterAssistedMode(state, scopeId, true);
    state.sbcType3Busy = true;
    state.error = null;
    render();
    const result = await calculateSbcType3MasterAssistedCandidate({
      scopeId,
      physical: physicalForScope(state, scopeId),
      mainlineLof: state.sbcType3MainlineByScope?.[scopeId] ?? null,
      userRows: vibrationUserEngineeringDataResolverRows(state.userEngineeringData),
    });
    state.sbcType3Result = result;
    state.sbcFacilityCandidateResults = {
      ...state.sbcFacilityCandidateResults, [scopeId]: result,
    };
  } catch (error) {
    state.sbcType3Result = null;
    state.error = String(error?.message || error);
  } finally {
    state.sbcType3Busy = false;
    render();
  }
}

export function handleSbcMasterAssistedClick(state, event, render) {
  if (event.target.closest('[data-vi-sbc-master-template]')) {
    void generateCurveRows(state, render);
    return true;
  }
  if (event.target.closest('[data-vi-sbc-master-evaluate]')) {
    void evaluateMasterAssisted(state, render);
    return true;
  }
  return false;
}

function updatePhysicalField(state, event) {
  const field = event.target.dataset.viSbcMasterPhysical;
  if (!field) return false;
  const scopeId = requireScope(state);
  const current = state.sbcType3PhysicalByScope?.[scopeId] ?? {};
  state.sbcType3PhysicalByScope = {
    ...state.sbcType3PhysicalByScope,
    [scopeId]: { ...current, [field]: event.target.value },
  };
  setSbcMasterAssistedMode(state, scopeId, true);
  return true;
}

export function handleSbcMasterAssistedChange(state, event, render) {
  try {
    if (updatePhysicalField(state, event)) {
      state.error = null;
      render();
      return true;
    }
    if (!event.target.matches('[data-vi-sbc-master-mainline]')) return false;
    const scopeId = requireScope(state);
    state.sbcType3MainlineByScope = {
      ...state.sbcType3MainlineByScope, [scopeId]: event.target.value,
    };
    setSbcMasterAssistedMode(state, scopeId, true);
    state.error = null;
  } catch (error) {
    state.error = String(error?.message || error);
  }
  render();
  return true;
}
