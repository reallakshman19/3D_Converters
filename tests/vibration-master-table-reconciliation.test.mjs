import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { convertVibrationMasterSelections } from '../scripts/fetch-vibration-master-sections-via-api.mjs';
import {
  VIBRATION_MASTER_TABLE_CANDIDATE_SCHEMA,
  VIBRATION_MASTER_TABLE_MASTER_IDS,
  parseRecordTables,
  reconcileVibrationMasterTables,
} from '../scripts/reconcile-vibration-master-tables.mjs';

const BLOB = '9d3eccc56429411e17c07a579bdebbd13cb0bdc5';
const MASTER = 'EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1';
const SOURCE_SHA = `sha256:${'a'.repeat(64)}`;
const digest = (text) => `sha256:${createHash('sha256').update(text).digest('hex')}`;
const block = (id, cells = 1) => ({ blockId: id, kind: 'table', provenance: { page: 81 }, rows: [[...Array(cells)].map(() => ({ provenance: { page: 81 } }))] });
const decision = (id, renderer = 'records') => ({ blockId: id, requestedMode: 'records', renderer, classification: 'SIMPLE' });

function fixture(markdown, { blocks = [block('t1')], decisions = [decision('t1')], selection = {}, conversion = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vib-table-'));
  const selected = { masterId: MASTER, start: 81, end: 81, ...selection };
  const stem = selected.selectionId || selected.masterId;
  fs.writeFileSync(path.join(dir, `${stem}.md`), markdown);
  fs.writeFileSync(path.join(dir, `${stem}.evidence.json`), JSON.stringify({ sourceGitBlobSha: BLOB, blocks, tableRendering: decisions }));
  return {
    dir, selected,
    manifest: { schema: 'VibrationMasterApiConversion.v1', conversions: [{
      masterId: selected.masterId, selectionId: selected.selectionId ?? null,
      pageRange: { start: selected.start, end: selected.end, count: 1 }, sourceSha256: SOURCE_SHA,
      sourceGitBlobSha: BLOB, requestHash: `sha256:${'b'.repeat(64)}`,
      markdownSha256: digest(markdown), converterOptionsHash: `sha256:${'c'.repeat(64)}`, ...conversion,
    }] },
  };
}

function candidate(fx, selection = fx.selected) {
  return reconcileVibrationMasterTables({ selections: [selection], conversionManifest: fx.manifest, reviewDir: fx.dir }).candidates[0];
}

test('catalogue is table-only and includes P0 EI table families', () => {
  assert(VIBRATION_MASTER_TABLE_MASTER_IDS.includes(MASTER));
  assert(VIBRATION_MASTER_TABLE_MASTER_IDS.includes('EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1'));
  assert.equal(VIBRATION_MASTER_TABLE_MASTER_IDS.some((id) => id.includes('FIGURE_T3')), false);
});

test('records parser preserves exact strings', () => {
  const parsed = parseRecordTables('**Row 1**\n- C1: 001.250\n- C2: alpha\n');
  assert.deepEqual(parsed[0].rows[0].cells, [{ coordinate: 'C1', value: '001.250' }, { coordinate: 'C2', value: 'alpha' }]);
});

test('unique records table becomes frozen-authority review candidate', () => {
  const fx = fixture('**Row 1**\n- C1: alpha\n');
  try {
    const value = candidate(fx);
    assert.equal(value.sourceState, 'TABLE_CANDIDATE_RECOVERED');
    assert.equal(value.rows[0].cells[0].value, 'alpha');
    assert.equal(value.semanticNormalizationApplied, false);
    assert.deepEqual(value.authority, { engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false });
    assert.equal(VIBRATION_MASTER_TABLE_CANDIDATE_SCHEMA, 'VibrationMasterTableCandidates.v1');
  } finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
});

test('ambiguous table range requires explicit tableBlockId', () => {
  const fx = fixture('**Row 1**\n- C1: A\n\n**Row 1**\n- C1: B\n', { blocks: [block('t1'), block('t2')], decisions: [decision('t1'), decision('t2')] });
  try {
    assert.equal(candidate(fx).reason, 'MULTIPLE_RECORD_TABLES_REQUIRE_TABLE_BLOCK_ID');
    assert.equal(candidate(fx, { ...fx.selected, tableBlockId: 't2' }).rows[0].cells[0].value, 'B');
  } finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
});

test('non-record renderer and structure mismatch fail closed', () => {
  const html = fixture('<table></table>\n', { decisions: [decision('t1', 'html')], selection: { tableBlockId: 't1' } });
  const mismatch = fixture('**Row 1**\n- C1: A\n- C2: B\n');
  try {
    assert.equal(candidate(html).reason, 'TABLE_RENDERER_NOT_RECORDS');
    assert.throws(() => candidate(mismatch), /CELL_COUNT_MISMATCH/u);
  } finally {
    fs.rmSync(html.dir, { recursive: true, force: true });
    fs.rmSync(mismatch.dir, { recursive: true, force: true });
  }
});

test('wrong blob or changed Markdown hard-fails', () => {
  const fx = fixture('**Row 1**\n- C1: A\n');
  try {
    fx.manifest.conversions[0].sourceGitBlobSha = '0'.repeat(40);
    assert.throws(() => candidate(fx), /GIT_BLOB_MISMATCH/u);
    fx.manifest.conversions[0].sourceGitBlobSha = BLOB;
    fs.appendFileSync(path.join(fx.dir, `${MASTER}.md`), '\n');
    assert.throws(() => candidate(fx), /MARKDOWN_HASH_MISMATCH/u);
  } finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
});

test('API bridge saves byte-exact Markdown and selectionId for reconciliation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vib-api-table-'));
  const markdown = '**Row 1**\n- C1: exact\n';
  const selection = { masterId: MASTER, selectionId: 'table-one', start: 81, end: 81 };
  const body = {
    requestHash: `sha256:${'d'.repeat(64)}`, markdownSha256: digest(markdown), converterOptionsHash: `sha256:${'e'.repeat(64)}`, markdown,
    source: { logicalPath: '/Common/EI - AVIFF Guidelines 2nd Edition.pdf', sizeBytes: 10348594, sha256: SOURCE_SHA },
    pageRange: { start: 81, end: 81, count: 1 }, evidence: { sourceGitBlobSha: BLOB, blocks: [block('t1')], tableRendering: [decision('t1')] }, diagnostics: [],
  };
  const fetchImpl = async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const manifest = await convertVibrationMasterSelections({ selections: [selection], reviewDir: dir, fetchImpl, baseUrl: 'http://fixture' });
    const saved = fs.readFileSync(path.join(dir, 'table-one.md'), 'utf8');
    assert.equal(saved, markdown);
    assert.equal(manifest.conversions[0].selectionId, 'table-one');
    assert.equal(reconcileVibrationMasterTables({ selections: [selection], conversionManifest: manifest, reviewDir: dir }).candidates[0].sourceState, 'TABLE_CANDIDATE_RECOVERED');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('package/release wire table gate and curves remain excluded', async () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['reconcile:vibration-master-tables'], 'node scripts/reconcile-vibration-master-tables.mjs');
  const release = await import('../scripts/verify-vibration-fit-release.mjs');
  assert(release.listVibrationFitReleaseTests().includes('tests/vibration-master-table-reconciliation.test.mjs'));
  assert.throws(() => reconcileVibrationMasterTables({ selections: [{ masterId: 'EI_AVIFF.T3.SBC.FIGURE_T3_1.v1', start: 82, end: 82 }], conversionManifest: { schema: 'VibrationMasterApiConversion.v1', conversions: [] }, reviewDir: '.' }), /MASTER_UNSUPPORTED/u);
});
