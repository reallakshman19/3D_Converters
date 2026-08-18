import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { buildStandaloneDtxrResolutionLedger } from '../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';
import { decorateJsonTraceLedger } from '../tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XML_PATH = path.join(ROOT, 'Benchmarks', 'css', 'SYS-0010.xml');
const ZIP_PATH = path.join(ROOT, 'Benchmarks', 'css', 'css3_managed_stage.zip');
const EXPECTED_XML_BLOB = '1c6e2d817c9488839d1743da46927e8e104fa824';
const EXPECTED_ZIP_BLOB = '86da3f48cb53b7cb7f3520072edcf0d3ed0d1806';

function gitBlobSha(buffer) {
  return createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length}\0`))
    .update(buffer)
    .digest('hex');
}

function pythonCommand() {
  for (const name of ['python3', 'python']) {
    try {
      execFileSync(name, ['--version'], { stdio: 'ignore' });
      return name;
    } catch {}
  }
  throw new Error('Python is required to read the pinned managed-stage ZIP fixture.');
}

function managedStageText() {
  const script = [
    'import sys, zipfile',
    'p=sys.argv[1]',
    'z=zipfile.ZipFile(p)',
    "names=[n for n in z.namelist() if n.lower().endswith('.json')]",
    "assert len(names)==1, f'expected one JSON in managed-stage ZIP, got {names}'",
    "sys.stdout.write(z.read(names[0]).decode('utf-8-sig'))",
  ].join(';');
  return execFileSync(pythonCommand(), ['-c', script, ZIP_PATH], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function node140Record(xmlText, stagedJsonText) {
  const raw = buildStandaloneDtxrResolutionLedger(xmlText, stagedJsonText, {
    resolverJsonTrace: { coordinateTolerance: 6 },
  });
  const decorated = decorateJsonTraceLedger(raw, {
    captureFields: ['DTXR', 'SPRE', 'SPREF', 'MDSSUPPTYPE', 'NAME', 'CMPSUPGAP'],
  });
  return {
    result: decorated,
    record: decorated.records.find((row) => String(row.nodeNumber || row.xmlNodeNumber) === '140'),
  };
}

test('SYS-0010 and css3 managed-stage fixtures remain byte-identical to commit 432c87e', () => {
  assert.equal(gitBlobSha(readFileSync(XML_PATH)), EXPECTED_XML_BLOB);
  assert.equal(gitBlobSha(readFileSync(ZIP_PATH)), EXPECTED_ZIP_BLOB);
});

test('SYS-0010 Node 140 / SL-1847103.2.1 retains the 35 mm line-stop evidence in its position ledger', () => {
  const xmlText = readFileSync(XML_PATH, 'utf8');
  const stagedJsonText = managedStageText();
  const { result, record } = node140Record(xmlText, stagedJsonText);
  assert.ok(record, 'Node 140 ledger record must exist');

  const summary = {
    status: record.status,
    matchType: record.matchType,
    effectiveSource: record.effectiveSource,
    xmlNodeName: record.xmlNodeName,
    xmlPoint: record.xmlPoint,
    matchedPosition: record.matchedPosition,
    distanceMm: record.distanceMm,
    calibration: result.calibration,
    derivedSupportTypes: record.derivedSupportTypes,
    positionMembers: (record.positionMembers || []).map((member) => ({
      name: member.name,
      type: member.type,
      point: member.point,
      cmpSupGap: member.cmpSupGap,
      capturedFields: member.capturedFields,
      sourcePath: member.sourcePath,
    })),
  };

  const lineStop = (record.positionMembers || []).find((member) => {
    const code = String(member?.capturedFields?.MDSSUPPTYPE || '').toUpperCase();
    return code.startsWith('ST');
  });
  if (!lineStop || !/35\s*mm/i.test(String(lineStop.cmpSupGap || lineStop?.capturedFields?.CMPSUPGAP || ''))) {
    console.error('NODE140_LEDGER_DIAGNOSTIC=' + JSON.stringify(summary));
  }

  assert.ok(lineStop, 'Node 140 position group must contain its ST/line-stop member');
  assert.match(String(lineStop.cmpSupGap || lineStop.capturedFields?.CMPSUPGAP || ''), /35\s*mm/i);
});
