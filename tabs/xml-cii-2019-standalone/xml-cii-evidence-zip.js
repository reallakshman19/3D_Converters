import { digestXmlCiiEvidenceText } from './xml-cii-conversion-evidence.js';

function text(value) { return value === undefined || value === null ? '' : String(value); }
function bytes(value) { return new TextEncoder().encode(text(value)); }
function safeStem(name) {
  const clean = (text(name).trim() || 'source.xml').replace(/[\\/:*?"<>|]/g, '_');
  const index = clean.lastIndexOf('.');
  return index > 0 ? clean.slice(0, index) : clean;
}
function stableJson(value) { return JSON.stringify(value ?? null, null, 2) + '\n'; }
function parseJsonOrText(value) {
  const raw = text(value);
  if (!raw.trim()) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32XmlCiiZip(input) {
  const data = input instanceof Uint8Array ? input : bytes(input);
  let crc = 0xFFFFFFFF;
  for (const value of data) crc = CRC_TABLE[(crc ^ value) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
function concat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function localHeader(nameBytes, dataBytes, crc) {
  const out = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(out.buffer);
  write32(view, 0, 0x04034B50);
  write16(view, 4, 20);
  write16(view, 6, 0x0800);
  write16(view, 8, 0);
  write16(view, 10, 0);
  write16(view, 12, 33);
  write32(view, 14, crc);
  write32(view, 18, dataBytes.length);
  write32(view, 22, dataBytes.length);
  write16(view, 26, nameBytes.length);
  write16(view, 28, 0);
  out.set(nameBytes, 30);
  return out;
}

function centralHeader(nameBytes, dataBytes, crc, localOffset) {
  const out = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(out.buffer);
  write32(view, 0, 0x02014B50);
  write16(view, 4, 20);
  write16(view, 6, 20);
  write16(view, 8, 0x0800);
  write16(view, 10, 0);
  write16(view, 12, 0);
  write16(view, 14, 33);
  write32(view, 16, crc);
  write32(view, 20, dataBytes.length);
  write32(view, 24, dataBytes.length);
  write16(view, 28, nameBytes.length);
  write16(view, 30, 0);
  write16(view, 32, 0);
  write16(view, 34, 0);
  write16(view, 36, 0);
  write32(view, 38, 0);
  write32(view, 42, localOffset);
  out.set(nameBytes, 46);
  return out;
}

function endRecord(entryCount, centralSize, centralOffset) {
  const out = new Uint8Array(22);
  const view = new DataView(out.buffer);
  write32(view, 0, 0x06054B50);
  write16(view, 4, 0);
  write16(view, 6, 0);
  write16(view, 8, entryCount);
  write16(view, 10, entryCount);
  write32(view, 12, centralSize);
  write32(view, 16, centralOffset);
  write16(view, 20, 0);
  return out;
}

export function buildDeterministicXmlCiiZip(fileMap) {
  const entries = Object.entries(fileMap || {})
    .filter(([name, value]) => text(name).trim() && value !== undefined && value !== null)
    .map(([name, value]) => ({ name: text(name), nameBytes: bytes(name), dataBytes: value instanceof Uint8Array ? value : bytes(value) }))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (entries.length > 0xFFFF) throw new Error('ZIP entry count exceeds classic ZIP limit.');

  const locals = [];
  const centrals = [];
  let localOffset = 0;
  for (const entry of entries) {
    const crc = crc32XmlCiiZip(entry.dataBytes);
    const header = localHeader(entry.nameBytes, entry.dataBytes, crc);
    locals.push(header, entry.dataBytes);
    centrals.push(centralHeader(entry.nameBytes, entry.dataBytes, crc, localOffset));
    localOffset += header.length + entry.dataBytes.length;
  }
  const central = concat(centrals);
  return concat([...locals, central, endRecord(entries.length, central.length, localOffset)]);
}

function trimmedDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== 'object') return diagnostics || {};
  const out = { ...diagnostics };
  delete out.engineRequestXmlText;
  delete out.converterParseXmlText;
  if (out.engineDiagnostics && typeof out.engineDiagnostics === 'object') {
    out.engineDiagnostics = { ...out.engineDiagnostics };
    delete out.engineDiagnostics.engineRequestXmlText;
    delete out.engineDiagnostics.converterParseXmlText;
  }
  return out;
}

function topologyPayload(result) {
  return {
    ciiInputSource: result?.ciiInputSource || 'original',
    topoFixCommitted: result?.topoFixCommitted === true,
    findings: parseJsonOrText(result?.topologyFindingsText),
    plan: parseJsonOrText(result?.topologyFixPlanText),
    transaction: parseJsonOrText(result?.topoFixTransactionText),
    validation: parseJsonOrText(result?.topoFixValidationText),
  };
}

function entryRecord(path, content) {
  const value = text(content);
  return { path, bytes: bytes(value).length, digest: digestXmlCiiEvidenceText(value) };
}

export function buildXmlCiiEvidenceZipPackage(state) {
  const result = state?.result || {};
  const stem = safeStem(state?.sourceFile?.name || state?.sourceNameOverride || result?.ciiName || 'source.xml');
  const root = `${stem}/`;
  const sourceXml = text(state?.branchScope?.filteredSourceText ?? state?.sourceText);
  const enrichedXml = text(result?.enrichedText);
  const evidenceXml = text(result?.enrichedEvidenceXml);
  const engineXml = text(result?.diagnostics?.engineRequestXmlText || result?.diagnostics?.engineDiagnostics?.engineRequestXmlText);
  const parserXml = text(result?.diagnostics?.converterParseXmlText || result?.diagnostics?.engineDiagnostics?.converterParseXmlText);
  const cii = text(result?.ciiText);
  const diagnosticsJson = stableJson(trimmedDiagnostics(result?.diagnostics));
  const topologyJson = stableJson(topologyPayload(result));
  const geometryParityJson = stableJson({
    evidence: result?.diagnostics?.runParityEvidence || null,
    stats: result?.diagnostics?.runParityStats || null,
  });
  const weightConservationJson = stableJson({
    schema: 'xml-cii-weight-conservation/v1',
    groups: Array.isArray(result?.diagnostics?.weightConservation) ? result.diagnostics.weightConservation : [],
  });

  const artifacts = [
    [`${root}${stem}.source.xml`, sourceXml],
    [`${root}${stem}.enriched.xml`, enrichedXml],
    [`${root}${stem}.enriched-evidence.xml`, evidenceXml],
    [`${root}${stem}.engine-input.xml`, engineXml],
    [`${root}${stem}.converter-parse-input.xml`, parserXml],
    [`${root}${stem}.cii`, cii],
    [`${root}${stem}.diagnostics.json`, diagnosticsJson],
    [`${root}${stem}.topology.json`, topologyJson],
    [`${root}${stem}.geometry-parity.json`, geometryParityJson],
    [`${root}${stem}.weight-conservation.json`, weightConservationJson],
  ];

  const files = {};
  const manifestArtifacts = [];
  for (const [path, content] of artifacts) {
    if (!text(content)) continue;
    files[path] = content;
    manifestArtifacts.push(entryRecord(path, content));
  }

  const required = ['source.xml', 'enriched-evidence.xml', 'engine-input.xml', 'converter-parse-input.xml', 'cii'];
  const missingRequired = required.filter((suffix) => !manifestArtifacts.some((item) => item.path.endsWith(`.${suffix}`)));
  const manifest = {
    schema: 'xml-cii-evidence-zip-manifest/v1',
    mode: 'single-source',
    sourceStem: stem,
    repositorySha: text(state?.repositorySha || result?.repositorySha),
    repositoryShaStatus: text(state?.repositorySha || result?.repositorySha) ? 'provided-by-runtime' : 'not-exposed-by-runtime',
    deterministicZip: true,
    compression: 'STORE',
    fixedTimestamp: '1980-01-01T00:00:00Z',
    evidenceSchema: result?.conversionEvidence?.schema || '',
    conversionEvidenceDigests: result?.conversionEvidenceDigests || {},
    artifacts: manifestArtifacts,
    missingRequired,
    qualificationStatus: missingRequired.length ? 'INCOMPLETE' : 'PACKAGE_COMPLETE',
  };
  const manifestPath = `${root}${stem}.manifest.json`;
  files[manifestPath] = stableJson(manifest);
  return {
    stem,
    zipName: `${stem}.enriched-evidence.zip`,
    files,
    manifest,
    bytes: buildDeterministicXmlCiiZip(files),
  };
}

function modeASourceDirectory(row, index) {
  const stem = safeStem(row?.alias || row?.fileName || `source-${index + 1}`);
  const sourceId = safeStem(row?.sourceId || String(index + 1)).replace(/[^A-Za-z0-9_.-]/g, '_');
  return `${stem}__${sourceId.slice(0, 12)}`;
}

export function buildXmlCiiModeAEvidenceZipPackage(state) {
  const rows = Array.isArray(state?.batchRunResult?.sources) ? state.batchRunResult.sources : [];
  const files = {};
  const sources = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const pkg = buildXmlCiiEvidenceZipPackage({
      sourceText: row?.sourceText || '',
      sourceNameOverride: row?.fileName || row?.alias || `source-${index + 1}.xml`,
      result: row?.result || {},
      repositorySha: state?.repositorySha,
    });
    const directory = modeASourceDirectory(row, index);
    const originalRoot = `${pkg.stem}/`;
    for (const [filePath, content] of Object.entries(pkg.files)) {
      const relative = filePath.startsWith(originalRoot) ? filePath.slice(originalRoot.length) : filePath;
      files[`batch/${directory}/${relative}`] = content;
    }
    sources.push({
      sourceId: row?.sourceId || '',
      sourceDigest: row?.sourceDigest || '',
      fileName: row?.fileName || '',
      alias: row?.alias || '',
      status: row?.status || '',
      directory: `batch/${directory}/`,
      packageStatus: pkg.manifest.qualificationStatus,
      missingRequired: pkg.manifest.missingRequired,
      sourceManifestDigest: digestXmlCiiEvidenceText(stableJson(pkg.manifest)),
    });
  }
  const incompleteSources = sources.filter((row) => row.status !== 'SUCCEEDED' || row.packageStatus !== 'PACKAGE_COMPLETE');
  const manifest = {
    schema: 'xml-cii-mode-a-evidence-zip-manifest/v1',
    mode: 'separate-model',
    crossFileTopology: false,
    crossFileNodeRenumbering: false,
    crossFilePhysicalComponentGrouping: false,
    deterministicZip: true,
    compression: 'STORE',
    fixedTimestamp: '1980-01-01T00:00:00Z',
    sourceCount: sources.length,
    sources,
    qualificationStatus: sources.length > 0 && incompleteSources.length === 0 ? 'PACKAGE_COMPLETE' : 'INCOMPLETE',
    incompleteSourceIds: incompleteSources.map((row) => row.sourceId || row.fileName),
  };
  files['batch/batch-manifest.json'] = stableJson(manifest);
  return {
    zipName: 'xml-cii-mode-a.enriched-evidence.zip',
    files,
    manifest,
    bytes: buildDeterministicXmlCiiZip(files),
  };
}

function downloadPackage(pkg) {
  if (pkg.manifest.qualificationStatus !== 'PACKAGE_COMPLETE') {
    const detail = pkg.manifest.missingRequired?.join(', ') || pkg.manifest.incompleteSourceIds?.join(', ') || 'required evidence';
    throw new Error(`Evidence ZIP is incomplete: ${detail}.`);
  }
  const blob = new Blob([pkg.bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = pkg.zipName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return pkg.manifest;
}

export function downloadXmlCiiEvidenceZip(state) {
  const isModeA = Array.isArray(state?.batchRunResult?.sources) && state.batchRunResult.sources.length > 0;
  return downloadPackage(isModeA ? buildXmlCiiModeAEvidenceZipPackage(state) : buildXmlCiiEvidenceZipPackage(state));
}
