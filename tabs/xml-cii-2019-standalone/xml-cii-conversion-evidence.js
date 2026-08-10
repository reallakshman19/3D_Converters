function text(value) { return value === undefined || value === null ? '' : String(value); }
function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }

export function digestXmlCiiEvidenceText(value) {
  const source = text(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}:${source.length}`;
}

function canonical(value, seen = new WeakSet()) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => canonical(item, seen));
  if (value instanceof Map) return canonical(Object.fromEntries([...value.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))), seen);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonical(value[key], seen);
  return out;
}

export function canonicalXmlCiiEvidenceJson(value) {
  return JSON.stringify(canonical(value));
}

function parseConfig(raw) {
  try { const value = JSON.parse(text(raw) || '{}'); return plainObject(value) ? value : {}; } catch { return {}; }
}

function snapshot(name, lifecyclePoint, payload) {
  const canonicalJson = canonicalXmlCiiEvidenceJson(payload);
  return Object.freeze({
    schema: 'xml-cii-evidence-snapshot/v1',
    name,
    lifecyclePoint,
    digest: digestXmlCiiEvidenceText(canonicalJson),
    canonicalJson,
  });
}

function previewPayload(state) {
  const report = state?.previewDiagnosticsAuditReport;
  if (!report) return { status: 'not-built', rows: [] };
  return {
    status: state?.previewDiagnosticsAuditStatus || 'built',
    report,
  };
}

function match1Payload(config) {
  const map = plainObject(config?.overrides?.rigidWeightMatch1) ? config.overrides.rigidWeightMatch1 : {};
  return {
    authority: 'RigidMatch1',
    decisionsKgByKey: map,
    decisionCount: Object.keys(map).length,
  };
}

function finalPayload(config) {
  const finalMap = plainObject(config?.overrides?.rigidWeightFinal) ? config.overrides.rigidWeightFinal : {};
  const transient = plainObject(config?.overrides?.rigidWeight) ? config.overrides.rigidWeight : {};
  const map = Object.keys(finalMap).length ? finalMap : transient;
  return {
    authority: 'Rigidmatch2',
    decisionsKgByKey: map,
    decisionCount: Object.keys(map).length,
    action: Object.keys(map).length ? 'apply' : 'skip-or-no-final-values',
  };
}

export function buildXmlCiiConversionEvidence(state, supportConfigJson) {
  const config = parseConfig(supportConfigJson);
  const snapshots = {
    preview: snapshot('preview', 'phase-4-preview-finalized', previewPayload(state)),
    RigidMatch1: snapshot('RigidMatch1', 'weight-match-finalized', match1Payload(config)),
    Rigidmatch2: snapshot('Rigidmatch2', 'finalise-and-run-review-complete', finalPayload(config)),
  };
  return Object.freeze({
    schema: 'xml-cii-conversion-evidence/v1',
    sourceName: text(state?.sourceFile?.name || state?.sourceNameOverride || 'source.xml'),
    sourceDigest: digestXmlCiiEvidenceText(state?.sourceText || ''),
    stagedJsonDigest: digestXmlCiiEvidenceText(state?.stagedJsonText || ''),
    supportConfigDigest: digestXmlCiiEvidenceText(supportConfigJson || '{}'),
    snapshots,
  });
}

function escapeXml(value) {
  return text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function cdata(value) { return `<![CDATA[${text(value).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`; }

function snapshotXml(tagName, value) {
  return `<${tagName} schema="${escapeXml(value.schema)}" lifecyclePoint="${escapeXml(value.lifecyclePoint)}" digest="${escapeXml(value.digest)}"><json>${cdata(value.canonicalJson)}</json></${tagName}>`;
}

export function buildXmlCiiConversionEvidenceXml(evidence, extraDigests = {}) {
  const source = evidence || {};
  const snapshots = source.snapshots || {};
  return `<?xml version="1.0" encoding="UTF-8"?>\n<ConversionEvidence schema="xml-cii-conversion-evidence/v1" sourceName="${escapeXml(source.sourceName || '')}">\n  <Digests source="${escapeXml(source.sourceDigest || '')}" stagedJson="${escapeXml(source.stagedJsonDigest || '')}" supportConfig="${escapeXml(source.supportConfigDigest || '')}" engineRequestXml="${escapeXml(extraDigests.engineRequestXmlDigest || '')}" converterParseXml="${escapeXml(extraDigests.converterParseXmlDigest || '')}" cii="${escapeXml(extraDigests.ciiDigest || '')}"/>\n  ${snapshotXml('preview', snapshots.preview || snapshot('preview', 'phase-4-preview-finalized', {}))}\n  ${snapshotXml('RigidMatch1', snapshots.RigidMatch1 || snapshot('RigidMatch1', 'weight-match-finalized', {}))}\n  ${snapshotXml('Rigidmatch2', snapshots.Rigidmatch2 || snapshot('Rigidmatch2', 'finalise-and-run-review-complete', {}))}\n</ConversionEvidence>\n`;
}
