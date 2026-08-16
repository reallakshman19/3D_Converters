import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertExpectedControlledPdf,
  buildVibrationMasterSourceExtractionManifest,
  extractPdfText,
} from '../scripts/extract-vibration-master-source.mjs';
import { locateT29ControlledSource } from '../scripts/locate-vibration-t29-controlled-source.mjs';

const RUN_IN_CI = process.env.GITHUB_ACTIONS === 'true';
const SOURCE = Object.freeze({
  repository: 'reallaksh19/Common',
  commit: 'fb549185b9b27edc2379734240320a85c5bef9f6',
  path: 'EI - AVIFF Guidelines 2nd Edition.pdf',
  gitBlobSha1: 'sha1:9d3eccc56429411e17c07a579bdebbd13cb0bdc5',
  sizeBytes: 10348594,
});
const RAW_URL = `https://raw.githubusercontent.com/${SOURCE.repository}/${SOURCE.commit}/${encodeURIComponent(SOURCE.path).replaceAll('%2F', '/')}`;
const REQUEST_PATH = resolve('ValidationRecords/VibrationMasters/t29-pf01-source-extraction-request-v1.json');
const REGISTER_PATH = resolve('docs/Masters/Vibration/source-register.json');

function assertPdftotext() {
  const probe = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
  if (probe.error?.code === 'ENOENT') throw new Error('T29_PDFTOTEXT_ENVIRONMENT_BLOCKED');
  if (probe.status !== 0) throw new Error(`T29_PDFTOTEXT_UNAVAILABLE: ${probe.stderr || probe.stdout}`);
}

function boundedReviewLines(extraction, pages) {
  const selected = new Set(pages);
  const pattern = /(T2\.9|cavitation|flashing|pressure\s+recovery|recovery\s+factor|\bF\s*L\b|\bP1\b|\bP2\b|\bPv\b|0\.96|\bsigma\b|σ|\bKc\b|\bLOF\b)/iu;
  const rows = [];
  for (const page of extraction.pages) {
    if (!selected.has(page.pdfPageNumber)) continue;
    page.text.split(/\r?\n/u).forEach((line, index) => {
      const text = line.trim().replace(/\s+/gu, ' ');
      if (!text || !pattern.test(text)) return;
      rows.push({ page: page.pdfPageNumber, line: index + 1, text: text.slice(0, 240) });
    });
  }
  return rows.slice(0, 40);
}

test('T2.9 exact controlled source can be located and provisionally extracted in trusted CI', {
  skip: !RUN_IN_CI,
  timeout: 120_000,
}, async () => {
  assertPdftotext();
  const response = await fetch(RAW_URL, { redirect: 'follow' });
  assert.equal(response.ok, true, `controlled source download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const identity = assertExpectedControlledPdf(bytes, SOURCE);
  assert.equal(identity.gitBlobSha1, SOURCE.gitBlobSha1);
  assert.equal(identity.sizeBytes, SOURCE.sizeBytes);

  const temp = mkdtempSync(join(tmpdir(), 't29-controlled-source-'));
  try {
    const pdf = join(temp, 'ei-aviff-2e.pdf');
    writeFileSync(pdf, bytes);
    const locator = locateT29ControlledSource(pdf, REGISTER_PATH);
    assert.equal(locator.schema, 'T29ControlledSourceLocator.v1');
    assert.equal(locator.source.gitBlobSha1, SOURCE.gitBlobSha1);
    assert.ok(locator.navigationCandidates.length > 0);
    console.log(`T29_CONTROLLED_LOCATOR=${JSON.stringify(locator)}`);

    const request = JSON.parse(readFileSync(REQUEST_PATH, 'utf8'));
    const register = JSON.parse(readFileSync(REGISTER_PATH, 'utf8'));
    const extraction = extractPdfText(pdf);
    console.log(`T29_REVIEW_LINES=${JSON.stringify(boundedReviewLines(extraction, request.pdfPages))}`);
    const manifest = buildVibrationMasterSourceExtractionManifest(bytes, register, request, extraction);
    assert.equal(manifest.schema, 'VibrationMasterSourceExtraction.v1');
    assert.equal(manifest.masterId, 'EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1');
    assert.equal(manifest.source.gitBlobSha1, SOURCE.gitBlobSha1);
    assert.deepEqual(manifest.locator.pdfPages, request.pdfPages);
    assert.equal(manifest.authority.masterValuesPublished, false);
    assert.equal(manifest.authority.screeningAuthority, 'NOT_AUTHORIZED');
    console.log(`T29_CONTROLLED_EXTRACTION=${JSON.stringify(manifest)}`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
