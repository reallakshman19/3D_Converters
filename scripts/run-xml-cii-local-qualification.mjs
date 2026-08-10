#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function run(command, args) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  return {
    command: [command, ...args].join(' '),
    status: result.status,
    signal: result.signal || null,
    durationMs: Date.now() - started,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
    ok: result.status === 0,
  };
}

function gitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function assertLocalActivation() {
  const parity = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js'), 'utf8');
  const invocation = fs.readFileSync(path.join(root, 'converters/xml-cii-2019-standalone/invocation-builder.js'), 'utf8');
  const phase = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js'), 'utf8');
  const modeA = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-mode-a.js'), 'utf8');
  const finalReview = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js'), 'utf8');
  const finalAuthority = fs.readFileSync(path.join(root, 'converters/xml-cii2019-core/final-weight-review-authority.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js'), 'utf8');
  const match1 = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js'), 'utf8');
  const evidence = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-conversion-evidence.js'), 'utf8');
  const required = [
    ['X001 production wrapper', invocation.includes('xml_to_cii2019_coordinate_custody.py')],
    ['X002 staged geometry active', parity.includes('applyXmlCiiStagedGeometryAuthority')],
    ['X002 effective OD active', parity.includes('applyXmlCiiOutsideDiameterResolver')],
    ['X003 mass conservation active', parity.includes('applyXmlCiiSplitRigidWeightPropagation')],
    ['X003 conservation retained', service.includes('normalized.diagnostics.weightConservation')],
    ['X003 Match1 physical identity', match1.includes('migrateMatch1ToPhysicalIdentity') && match1.includes("match1Identity: 'physical-component'")],
    ['X003 Final authority collector active', finalReview.includes('collectXmlCiiFinalWeightReviewRows') && finalAuthority.includes('sourceIdentityRows')],
    ['X003 Final no length exemption', !finalAuthority.includes('lengthMm <= 6') && !finalAuthority.includes('endpointEligible')],
    ['X003 Final physical keys', finalReview.includes("key.startsWith('WPC1::')") && finalReview.includes('rigidWeightFinal')],
    ['X003 run-boundary legacy materialization', adapter.includes('materializeXmlCiiLegacyWeightCompatibility') && adapter.includes('sourceIdFromPhysicalWeightMap')],
    ['X004 Final evidence isolated', evidence.includes("identity: 'physical-component'") && !evidence.includes('const transient = plainObject(config?.overrides?.rigidWeight)')],
    ['X005 ZIP control active', phase.includes('appendXmlCiiEvidenceZipControl(card, stateRef)')],
    ['X005 Mode A scoped source retained', modeA.includes('sourceText: scopedSourceText')],
  ];
  const failed = required.filter(([, ok]) => !ok).map(([label]) => label);
  return { ok: failed.length === 0, checks: required.map(([label, ok]) => ({ label, ok })), failed };
}

const tests = [
  ['X001 route activation', 'node', ['tests/xml-cii-standalone-x001-coordinate-custody.test.js']],
  ['X001 real GLRD coordinate custody', 'python', ['converters/scripts/test_xml_to_cii2019_glrd_coordinate_custody.py']],
  ['X002 real GLRD property authority', 'node', ['tests/xml-cii-x002-property-authority.test.js']],
  ['X003 weight lifecycle/conservation', 'node', ['tests/xml-cii-x003-weight-authority.test.js']],
  ['X003 weight freeze boundaries', 'node', ['tests/xml-cii-x003-weight-freeze-boundaries.test.js']],
  ['X003 split sibling migration', 'node', ['tests/xml-cii-x003-split-sibling-migration.test.js']],
  ['X004 immutable evidence/digests', 'node', ['tests/xml-cii-x004-evidence-snapshots.test.js']],
  ['X005 deterministic evidence ZIP', 'node', ['tests/xml-cii-x005-evidence-zip.test.js']],
  ['X005 Mode A isolated evidence ZIP', 'node', ['tests/xml-cii-x005-mode-a-evidence-zip.test.js']],
];

const activation = assertLocalActivation();
const results = tests.map(([name, command, args]) => ({ name, ...run(command, args) }));
const ok = activation.ok && results.every((item) => item.ok);
const report = {
  schema: 'xml-cii-local-qualification/v1',
  executionPolicy: 'LOCAL_ONLY_NO_WORKFLOW',
  repositoryHead: gitHead(),
  governingBenchmark: 'Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml',
  activation,
  results,
  status: ok ? 'PASS' : 'FAIL',
  remainingQualificationGaps: [
    'This local harness does not by itself prove a deployed browser build/module identity.',
    'Production authorization remains a separate Owner decision after X007/X008.',
  ],
};

const outArg = process.argv.find((arg) => arg.startsWith('--report='));
if (outArg) {
  const output = path.resolve(root, outArg.slice('--report='.length));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
}

for (const item of results) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name} :: ${item.command}`);
  if (item.stdout) console.log(item.stdout);
  if (!item.ok && item.stderr) console.error(item.stderr);
}
console.log(`${activation.ok ? 'PASS' : 'FAIL'} production-path activation checks`);
console.log(`XML/CII local qualification: ${report.status}${report.repositoryHead ? ` @ ${report.repositoryHead}` : ''}`);
process.exitCode = ok ? 0 : 1;
