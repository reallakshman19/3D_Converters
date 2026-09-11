const NON_EXECUTABLE_STATES = new Set(['CONCEPT', 'SOURCE_INVENTORIED', 'METHOD_SPECIFIED', 'BLOCKED']);
const CHECK_STATUSES = new Set(['PASS', 'FAIL', 'NOT_APPLICABLE', 'NOT_EVALUATED', 'INDETERMINATE']);

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

function normalizedCheckStatus(check) {
  if (CHECK_STATUSES.has(check?.status)) return check.status;
  if (check?.satisfied === true) return 'PASS';
  if (check?.satisfied === false) return 'FAIL';
  return 'INDETERMINATE';
}

export function normalizeEngineeringCheck(check = {}, result = null) {
  const effectiveAuthority = result?.qualification?.effective;
  return {
    ...check,
    label: check.label ?? check.id ?? 'Unnamed check',
    status: normalizedCheckStatus(check),
    authority: check.authority
      ?? effectiveAuthority
      ?? (check.designAuthority === true ? 'DESIGN_AUTHORITY' : check.designAuthority === false ? 'NON_DESIGN' : '—'),
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

export function engineeringResultLabel(result) {
  return buildEngineeringResultViewModel(null, result).assessment.status;
}
