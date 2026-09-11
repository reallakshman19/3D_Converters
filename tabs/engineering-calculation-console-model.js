import { normalizeEngineeringCalculationCheck } from '../converters/engineering-calculations/contracts.js';

const NON_EXECUTABLE_STATES = new Set(['CONCEPT', 'SOURCE_INVENTORIED', 'METHOD_SPECIFIED', 'BLOCKED']);
export const ENGINEERING_CONSOLE_VIEW_IDS = Object.freeze(['results', 'checks', 'basis', 'evidence', 'batch']);

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function stateOf(definition) {
  return definition?.authority?.qualificationState
    ?? definition?.authority?.calculationState
    ?? 'CONCEPT';
}

function editorValue(field, value) {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'object' || field.type === 'array' || field.type === 'table') return JSON.stringify(value, null, 2);
  if (field.type === 'vector3') return Array.isArray(value) ? value.join(', ') : String(value);
  return value;
}

export function isEngineeringCalculationExecutable(definition) {
  return Boolean(definition?.id) && !NON_EXECUTABLE_STATES.has(stateOf(definition));
}

export function canResolveEngineeringCalculation(definition) {
  return isEngineeringCalculationExecutable(definition);
}

export function canExecuteEngineeringCalculation(definition, qualificationMode = 'strict') {
  if (!isEngineeringCalculationExecutable(definition)) return false;
  const required = definition?.ui?.requiredQualificationMode;
  return !required || required === qualificationMode;
}

export function selectInitialEngineeringDefinition(definitions = [], requestedDefinition = null) {
  if (requestedDefinition) return requestedDefinition;
  return definitions.find((row) => row.id === 'PIPE.B313.THICKNESS')
    ?? definitions.find(isEngineeringCalculationExecutable)
    ?? definitions[0]
    ?? null;
}

export function toggleEngineeringConsoleFamily(state, familyId) {
  state.selectedFamily = state.selectedFamily === familyId ? null : familyId;
  return state;
}

export function engineeringConsoleViewForKey(currentView, key) {
  const currentIndex = ENGINEERING_CONSOLE_VIEW_IDS.indexOf(currentView);
  if (currentIndex < 0) return null;
  if (key === 'Home') return ENGINEERING_CONSOLE_VIEW_IDS[0];
  if (key === 'End') return ENGINEERING_CONSOLE_VIEW_IDS[ENGINEERING_CONSOLE_VIEW_IDS.length - 1];
  if (key === 'ArrowRight') return ENGINEERING_CONSOLE_VIEW_IDS[(currentIndex + 1) % ENGINEERING_CONSOLE_VIEW_IDS.length];
  if (key === 'ArrowLeft') return ENGINEERING_CONSOLE_VIEW_IDS[(currentIndex - 1 + ENGINEERING_CONSOLE_VIEW_IDS.length) % ENGINEERING_CONSOLE_VIEW_IDS.length];
  return null;
}

export function createEngineeringConsoleDraft(definition, seed = {}) {
  const values = {};
  const units = {};
  for (const field of definition?.inputs ?? []) {
    const seeded = own(seed, field.key);
    const defaulted = field.engineeringDefault !== undefined && field.engineeringDefault !== null;
    values[field.key] = editorValue(field, seeded ? seed[field.key] : defaulted ? field.engineeringDefault : '');
    if (field.quantity && field.quantity !== 'dimensionless') units[field.key] = field.canonicalUnit ?? '';
  }
  return { values, units };
}

function objectDraftValue(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readEngineeringConsoleObjectDraft(draft, fieldKey) {
  return objectDraftValue(draft?.values?.[fieldKey]);
}

export function updateEngineeringConsoleObjectDraft(draft, fieldKey, property, rawValue, { number = false } = {}) {
  const value = objectDraftValue(draft?.values?.[fieldKey]);
  if (rawValue === '' || rawValue === undefined || rawValue === null) {
    delete value[property];
  } else if (number) {
    const parsed = Number(rawValue);
    value[property] = Number.isFinite(parsed) ? parsed : rawValue;
  } else {
    value[property] = rawValue;
  }
  if (property === 'basis' && rawValue !== 'absolute') delete value.unit;
  draft.values[fieldKey] = Object.keys(value).length ? JSON.stringify(value, null, 2) : '';
  return value;
}

function parseBoolean(raw) {
  if (typeof raw === 'boolean') return raw;
  if (String(raw).toLowerCase() === 'true') return true;
  if (String(raw).toLowerCase() === 'false') return false;
  throw new TypeError('must be true or false');
}

function parseJsonAggregate(raw, fieldType) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (fieldType === 'object' && (value === null || typeof value !== 'object' || Array.isArray(value))) {
    throw new TypeError('must be a JSON object');
  }
  if ((fieldType === 'array' || fieldType === 'table') && !Array.isArray(value)) {
    throw new TypeError('must be a JSON array');
  }
  return value;
}

