import { canonicalJson } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { buildPackageAudit, buildPackageManifest, digestEntries } from './package-manifest.js';

const encoder = new TextEncoder();
const DOS_DATE_1980_01_01 = 0x0021;
const UTF8_FLAG = 0x0800;

function bytes(value) {
  if (typeof value === 'string') return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('Package entry must be text or bytes.');
}

function jsonEntry(path, value, artifactSchema = null, artifactId = null) {
  return { path, bytes: bytes(canonicalJson(value)), mediaType: 'application/json',
    artifactSchema, artifactId };
}

function geometryManifest(selections) {
  return { schema: 'FbxSelectedZoneGeometryBundleManifest.v1', geometries: selections.map((selection) => ({
    descriptor: structuredClone(selection.geometry),
    bufferDescriptors: selection.buffers.map((item) => structuredClone(item.descriptor)),
  })).sort((left, right) => {
    const a = String(left.descriptor.geometryObjectId), b = String(right.descriptor.geometryObjectId);
    return a < b ? -1 : a > b ? 1 : 0;
  }) };
}

function bufferPath(selection, item) {
  return `geometry-buffers/geometry-${selection.geometry.geometryObjectId}-${item.role}.bin`;
}

function binaryEntries(selections) {
  return selections.flatMap((selection) => selection.buffers.map((item) => ({
    path: bufferPath(selection, item), bytes: bytes(item.buffer.bytes),
    mediaType: 'application/octet-stream', bufferRole: item.role,
    elementCount: item.descriptor.count, sourceGeometryObjectId: selection.geometry.geometryObjectId,
  })));
}

function pipeEvidence(autoPipe) {
  if (!autoPipe?.classificationDispositions) return null;
  return { schema: 'FbxPipeInferenceEvidencePackageView.v1',
    status: autoPipe.status, classificationStatus: autoPipe.classificationStatus || null,
    connectivityStatus: autoPipe.connectivityStatus || null,
    classificationDispositions: structuredClone(autoPipe.classificationDispositions),
    internalPipeMapping: autoPipe.internalPipeMapping ? structuredClone(autoPipe.internalPipeMapping) : null };
}

function payloadEntries(input) {
  const entries = [
    jsonEntry('source-graph.selected-zone.json', input.sourceGraphSelectedZone,
      input.sourceGraphSelectedZone?.schema || 'FbxSourceGraph.v2', null),
    jsonEntry('geometry-bundle.manifest.json', geometryManifest(input.selections),
      'FbxSelectedZoneGeometryBundleManifest.v1', null),
    ...binaryEntries(input.selections),
    jsonEntry('zone-geometry-evidence.json', input.zoneGeometryEvidence,
      input.zoneGeometryEvidence.schema, input.zoneGeometryEvidence.artifactId),
    jsonEntry('derived-port-evidence.json', input.derivedPortEvidence,
      input.derivedPortEvidence.schema, input.derivedPortEvidence.artifactId),
    jsonEntry('support-evidence.json', input.supportResult.supportEvidence,
      input.supportResult.supportEvidence.schema, input.supportResult.supportEvidence.artifactId),
  ];
  const pipe = pipeEvidence(input.autoPipe);
  if (pipe) entries.push(jsonEntry('pipe-inference-evidence.json', pipe, pipe.schema, null));
  if (input.autoPipe?.stagedJsonText) entries.push({ path: 'selected-zone.staged.json',
    bytes: bytes(input.autoPipe.stagedJsonText), mediaType: 'application/json',
    artifactSchema: 'StagedJSON', artifactId: null });
  return entries.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

function crcTable() {
  const table = new Uint32Array(256);
  for (let value = 0; value < 256; value += 1) {
    let current = value;
    for (let bit = 0; bit < 8; bit += 1) current = current & 1
      ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    table[value] = current >>> 0;
  }
  return table;
}
const CRC_TABLE = crcTable();

function crc32(data) {
  let crc = 0xffffffff;
  for (const value of data) crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

function localHeader(entry) {
  const name = encoder.encode(entry.path), output = new Uint8Array(30 + name.length);
  const view = new DataView(output.buffer), crc = crc32(entry.bytes);
  write32(view, 0, 0x04034b50); write16(view, 4, 20); write16(view, 6, UTF8_FLAG);
  write16(view, 8, 0); write16(view, 10, 0); write16(view, 12, DOS_DATE_1980_01_01);
  write32(view, 14, crc); write32(view, 18, entry.bytes.length); write32(view, 22, entry.bytes.length);
  write16(view, 26, name.length); write16(view, 28, 0); output.set(name, 30);
  return { output, crc, name };
}

function centralHeader(entry, local, offset) {
  const output = new Uint8Array(46 + local.name.length), view = new DataView(output.buffer);
  write32(view, 0, 0x02014b50); write16(view, 4, 0x0314); write16(view, 6, 20);
  write16(view, 8, UTF8_FLAG); write16(view, 10, 0); write16(view, 12, 0);
  write16(view, 14, DOS_DATE_1980_01_01); write32(view, 16, local.crc);
  write32(view, 20, entry.bytes.length); write32(view, 24, entry.bytes.length);
  write16(view, 28, local.name.length); write16(view, 30, 0); write16(view, 32, 0);
  write16(view, 34, 0); write16(view, 36, 0); write32(view, 38, 0x81a40000);
  write32(view, 42, offset); output.set(local.name, 46); return output;
}

function concatenate(parts) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function zipStore(entries) {
  const localParts = [], centralParts = []; let offset = 0;
  for (const entry of entries) {
    const local = localHeader(entry); localParts.push(local.output, entry.bytes);
    centralParts.push(centralHeader(entry, local, offset));
    offset += local.output.length + entry.bytes.length;
  }
  const central = concatenate(centralParts), end = new Uint8Array(22), view = new DataView(end.buffer);
  write32(view, 0, 0x06054b50); write16(view, 4, 0); write16(view, 6, 0);
  write16(view, 8, entries.length); write16(view, 10, entries.length);
  write32(view, 12, central.length); write32(view, 16, offset); write16(view, 20, 0);
  return concatenate([...localParts, central, end]);
}

export async function buildSelectedZoneEngineeringPackage(input) {
  const payload = payloadEntries(input), payloadDigests = await digestEntries(payload);
  const finalOrder = ['manifest.json', ...payload.map((entry) => entry.path), 'package-audit.json'].sort();
  const stagedJsonDisposition = input.autoPipe?.stagedJsonText ? 'INCLUDED' : 'ABSENT';
  const manifest = await buildPackageManifest({ zoneGeometryEvidence: input.zoneGeometryEvidence,
    supportResult: input.supportResult, payloadDigests, stagedJsonDisposition,
    stagedJsonBlockStatus: input.autoPipe?.status || 'NOT_EVALUATED', canonicalEntryOrder: finalOrder });
  const audit = await buildPackageAudit(manifest, payloadDigests);
  const entries = [jsonEntry('manifest.json', manifest, manifest.schema, manifest.packageId),
    ...payload, jsonEntry('package-audit.json', audit, audit.schema, audit.auditId)]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const archiveBytes = zipStore(entries), archiveSha256 = await sha256Hex(archiveBytes);
  return Object.freeze({ status: 'ENGINEERING_PACKAGE_PASS', manifest, audit,
    archiveBytes, archiveSha256, packageId: manifest.packageId, packageDigest: manifest.packageDigest });
}
