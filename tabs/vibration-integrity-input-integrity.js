const TOPOLOGY_KIND = 'topology';
const SHA256 = /^[0-9a-f]{64}$/u;

export const VIBRATION_TOPOLOGY_PROJECTION_SCHEMA = 'FitTopologyElementsProjection.v1';

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto SHA-256 is required for vibration topology integrity checks.');
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function integrityError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationTopologyIntegrityError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function canonicalProjection(table) {
  if (table?.kind !== TOPOLOGY_KIND || !Array.isArray(table?.header) || !Array.isArray(table?.rows)) {
    throw integrityError(
      'VIBRATION_TOPOLOGY_PROJECTION_INVALID',
      'Topology projection integrity requires a valid topology working table.',
    );
  }
  return {
    schema: VIBRATION_TOPOLOGY_PROJECTION_SCHEMA,
    contract: text(table.contract),
    header: table.header.map(text),
    rows: table.rows.map((row) => row.map(text)),
  };
}

export async function buildVibrationTopologyProjectionFingerprint(table) {
  const projection = canonicalProjection(table);
  const canonical = stableJson(projection);
  const projectionHash = await sha256Hex(canonical);
  return Object.freeze({
    schema: VIBRATION_TOPOLOGY_PROJECTION_SCHEMA,
    projectionHash,
    canonical,
  });
}

export async function assertVibrationTopologyProjectionIntegrity(file, table) {
  const expected = String(file?.projectionHash ?? '');
  if (file?.projectionSchema !== VIBRATION_TOPOLOGY_PROJECTION_SCHEMA || !SHA256.test(expected)) {
    throw integrityError(
      'VIBRATION_TOPOLOGY_PROJECTION_FINGERPRINT_MISSING',
      'Preserved XLSX execution requires the source Elements projection fingerprint.',
    );
  }
  const current = await buildVibrationTopologyProjectionFingerprint(table);
  if (current.projectionHash !== expected) {
    throw integrityError(
      'VIBRATION_TOPOLOGY_PROJECTION_INTEGRITY_MISMATCH',
      'Current Elements working projection no longer matches the preserved XLSX source projection.',
      { expected, actual: current.projectionHash },
    );
  }
  return current;
}