function parseVector3(raw) {
  const value = Array.isArray(raw)
    ? raw
    : String(raw).trim().startsWith('[')
      ? JSON.parse(String(raw))
      : String(raw).split(',').map((item) => item.trim());
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError('must contain three components');
  const numbers = value.map(Number);
  if (numbers.some((item) => !Number.isFinite(item))) throw new TypeError('must contain finite numbers');
  return numbers;
}

export function parseEngineeringConsoleField(field, raw) {
  const blank = raw === '' || raw === undefined || raw === null;
  if (blank && !field.required) return { included: false, value: undefined };
  if (blank) throw new TypeError(`${field.label ?? field.key} is required`);
  if (field.type === 'number' || !field.type) {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new TypeError('must be a finite number');
    return { included: true, value };
  }
  if (field.type === 'integer') {
    const value = Number(raw);
    if (!Number.isInteger(value)) throw new TypeError('must be an integer');
    return { included: true, value };
  }
  if (field.type === 'boolean') return { included: true, value: parseBoolean(raw) };
  if (field.type === 'enum') {
    if (!(field.values ?? []).includes(raw)) throw new TypeError(`must be one of ${(field.values ?? []).join(', ')}`);
    return { included: true, value: raw };
  }
  if (field.type === 'object' || field.type === 'array' || field.type === 'table') {
    return { included: true, value: parseJsonAggregate(raw, field.type) };
  }
  if (field.type === 'vector3') return { included: true, value: parseVector3(raw) };
  return { included: true, value: String(raw) };
}

export function buildEngineeringConsoleRequest(definition, draft, options = {}) {
  const errors = [];
  const inputs = {};
  const inputUnits = {};
  for (const field of definition?.inputs ?? []) {
    try {
      const parsed = parseEngineeringConsoleField(field, draft?.values?.[field.key]);
      if (!parsed.included) continue;
      inputs[field.key] = parsed.value;
      if (field.quantity && field.quantity !== 'dimensionless') {
        const unit = String(draft?.units?.[field.key] ?? '').trim();
        if (unit) inputUnits[field.key] = unit;
      }
    } catch (error) {
      errors.push({ field: field.key, message: error.message });
    }
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    request: {
      calculationId: definition.id,
      inputs,
      inputUnits,
      context: options.context ?? {},
      options: {
        qualificationMode: options.qualificationMode ?? 'strict',
        includeEvidence: options.includeEvidence !== false,
        ...(options.executionMode === 'sandbox' ? { executionMode: 'sandbox' } : {}),
        ...(options.extraOptions ?? {}),
      },
    },
  };
}

export function parseEngineeringBatchEditor(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text ?? '').trim() || '[]');
  } catch (error) {
    return { ok: false, error: `Invalid batch JSON: ${error.message}` };
  }
  const requests = Array.isArray(parsed) ? parsed : parsed?.requests;
  if (!Array.isArray(requests)) {
    return { ok: false, error: 'Batch JSON must be an array or an object with requests[].' };
  }
  return { ok: true, batchRequest: { requests, ...(parsed?.options ? { options: parsed.options } : {}) } };
}

export function invalidateEngineeringConsoleExecution(state) {
  state.validation = null;
  state.resolution = null;
  state.result = null;
  return state;
}

export function normalizeEngineeringCheck(check = {}, result = null) {
  const normalized = normalizeEngineeringCalculationCheck(check);
  return {
    ...normalized,
    authority: check.authority ?? result?.qualification?.effective ?? normalized.authority,
  };
}

