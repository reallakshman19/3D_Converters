import { calculateDeadlegStandard } from '../converters/vibration/deadleg/method.js';
import { calculateDryGasRapidOpening } from '../converters/vibration/transients/dry-gas-opening.js';

export const VIBRATION_DYNAMIC_WORK_ITEM_STORE_SCHEMA = 'VibrationDynamicWorkItemStore.v1';
export const VIBRATION_DYNAMIC_WORK_ITEM_SCHEMA = 'VibrationDynamicWorkItem.v1';

export const VIBRATION_DYNAMIC_WORK_ITEM_MODES = Object.freeze({
  DEADLEG_STANDARD: 'DEADLEG_STANDARD',
  T28_DRY_GAS_RAPID_OPENING: 'T28_DRY_GAS_RAPID_OPENING',
});

export const VIBRATION_DYNAMIC_WORK_ITEM_AUTHORITY = Object.freeze({
  calculationState: 'BENCHMARK_ONLY',
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  governingEligible: false,
  eiMainLineContributionAllowed: false,
});

const DEADLEG_FIELDS = Object.freeze([
  field('rhoV2Pa', 'Main-line kinetic energy ρv²', 'Pa'),
  field('densityKgM3', 'Fluid density', 'kg/m³'),
  field('velocityMS', 'Main-line velocity', 'm/s'),
  field('mainInsideDiameterMm', 'Main-line inside diameter', 'mm'),
  field('branchInsideDiameterMm', 'Deadleg inside diameter', 'mm'),
  field('branchLengthM', 'Deadleg branch length', 'm'),
  field('dynamicViscosityPaS', 'Dynamic viscosity', 'Pa·s'),
  field('speedOfSoundMS', 'Speed of sound', 'm/s'),
]);

const T28_FIELDS = Object.freeze([
  field('massFlowKgS', 'Mass flow', 'kg/s'),
  field('gamma', 'Heat-capacity ratio γ', '1'),
  field('gasConstantJPerKmolK', 'Universal gas constant used', 'J/(kmol·K)'),
  field('upstreamTemperatureK', 'Upstream temperature', 'K'),
  field('molecularWeightKgPerKmol', 'Molecular weight', 'kg/kmol'),
  field('outsideDiameterMm', 'Pipe outside diameter', 'mm'),
  field('insideDiameterMm', 'Pipe inside diameter', 'mm'),
  field('wallThicknessMm', 'Actual wall thickness', 'mm'),
  field('schedule40ThicknessMm', 'Schedule-40 reference wall', 'mm'),
  enumField('supportStiffness', 'Support stiffness', ['STIFF', 'MEDIUM_STIFF', 'MEDIUM', 'FLEXIBLE']),
]);

const MODE_META = Object.freeze({
  [VIBRATION_DYNAMIC_WORK_ITEM_MODES.DEADLEG_STANDARD]: Object.freeze({
    label: 'Deadleg T2.6 · standard benchmark-only',
    assessmentUnitType: 'DEADLEG_BRANCH',
    methodId: 'EI.AVIFF.T2.6.DEADLEG_STANDARD.v1',
    fields: DEADLEG_FIELDS,
  }),
  [VIBRATION_DYNAMIC_WORK_ITEM_MODES.T28_DRY_GAS_RAPID_OPENING]: Object.freeze({
    label: 'Valve transient T2.8 · dry-gas rapid opening',
    assessmentUnitType: 'TRANSIENT_EVENT_PATH',
    methodId: 'EI.AVIFF.T2.8.DRY_GAS_RAPID_OPENING.v1',
    fields: T28_FIELDS,
  }),
});

function field(key, label, unit) {
  return Object.freeze({ key, label, unit, kind: 'POSITIVE_NUMBER' });
}

