export const VIBRATION_INTEGRITY_PROJECT_SCHEMA = 'VibrationIntegrityProject.v1';
export const VIBRATION_INTEGRITY_PROJECT_AUTHORITY = 'PERSISTENCE_CONTAINER_ONLY';

function projectError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationIntegrityProjectError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw projectError('VIBRATION_PROJECT_OBJECT_REQUIRED', `${field} must be an object.`, { field });
  }
  return value;
}

function requiredArray(value, field) {
  if (!Array.isArray(value)) {
    throw projectError('VIBRATION_PROJECT_ARRAY_REQUIRED', `${field} must be an array.`, { field });
  }
  return value;
}

function uniqueIds(rows, field, code) {
  const values = rows.map((row) => String(row?.[field] ?? '')).filter(Boolean);
  if (values.length !== rows.length || new Set(values).size !== values.length) {
    throw projectError(code, `${field} values must be present and unique.`, { field });
  }
  return new Set(values);
}

export function assertVibrationIntegrityProject(value) {
  const project = requiredObject(value, 'project');
  if (project.schema !== VIBRATION_INTEGRITY_PROJECT_SCHEMA) {
    throw projectError('VIBRATION_PROJECT_SCHEMA_MISMATCH', `Project must use ${VIBRATION_INTEGRITY_PROJECT_SCHEMA}.`, { actual: project.schema ?? null });
  }
  requiredObject(project.project, 'project.project');
  const subjects = requiredObject(project.subjects, 'project.subjects');
  const lines = requiredArray(subjects.lines, 'project.subjects.lines');
  const mechanisms = requiredArray(project.mechanismImports, 'project.mechanismImports');
  requiredArray(project.currentResults, 'project.currentResults');
  const lineIds = uniqueIds(lines, 'lineId', 'VIBRATION_PROJECT_LINE_ID_INVALID');
  uniqueIds(mechanisms, 'recordId', 'VIBRATION_PROJECT_MECHANISM_RECORD_ID_INVALID');
  for (const record of mechanisms) {
    if (!lineIds.has(String(record.lineId ?? ''))) {
      throw projectError('VIBRATION_PROJECT_DANGLING_LINE_REFERENCE', 'Mechanism import references an unknown line.', { recordId: record.recordId ?? null, lineId: record.lineId ?? null });
    }
  }
  return project;
}

export function cloneProjectValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function deepFreezeProjectValue(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeProjectValue(child);
  return Object.freeze(value);
}

export function createVibrationProjectError(code, message, details = {}) {
  return projectError(code, message, details);
}