function assessmentStatus(result, checks) {
  if (!result) return 'NOT RUN';
  if (!result.ok) return 'NOT AVAILABLE';
  if (result.assessment?.status) return result.assessment.status;
  if (checks.some((check) => check.status === 'FAIL')) return 'FAIL';
  if (checks.some((check) => check.status === 'INDETERMINATE')) return 'INDETERMINATE';
  const evaluated = checks.filter((check) => !['NOT_APPLICABLE', 'NOT_EVALUATED'].includes(check.status));
  if (evaluated.length && evaluated.every((check) => check.status === 'PASS')) return 'PASS';
  return result.assessment?.disposition ?? 'NOT ASSESSED';
}

export function buildEngineeringResultViewModel(definition, result) {
  const checks = (result?.checks ?? []).map((check) => normalizeEngineeringCheck(check, result));
  const outputMetadata = new Map((definition?.outputs ?? []).map((output) => [output.key, output]));
  const outputs = Object.entries(result?.outputs ?? {}).map(([key, value]) => {
    const metadata = outputMetadata.get(key);
    return {
      key,
      label: metadata?.label ?? key,
      value,
      unit: metadata?.canonicalUnit ?? null,
      quantity: metadata?.quantity ?? null,
    };
  });
  const executionStatus = !result ? 'NOT RUN' : result.ok ? 'COMPLETED' : 'FAILED';
  return {
    execution: {
      status: executionStatus,
      executionId: result?.execution?.executionId ?? null,
      errorCode: result?.ok === false ? result.errors?.[0]?.code ?? 'CALCULATION_FAILED' : null,
    },
    assessment: {
      status: assessmentStatus(result, checks),
      disposition: result?.assessment?.disposition ?? null,
      governingEligible: result?.assessment?.governingEligible ?? null,
    },
    authority: {
      effective: result?.qualification?.effective
        ?? definition?.authority?.qualificationState
        ?? definition?.authority?.calculationState
        ?? null,
      designAuthority: result?.assessment?.designAuthority ?? result?.qualification?.designAuthority ?? null,
      codeCompliance: result?.assessment?.codeCompliance ?? definition?.authority?.codeCompliance ?? null,
    },
    outputs,
    checks,
  };
}

function canonicalInputsFromResolved(resolvedInputs = {}) {
  return Object.fromEntries(Object.entries(resolvedInputs).map(([key, item]) => [key, item?.canonicalValue]));
}

function inputTransformationsFromResolved(resolvedInputs = {}) {
  return Object.fromEntries(Object.entries(resolvedInputs).map(([key, item]) => [key, {
    inputValue: item?.value ?? null,
    inputUnit: item?.unit ?? null,
    canonicalValue: item?.canonicalValue ?? null,
    canonicalUnit: item?.canonicalUnit ?? null,
    transformation: item?.transformation ?? null,
    source: item?.source ?? null,
    overridden: Boolean(item?.overridden),
  }]));
}

function qualificationRecordId(result) {
  return result?.qualification?.recordId
    ?? result?.provenance?.qualificationRecordId
    ?? result?.evidence?.qualificationRecordId
    ?? null;
}

export function buildEngineeringAuditManifest(definition, result) {
  if (!definition || !result) return null;
  return {
    schemaVersion: 'engineering-calculation-audit/v1',
    calculation: {
      calculationId: definition.id,
      family: definition.family ?? result.family ?? null,
      name: definition.name ?? null,
      methodRevision: result.methodRevision ?? definition.methodRevision ?? null,
      solverRevision: result.execution?.implementationRevision ?? definition.implementationVersion ?? null,
      definitionContractVersion: definition.contractVersion ?? null,
      resultContractVersion: result.contractVersion ?? null,
    },
    execution: result.execution ?? null,
    authority: definition.authority ?? null,
    qualification: result.qualification ?? null,
    qualificationRecordId: qualificationRecordId(result),
    applicability: result.applicability ?? null,
    inputs: result.inputs ?? {},
    resolvedInputs: result.resolvedInputs ?? {},
    canonicalInputs: canonicalInputsFromResolved(result.resolvedInputs ?? {}),
    inputTransformations: inputTransformationsFromResolved(result.resolvedInputs ?? {}),
    outputs: result.outputs ?? {},
    intermediates: result.intermediates ?? {},
    checks: result.checks ?? [],
    assessment: result.assessment ?? null,
    warnings: result.warnings ?? [],
    errors: result.errors ?? [],
    provenance: result.provenance ?? {},
    evidence: result.evidence ?? {},
  };
}

export function engineeringResultLabel(result) {
  return buildEngineeringResultViewModel(null, result).assessment.status;
}
