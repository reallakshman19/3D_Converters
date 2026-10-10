/**
 * A3 T05b: attested original Blob + committed B0 catalog → root descriptors.
 *
 * READ/RESEARCH ONLY. A selection manifest alone never grants a product
 * Build, local CSV export, or downstream CII authority.
 */
import { openPagedSourceQuery } from '../../qualification/experiments/consumer-sparse-b0-query/paged-query.mjs';
import { createOriginalToSelectedRootManifest } from './source-root-selection-manifest.mjs';

const MAX_ROOT_BYTES = 1024 * 1024;
const MAX_ROOTS = 4096;
const OWNER_KEYS = ['OWNER_ZONE', 'ZONE_ID', 'OWNER_SITE', 'SITE', 'ZONE'];
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const clean = v => typeof v === 'string' ? v.trim() : '';
const upper = v => typeof v === 'string' ? v.toUpperCase() : '';
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function ownCaseInsensitive(object, name) {
  const entries = Object.entries(object || {}).filter(([key]) => upper(key) === name);
  if (!entries.length) return '';
  const values = [...new Set(entries.map(([, value]) => clean(value)).filter(Boolean))];
  if (values.length > 1)
    fail('ROOT_METADATA_AMBIGUOUS', 'conflicting case-insensitive direct root fields');
  return values[0] || '';
}

/**
 * Reads only direct root / root.attributes ownership. A nested child field
 * cannot silently establish a zone for the enclosing original root.
 */
export function extractDirectOriginalRootMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('ROOT_VALUE_INVALID', 'bounded source root must be a JSON object');
  const attrs = value.attributes;
  if (attrs != null && (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)))
    fail('ROOT_METADATA_INVALID', 'root attributes must be a direct object');
  const type = ownCaseInsensitive(value, 'TYPE');
  const attrType = ownCaseInsensitive(attrs, 'TYPE');
  if (type && attrType && upper(type) !== upper(attrType))
    fail('ROOT_METADATA_AMBIGUOUS', 'conflicting direct root type');
  if (upper(type || attrType) !== 'BRANCH')
    fail('TOPOLOGY_NOT_PROVEN', 'original root is not a named BRANCH');
  const name = ownCaseInsensitive(value, 'NAME') ||
    ownCaseInsensitive(attrs, 'NAME');
  if (!name) fail('TOPOLOGY_NOT_PROVEN', 'original BRANCH name is missing');
  if (!Array.isArray(value.children))
    fail('TOPOLOGY_NOT_PROVEN', 'original BRANCH requires an array of children');
  const scopeValues = [];
  for (const key of OWNER_KEYS) {
    for (const [object, evidence] of [
      [value, 'DIRECT_ROOT'], [attrs, 'DIRECT_ATTRIBUTES']
    ]) {
      const candidate = ownCaseInsensitive(object, key);
      if (candidate) scopeValues.push({ key, value: candidate, evidence });
    }
  }
  if (new Set(scopeValues.map(entry => entry.value)).size > 1)
    fail('SCOPE_EVIDENCE_AMBIGUOUS',
      'different direct root/attribute ownership labels cannot be silently chosen');
  const chosen = scopeValues[0];
  return Object.freeze({
    type: 'BRANCH', name, ownerScope: chosen?.value || '',
    scopeEvidence: chosen?.evidence || 'NONE',
    scopeKey: chosen?.key || ''
  });
}

/**
 * This API uses the SOURCE team's openPagedSourceQuery: it rehashes the full
 * original Blob, checks the committed generation and validates each page
 * directory/ordinal. Never treats arbitrary provided metadata as custody.
 */
export async function readVerifiedOriginalRootManifest({
  sourceDatabaseName, sourceGeneration, blob, expectedSha256,
  xmlSha256, configDigest, requestedScopeId
} = {}) {
  let source;
  try {
    source = await openPagedSourceQuery({
      databaseName: sourceDatabaseName, generation: sourceGeneration,
      blob, expectedSha256, sourceRevisionLabel: 'A3-ROOT-MANIFEST',
      selection: { kind: 'ALL' }
    });
    await source.assertActive();
    let cursor = 0, first = true, priorMember = -1;
    const roots = [];
    do {
      const page = await source.readPage({
        cursor, maxRows: 256, maxBytes: 65536
      });
      if (!page.rows.length || page.nextCursor <= cursor)
        fail('ROOT_CATALOG_INCOMPLETE', 'non-progressing original source index page');
      for (const row of page.rows) {
        if (first) {
          first = false;
          if (row.ordinal !== 0 || row.type !== 'array' ||
              row.parent !== null)
            fail('ROOT_PROFILE_UNSUPPORTED', 'original JSON root must be an array');
        }
        if (row.type !== 'object' || row.parent !== 0) continue;
        if (!Number.isSafeInteger(row.member) ||
            row.member !== priorMember + 1 ||
            roots.length >= MAX_ROOTS)
          fail('ROOT_CATALOG_INCOMPLETE',
            'original top-level root members missing/reordered/over count budget');
        priorMember = row.member;
        const length = row.endByteExclusive - row.startByte;
        if (!Number.isSafeInteger(length) || length <= 0 ||
            length > MAX_ROOT_BYTES)
          fail('ROOT_SPAN_LIMIT', 'one original root exceeds bounded source slice budget');
        const bytes = await source.readOriginalRange(
          row.startByte, row.endByteExclusive);
        if (bytes.byteLength !== length)
          fail('ROOT_SOURCE_TRUNCATED', 'original root bytes differ from catalog span');
        let value;
        try { value = JSON.parse(decoder.decode(bytes)); }
        catch { fail('ROOT_SOURCE_INVALID', 'attested original root slice is not valid JSON'); }
        const metadata = extractDirectOriginalRootMetadata(value);
        roots.push({
          ordinal: row.ordinal, parentOrdinal: row.parent, member: row.member,
          startByte: row.startByte, endByteExclusive: row.endByteExclusive,
          ...metadata
        });
      }
      cursor = page.nextCursor;
    } while (cursor < source.sourceCount);
    if (!roots.length)
      fail('ROOT_CATALOG_EMPTY', 'original committed catalog contains no root branches');
    await source.assertActive();
    const manifest = await createOriginalToSelectedRootManifest({
      sourceSha256: expectedSha256, sourceGeneration,
      originalSourceBytes: blob.size, xmlSha256, configDigest,
      requestedScopeId, rootProfile: 'root-array', roots
    });
    await source.assertActive();
    return manifest;
  } finally {
    source?.close();
  }
}
