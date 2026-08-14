import assert from 'node:assert/strict';
import test from 'node:test';

import {
  discoverDocumentEvidenceTables,
  extractDocumentEvidenceTables,
  normalizeExplicitPages,
} from '../scripts/vibration-stage5c-document-evidence-client.mjs';

const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;

function source() {
  return {
    schema: 'SourceIdentity.v1',
    sourceId: 'source:fixture',
    sha256: SOURCE_HASH,
    mediaType: 'application/pdf',
    sizeBytes: 123,
    logicalPath: '/Common/controlled.pdf',
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('explicit pages are required, unique, positive and sorted', () => {
  assert.deepEqual(normalizeExplicitPages([7, 2]), [2, 7]);
  assert.throws(() => normalizeExplicitPages([]), /EXPLICIT_PAGES_REQUIRED/u);
  assert.throws(() => normalizeExplicitPages([0]), /PAGE_INVALID/u);
  assert.throws(() => normalizeExplicitPages([2, 2]), /PAGE_DUPLICATE/u);
});

test('discovery is advisory and binds SourceIdentity.v1', async () => {
  let request;
  const result = await discoverDocumentEvidenceTables({
    sourcePath: '/Common/controlled.pdf',
    fetchImpl: async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return response({
        schema: 'DocumentEvidenceTableDiscovery.v1',
        sourceHash: SOURCE_HASH,
        source: source(),
        candidates: [{ candidateId: 'c1', page: 2 }],
        diagnostics: [],
      });
    },
  });
  assert.equal(request.url, 'http://127.0.0.1:8765/v2/tables/discover');
  assert.deepEqual(request.body, { sourcePath: '/Common/controlled.pdf' });
  assert.equal(result.source.sha256, SOURCE_HASH);
  assert.equal(result.candidates[0].page, 2);
});

test('extraction sends exact source hash and explicit sorted pages', async () => {
  let request;
  const result = await extractDocumentEvidenceTables({
    sourcePath: '/Common/controlled.pdf',
    sourceHash: SOURCE_HASH,
    pages: [7, 2],
    fetchImpl: async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return response({
        schema: 'DocumentEvidenceTableExtraction.v1',
        sourceHash: SOURCE_HASH,
        source: source(),
        pages: [2, 7],
        tables: [],
        diagnostics: [],
        options: { ocr: 'never', ocrLanguage: 'eng' },
      });
    },
  });
  assert.equal(request.url, 'http://127.0.0.1:8765/v2/tables/extract');
  assert.equal(request.body.sourceHash, SOURCE_HASH);
  assert.deepEqual(request.body.pages, [2, 7]);
  assert.deepEqual(result.pages, [2, 7]);
});

test('source or page drift fails closed', async () => {
  await assert.rejects(
    extractDocumentEvidenceTables({
      sourcePath: '/Common/controlled.pdf',
      sourceHash: SOURCE_HASH,
      pages: [2],
      fetchImpl: async () => response({
        schema: 'DocumentEvidenceTableExtraction.v1',
        sourceHash: `sha256:${'b'.repeat(64)}`,
        source: source(),
        pages: [2], tables: [], diagnostics: [], options: { ocr: 'never', ocrLanguage: 'eng' },
      }),
    }),
    /SOURCE_SHA256_MISMATCH/u,
  );
  await assert.rejects(
    extractDocumentEvidenceTables({
      sourcePath: '/Common/controlled.pdf',
      sourceHash: SOURCE_HASH,
      pages: [2],
      fetchImpl: async () => response({
        schema: 'DocumentEvidenceTableExtraction.v1',
        sourceHash: SOURCE_HASH,
        source: source(),
        pages: [3], tables: [], diagnostics: [], options: { ocr: 'never', ocrLanguage: 'eng' },
      }),
    }),
    /PAGE_MISMATCH/u,
  );
});

test('generic evidence authority leakage is rejected', async () => {
  await assert.rejects(
    discoverDocumentEvidenceTables({
      sourcePath: '/Common/controlled.pdf',
      fetchImpl: async () => response({
        schema: 'DocumentEvidenceTableDiscovery.v1',
        sourceHash: SOURCE_HASH,
        source: source(),
        candidates: [], diagnostics: [],
        engineeringAuthority: 'SCREENING',
      }),
    }),
    /GENERIC_AUTHORITY_FIELD_FORBIDDEN/u,
  );
});
