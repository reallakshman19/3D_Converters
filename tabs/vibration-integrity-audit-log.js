export const VIBRATION_INTEGRITY_AUDIT_LOG_SCHEMA = 'VibrationIntegrityAuditLog.v1';
export const VIBRATION_INTEGRITY_AUDIT_EVENT_SCHEMA = 'VibrationIntegrityAuditEvent.v1';

export const VIBRATION_INTEGRITY_AUDIT_EVENT_TYPES = Object.freeze([
  'SESSION_STARTED',
  'WORKSPACE_TAB_CHANGED',
  'WORKSPACE_ACTION',
  'BENCHMARK_LOADED',
  'FILE_LOADED',
  'INPUT_CHANGED',
  'USER_DATA_CHANGED',
  'PREFLIGHT_STARTED',
  'PREFLIGHT_SUCCEEDED',
  'PREFLIGHT_FAILED',
  'RUN_STARTED',
  'RUN_SUCCEEDED',
  'RUN_FAILED',
  'REGISTER_EXPORTED',
  'RUN_EVIDENCE_EXPORT_STARTED',
  'RUN_EVIDENCE_EXPORTED',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireIsoTimestamp(value, code) {
  const text = String(value ?? '').trim();
  if (!text || Number.isNaN(Date.parse(text))) throw new TypeError(code);
  return text;
}

function jsonClone(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function runIdentity(runSnapshot) {
  if (!runSnapshot) return null;
  return {
    runId: runSnapshot.runId ?? null,
    snapshotHash: runSnapshot.snapshotHash ?? null,
    engineeringInputHash: runSnapshot.engineeringInputHash ?? null,
  };
}

function eventId(sequence) {
  return `VI-AUDIT-${String(sequence).padStart(6, '0')}`;
}

function assertAuditEvent(event, sequence) {
  if (event?.schema !== VIBRATION_INTEGRITY_AUDIT_EVENT_SCHEMA
      || event.sequence !== sequence || event.eventId !== eventId(sequence)) {
    throw new Error('VIBRATION_AUDIT_SEQUENCE_INVALID');
  }
  if (!VIBRATION_INTEGRITY_AUDIT_EVENT_TYPES.includes(event.type)
      || !String(event.at ?? '').trim() || Number.isNaN(Date.parse(event.at))) {
    throw new Error('VIBRATION_AUDIT_EVENT_INVALID');
  }
}

export function createVibrationIntegrityAuditLog(createdAt) {
  const at = requireIsoTimestamp(createdAt, 'VIBRATION_AUDIT_CREATED_AT_INVALID');
  return deepFreeze({
    schema: VIBRATION_INTEGRITY_AUDIT_LOG_SCHEMA,
    createdAt: at,
    events: [],
  });
}

export function assertVibrationIntegrityAuditLog(log) {
  if (log?.schema !== VIBRATION_INTEGRITY_AUDIT_LOG_SCHEMA || !Array.isArray(log.events)) {
    throw new TypeError('VIBRATION_AUDIT_LOG_INVALID');
  }
  requireIsoTimestamp(log.createdAt, 'VIBRATION_AUDIT_CREATED_AT_INVALID');
  log.events.forEach((event, index) => assertAuditEvent(event, index + 1));
  return log;
}

export function appendVibrationIntegrityAuditEvent(log, input = {}) {
  assertVibrationIntegrityAuditLog(log);
  if (!VIBRATION_INTEGRITY_AUDIT_EVENT_TYPES.includes(input.type)) {
    throw new TypeError(`VIBRATION_AUDIT_EVENT_TYPE_INVALID:${String(input.type)}`);
  }
  const sequence = log.events.length + 1;
  const event = deepFreeze({
    schema: VIBRATION_INTEGRITY_AUDIT_EVENT_SCHEMA,
    sequence,
    eventId: eventId(sequence),
    at: requireIsoTimestamp(input.at, 'VIBRATION_AUDIT_EVENT_AT_INVALID'),
    type: input.type,
    resultState: input.resultState ?? null,
    run: runIdentity(input.runSnapshot),
    authority: jsonClone(input.authority ?? null),
    details: jsonClone(input.details ?? {}),
  });
  return deepFreeze({ ...log, events: [...log.events, event] });
}

export function serializeVibrationIntegrityAuditLog(log) {
  assertVibrationIntegrityAuditLog(log);
  return `${JSON.stringify(log, null, 2)}\n`;
}
