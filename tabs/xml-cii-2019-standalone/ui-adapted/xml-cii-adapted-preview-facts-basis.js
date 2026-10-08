// GC-PW/1.0 Preview-only portable content identity. No DOM, transport, or master mutation.
export const PREVIEW_BASIS_SCHEMA = 'gc-pw/1.0';
export class PreviewBasisError extends Error {
  constructor(code, message) { super(message); this.name = 'PreviewBasisError'; this.code = code; }
}
function assert(condition, code, message) {
  if (!condition) throw new PreviewBasisError(code, message);
}
export function canonicalPreviewValue(value) {
  const seen = new Set();
  const encode = (v) => {
    if (v === null) return 'null';
    if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number') {
      assert(Number.isFinite(v), 'NONFINITE_VALUE', 'NaN/Infinity cannot enter engineering basis');
      return JSON.stringify(v);
    }
    assert(v && typeof v === 'object' && !Array.isArray(v) || Array.isArray(v),
      'UNSERIALIZABLE_VALUE', 'Only JSON-serializable objects and arrays enter engineering basis');
    assert(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null || Array.isArray(v),
      'UNSERIALIZABLE_VALUE', 'Non-plain object in engineering basis');
    assert(!seen.has(v), 'CYCLIC_VALUE', 'Cyclic engineering basis');
    seen.add(v);
    const out = Array.isArray(v) ? '[' + v.map(encode).join(',') + ']'
      : '{' + Object.keys(v).sort().map((k) => {
        assert(v[k] !== undefined, 'UNSERIALIZABLE_VALUE', 'Undefined engineering field: ' + k);
        return JSON.stringify(k) + ':' + encode(v[k]);
      }).join(',') + '}';
    seen.delete(v);
    return out;
  };
  return encode(value);
}
function shaCheck(s) {
  assert(typeof s === 'string' && /^[a-f0-9]{64}$/.test(s), 'INVALID_DIGEST', 'Expected lowercase SHA-256 hex digest');
  return s;
}
async function digest(sha256, value) {
  assert(typeof sha256 === 'function', 'MISSING_DIGESTER', 'A SHA-256 function must be injected by local execution adapter');
  return shaCheck(await sha256(value));
}
function nonempty(value, label) {
  assert(typeof value === 'string' && value.trim().length > 0, 'INVALID_INPUT', label + ' is required');
  return value;
}
// Full-content SHA-256, not filename, size, XML prefix, or master row count.
// Caller supplies a cryptographic sha256(string)->Promise<lowercase hex> port.
export async function createPreviewBasis({
  domainId, sources, selection, stagedSource = null, masters, config, overrides, sha256,
}) {
  nonempty(domainId, 'domainId');
  assert(Array.isArray(sources) && sources.length > 0, 'INVALID_SOURCES', 'At least one source is required');
  assert(Array.isArray(selection), 'INVALID_SELECTION', 'Selection must be an array');
  assert(masters && typeof masters === 'object' && !Array.isArray(masters), 'INVALID_MASTERS', 'Masters must be keyed');
  const ids = new Set();
  const sourceRefs = [];
  for (const source of sources) {
    const sourceId = nonempty(source?.sourceId, 'sourceId');
    assert(!ids.has(sourceId), 'DUPLICATE_SOURCE', 'Source ID must be unique');
    ids.add(sourceId);
    nonempty(source?.mediaType, 'mediaType');
    assert(typeof source.text === 'string', 'INVALID_SOURCE', 'Full source bytes/text must be supplied');
    sourceRefs.push({ sourceId, mediaType: source.mediaType, sha256: await digest(sha256, source.text) });
  }
  const scope = [];
  for (const row of selection) {
    assert(ids.has(row?.sourceId), 'UNKNOWN_SELECTION_SOURCE', 'Selection source not in InputBasis');
    scope.push({ sourceId: row.sourceId, selectionRef: nonempty(row.selectionRef, 'selectionRef') });
  }
  const masterRefs = {};
  for (const key of Object.keys(masters).sort()) {
    const m = masters[key];
    nonempty(m?.datasetId, 'datasetId');
    assert(typeof m.revision === 'string' || Number.isSafeInteger(m.revision), 'INVALID_REVISION', 'Invalid master revision');
    assert(Array.isArray(m.rows), 'MISSING_MASTER_ROWS', 'Full master rows required for content identity');
    assert(m.rowCount === undefined || m.rowCount === m.rows.length, 'MASTER_ROWCOUNT_MISMATCH', 'Master row count mismatch');
    masterRefs[key] = {
      datasetId: m.datasetId, revision: m.revision, rowCount: m.rows.length,
      sha256: await digest(sha256, canonicalPreviewValue(m.rows)),
      mappingSha256: await digest(sha256, canonicalPreviewValue(m.mapping ?? null)),
    };
  }
  const record = {
    schemaVersion: PREVIEW_BASIS_SCHEMA, domainId,
    sourceRefs, selectionSha256: await digest(sha256, canonicalPreviewValue(scope)),
    stagedSourceSha256: stagedSource === null ? null : await digest(sha256, nonempty(stagedSource, 'stagedSource')),
    masters: masterRefs,
    configSha256: await digest(sha256, canonicalPreviewValue(config ?? null)),
    overridesSha256: await digest(sha256, canonicalPreviewValue(overrides ?? null)),
    scope,
  };
  // Hash the complete canonical public representation, never a sampled prefix.
  return { ...record, basisId: await digest(sha256, canonicalPreviewValue(record)) };
}
export function previewOccurrenceId({ sourceId, branchOrdinal, nodeOrdinal = null, componentSignature = '' }) {
  nonempty(sourceId, 'sourceId');
  assert(Number.isSafeInteger(branchOrdinal) && branchOrdinal >= 0, 'INVALID_OCCURRENCE', 'Branch ordinal must be nonnegative');
  assert(nodeOrdinal === null || Number.isSafeInteger(nodeOrdinal) && nodeOrdinal >= 0,
    'INVALID_OCCURRENCE', 'Node ordinal must be nonnegative');
  return JSON.stringify([sourceId, branchOrdinal, nodeOrdinal, String(componentSignature)]);
}