function enumField(key, label, options) {
  return Object.freeze({ key, label, unit: null, kind: 'ENUM', options: Object.freeze(options) });
}

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function modeMeta(mode) {
  const meta = MODE_META[text(mode)];
  if (!meta) throw new RangeError(`UNSUPPORTED_VIBRATION_DYNAMIC_WORK_ITEM_MODE:${text(mode) || 'EMPTY'}`);
  return meta;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function nextStore(items, nextSequence) {
  return deepFreeze({
    schema: VIBRATION_DYNAMIC_WORK_ITEM_STORE_SCHEMA,
    items,
    nextSequence,
    authority: VIBRATION_DYNAMIC_WORK_ITEM_AUTHORITY,
  });
}

export function createVibrationDynamicWorkItemStore() {
  return nextStore([], 1);
}

export function createVibrationDynamicWorkItemUiState() {
  return { vibrationDynamicWorkItems: createVibrationDynamicWorkItemStore() };
}

function newItem(mode, sequence) {
  const meta = modeMeta(mode);
  return deepFreeze({
    schema: VIBRATION_DYNAMIC_WORK_ITEM_SCHEMA,
    workItemId: `VIB-DYN-${String(sequence).padStart(4, '0')}`,
    mode,
    scopeId: '',
    assessmentUnitType: meta.assessmentUnitType,
    revision: 0,
    values: {},
    evidenceRefs: {},
    result: null,
    authority: VIBRATION_DYNAMIC_WORK_ITEM_AUTHORITY,
  });
}

export function addVibrationDynamicWorkItem(store, mode) {
  const item = newItem(mode, store.nextSequence);
  return nextStore([...store.items, item], store.nextSequence + 1);
}

function itemIndex(store, workItemId) {
  const index = store.items.findIndex((item) => item.workItemId === workItemId);
  if (index < 0) throw new RangeError(`VIBRATION_DYNAMIC_WORK_ITEM_NOT_FOUND:${workItemId}`);
  return index;
}

function replaceItem(store, workItemId, transform) {
  const index = itemIndex(store, workItemId);
  const items = store.items.map((item, current) => current === index ? deepFreeze(transform(item)) : item);
  return nextStore(items, store.nextSequence);
}

export function deleteVibrationDynamicWorkItem(store, workItemId) {
  const index = itemIndex(store, workItemId);
  return nextStore(store.items.filter((_, current) => current !== index), store.nextSequence);
}

export function updateVibrationDynamicWorkItemScope(store, workItemId, value) {
  return replaceItem(store, workItemId, (item) => ({ ...item, scopeId: text(value), revision: item.revision + 1 }));
}

function fieldMetaFor(item, key) {
  const meta = modeMeta(item.mode).fields.find((entry) => entry.key === key);
  if (!meta) throw new RangeError(`VIBRATION_DYNAMIC_WORK_ITEM_FIELD_INVALID:${key}`);
  return meta;
}

export function updateVibrationDynamicWorkItemValue(store, workItemId, key, value) {
  return replaceItem(store, workItemId, (item) => {
    fieldMetaFor(item, key);
    return { ...item, revision: item.revision + 1, values: { ...item.values, [key]: text(value) } };
  });
}

export function updateVibrationDynamicWorkItemEvidence(store, workItemId, key, value) {
  return replaceItem(store, workItemId, (item) => {
    fieldMetaFor(item, key);
    return { ...item, revision: item.revision + 1, evidenceRefs: { ...item.evidenceRefs, [key]: text(value) } };
  });
}

function parseField(meta, rawValue) {
  const raw = text(rawValue);
  if (!raw) return { present: false, valid: false, value: undefined, error: null };
  if (meta.kind === 'ENUM') {
    const valid = meta.options.includes(raw);
    return { present: true, valid, value: valid ? raw : undefined, error: valid ? null : 'ENUM_VALUE_REQUIRED' };
  }
  const value = Number(raw);
  const valid = Number.isFinite(value) && value > 0;
  return { present: true, valid, value: valid ? value : undefined, error: valid ? null : 'POSITIVE_NUMBER_REQUIRED' };
}

function inputProjection(item) {
  const meta = modeMeta(item.mode);
  const fields = meta.fields.map((fieldMeta) => {
    const parsed = parseField(fieldMeta, item.values[fieldMeta.key]);
    const evidenceRef = text(item.evidenceRefs[fieldMeta.key]);
    let state = 'EMPTY';
    if (parsed.present && !parsed.valid) state = 'INVALID';
    if (parsed.valid && !evidenceRef) state = 'VALUE_READY_EVIDENCE_MISSING';
    if (parsed.valid && evidenceRef) state = 'READY';
    return deepFreeze({ ...fieldMeta, rawValue: text(item.values[fieldMeta.key]), evidenceRef, parsed, state });
  });
  return deepFreeze(fields);
}

function evaluationInput(fields) {
  return Object.fromEntries(fields.filter((entry) => entry.parsed.valid).map((entry) => [entry.key, entry.parsed.value]));
}

function execute(item, input) {
  if (item.mode === VIBRATION_DYNAMIC_WORK_ITEM_MODES.DEADLEG_STANDARD) return calculateDeadlegStandard(input);
  if (item.mode === VIBRATION_DYNAMIC_WORK_ITEM_MODES.T28_DRY_GAS_RAPID_OPENING) return calculateDryGasRapidOpening(input);
  throw new RangeError(`UNSUPPORTED_VIBRATION_DYNAMIC_WORK_ITEM_MODE:${item.mode}`);
}

export function evaluateVibrationDynamicWorkItem(store, workItemId) {
  const index = itemIndex(store, workItemId);
  const item = store.items[index];
  const projection = buildVibrationDynamicWorkItemProjection(item);
  if (!projection.readyToEvaluate) throw new Error(`VIBRATION_DYNAMIC_WORK_ITEM_NOT_READY:${projection.reasons.join('|')}`);
  const payload = execute(item, projection.input);
  return replaceItem(store, workItemId, (current) => ({
    ...current,
    result: {
      resultRevision: current.revision,
      status: 'CURRENT_RESULT',
      calculatedAt: new Date().toISOString(),
      payload,
      authority: VIBRATION_DYNAMIC_WORK_ITEM_AUTHORITY,
    },
  }));
}

export function buildVibrationDynamicWorkItemProjection(item) {
  const meta = modeMeta(item.mode);
  const fields = inputProjection(item);
  const missing = fields.filter((entry) => !entry.parsed.present).map((entry) => entry.key);
  const invalid = fields.filter((entry) => entry.parsed.present && !entry.parsed.valid).map((entry) => entry.key);
  const missingEvidence = fields.filter((entry) => entry.parsed.valid && !entry.evidenceRef).map((entry) => entry.key);
  const reasons = [];
  if (!text(item.scopeId)) reasons.push('EXACT_WORK_ITEM_SCOPE_REQUIRED');
  if (missing.length) reasons.push('REQUIRED_INPUTS_MISSING');
  if (invalid.length) reasons.push('INVALID_INPUTS');
  if (missingEvidence.length) reasons.push('PROJECT_EVIDENCE_REFERENCES_MISSING');
  const readyToEvaluate = reasons.length === 0;
  let resultState = 'UNRUN';
  if (item.result) resultState = item.result.resultRevision === item.revision ? 'CURRENT_RESULT' : 'STALE_RESULT';
  return deepFreeze({
    schema: 'VibrationDynamicWorkItemProjection.v1',
    workItemId: item.workItemId,
    mode: item.mode,
    label: meta.label,
    methodId: meta.methodId,
    scopeId: item.scopeId,
    assessmentUnitType: meta.assessmentUnitType,
    revision: item.revision,
    fields,
    input: evaluationInput(fields),
    missing,
    invalid,
    missingEvidence,
    reasons,
    readyToEvaluate,
    resultState,
    result: item.result,
    authority: VIBRATION_DYNAMIC_WORK_ITEM_AUTHORITY,
  });
}

export function buildVibrationDynamicWorkbenchProjection(store) {
  return deepFreeze({
    schema: 'VibrationDynamicWorkbenchProjection.v1',
    items: store.items.map(buildVibrationDynamicWorkItemProjection),
    authority: VIBRATION_DYNAMIC_WORK_ITEM_AUTHORITY,
    excluded: ['T2.8_LIQUID_MULTIPHASE_PR471', 'T2.6_ADVANCED_BLOCKED_SOURCE'],
  });
}
