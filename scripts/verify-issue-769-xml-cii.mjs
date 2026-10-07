import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const AUTHORITY_PATH = 'tests/xml-cii-issue-769-release-test-authority.json';

const FOCUSED_CANDIDATES = Object.freeze([
  'tests/xml-cii-linelist-synthetic-label-mapping.test.mjs',
  'tests/xml-cii-linelist-auto-map-integration.test.mjs',
  'tests/xml-cii-issue-781-linelist-integration.test.mjs',
  'tests/xml-cii-master-large-persistence.test.mjs',
  'tests/xml-cii-issue-894-scale-contract.test.mjs',
  'tests/xml-cii-regex-confidence-buckets.test.mjs',
  'tests/xml-cii-issue-781-regex-master-evidence.test.mjs',
  'tests/xml-cii-branch-line-family-suggestion.test.mjs',
  'tests/xml-cii-branch-line-shared-authority-944.test.mjs',
  'tests/xml-cii-branch-line-mixed-integration-945.test.mjs',
  'tests/xml-cii-rigid-weight-lifecycle.test.mjs',
  'tests/xml-cii-issue-821-rigid-weight-eligibility.test.mjs',
  'tests/xml-cii-mode-a-consolidated-rigid-review.test.mjs',
  'tests/xml-cii-mode-a-preview-restoration.test.mjs',
  'tests/xml-cii-b313-preview-blocker-provenance.test.mjs',
  'tests/xml-cii-b313-preview-blocker-ui-static.test.mjs',
  'tests/xml-cii-issue-781-b313-auto-basis.test.mjs',
  'tests/xml-cii-master-dataset-startup-hydration.test.mjs',
  'tests/xml-cii-master-dataset-rollback-custody.test.mjs',
  'tests/xml-cii-issue-881-per-master-restore-isolation.test.mjs',
  'tests/xml-cii-issue-882-session-precedence.test.mjs',
  'tests/xml-cii-issue-883-restore-failure-identity.test.mjs',
  'tests/xml-cii-issue-875-persistence-status-retry.test.mjs',
  'tests/xml-cii-source-schema-authority-guards.test.mjs',
  'tests/xml-cii-issue-776-deployment-parity.test.mjs',
  'tests/xml-cii-output-run-metadata-readiness.test.mjs',
  'tests/xml-cii-issue-781-auto-authority-followup.test.mjs',
  'tests/xml-cii-issue-781-postmerge-screenshot-repair.test.mjs',
  'tests/xml-cii-authority-migration.test.mjs',
  'tests/xml-cii-pr340-review-regressions.test.mjs',
]);

const COVERAGE_WITNESSES = Object.freeze({
  lineList: [
    'tests/xml-cii-linelist-auto-map-integration.test.mjs',
    'tests/xml-cii-issue-781-linelist-integration.test.mjs',
  ],
  branchLine: [
    'tests/xml-cii-branch-line-shared-authority-944.test.mjs',
    'tests/xml-cii-branch-line-mixed-integration-945.test.mjs',
  ],
  empiricalWeight: [
    'tests/xml-cii-rigid-weight-lifecycle.test.mjs',
    'tests/xml-cii-issue-821-rigid-weight-eligibility.test.mjs',
  ],
  b313: [
    'tests/xml-cii-b313-preview-blocker-provenance.test.mjs',
    'tests/xml-cii-issue-781-b313-auto-basis.test.mjs',
  ],
  largeMaster: [
    'tests/xml-cii-master-large-persistence.test.mjs',
    'tests/xml-cii-issue-894-scale-contract.test.mjs',
  ],
  persistence: [
    'tests/xml-cii-issue-881-per-master-restore-isolation.test.mjs',
    'tests/xml-cii-issue-882-session-precedence.test.mjs',
    'tests/xml-cii-issue-883-restore-failure-identity.test.mjs',
    'tests/xml-cii-issue-875-persistence-status-retry.test.mjs',
  ],
  sourceWorkflowParity: [
    'tests/xml-cii-source-schema-authority-guards.test.mjs',
    'tests/xml-cii-issue-776-deployment-parity.test.mjs',
    'tests/xml-cii-output-run-metadata-readiness.test.mjs',
  ],
  finalAuthority: [
    'tests/xml-cii-issue-781-auto-authority-followup.test.mjs',
    'tests/xml-cii-branch-line-mixed-integration-945.test.mjs',
  ],
});

function authorityManifest() {
  if (!existsSync(AUTHORITY_PATH)) throw new Error('Qualification authority missing: ' + AUTHORITY_PATH);
  const parsed = JSON.parse(readFileSync(AUTHORITY_PATH, 'utf8'));
  if (parsed?.schema !== 'xml-cii-issue-769-release-test-authority/v1') {
    throw new Error('Unsupported release-test authority schema: ' + (parsed?.schema || '<missing>'));
  }
  if (parsed?.policy?.defaultXmlCiiRole !== 'RELEASE_GUARD') {
    throw new Error('Release-test authority must remain fail-closed with RELEASE_GUARD as the XML-CII default.');
  }
  return parsed;
}

function allXmlCiiTests() {
  return readdirSync('tests')
    .filter((name) => /^xml-cii-.*\.test\.(?:mjs|js)$/i.test(name))
    .map((name) => 'tests/' + name)
    .sort();
}

function unique(values) {
  return [...new Set(values)];
}

function requireFiles(files) {
  const missing = files.filter((file) => !existsSync(file));
  if (missing.length) throw new Error('Qualification inputs missing:\n' + missing.join('\n'));
  return files;
}

function resolvedRole(manifest, file) {
  return manifest.fileDispositions?.[file]?.role || manifest.policy.defaultXmlCiiRole;
}

function releaseGuardFiles(manifest) {
  return allXmlCiiTests().filter((file) => resolvedRole(manifest, file) === 'RELEASE_GUARD');
}

function assertCoverage(manifest, selected) {
  const selectedSet = new Set(selected);
  for (const [claim, witnesses] of Object.entries(COVERAGE_WITNESSES)) {
    for (const witness of witnesses) {
      if (!existsSync(witness)) throw new Error('Coverage witness missing for ' + claim + ': ' + witness);
      if (resolvedRole(manifest, witness) !== 'RELEASE_GUARD') {
        throw new Error('Coverage witness is not a RELEASE_GUARD for ' + claim + ': ' + witness);
      }
      if (!selectedSet.has(witness)) {
        throw new Error('Selected suite lost required ' + claim + ' witness: ' + witness);
      }
    }
  }
}

function regexEscape(value) {
  return String(value).replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
}

function executionPlan(manifest, full) {
  const release = releaseGuardFiles(manifest);
  const selected = full
    ? release
    : unique(FOCUSED_CANDIDATES).filter((file) => resolvedRole(manifest, file) === 'RELEASE_GUARD');

  requireFiles(selected);
  assertCoverage(manifest, selected);

  const caseDispositions = manifest.testNameDispositions || {};
  const special = [];
  const ordinary = [];

  for (const file of selected) {
    const cases = Object.keys(caseDispositions[file] || {});
    if (cases.length) {
      special.push({
        file,
        skipNames: cases,
        skipPattern: cases.map(regexEscape).join('|'),
      });
    } else {
      ordinary.push(file);
    }
  }

  return {
    mode: full ? 'full' : 'focused',
    selected,
    ordinary,
    special,
    inventoryCount: allXmlCiiTests().length,
    releaseGuardCount: release.length,
    excluded: allXmlCiiTests()
      .filter((file) => resolvedRole(manifest, file) !== 'RELEASE_GUARD')
      .map((file) => ({ file, role: resolvedRole(manifest, file) })),
    external: Object.entries(manifest.externalGuards || {})
      .map(([file, entry]) => ({ file, role: entry.role })),
    coverage: COVERAGE_WITNESSES,
  };
}

function runNodeTests(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: resolve('.'),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  return Number.isInteger(result.status) ? result.status : 1;
}

const manifest = authorityManifest();
const full = process.argv.includes('--full');
const plan = executionPlan(manifest, full);

if (process.argv.includes('--plan-json')) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

console.log(
  '[issue-769] mode=' + plan.mode
  + ' inventory=' + plan.inventoryCount
  + ' release-guards=' + plan.releaseGuardCount
  + ' selected=' + plan.selected.length,
);
for (const row of plan.excluded) console.log('[issue-769] non-blocking ' + row.role + ' ' + row.file);
for (const row of plan.external) console.log('[issue-769] external ' + row.role + ' ' + row.file);
for (const file of plan.ordinary) console.log('[issue-769] release-guard ' + file);
for (const row of plan.special) {
  console.log('[issue-769] release-guard ' + row.file + ' skip=' + row.skipNames.join(' || '));
}

let status = 0;
if (plan.ordinary.length) {
  status = runNodeTests(['--test', ...plan.ordinary]);
}
for (const row of plan.special) {
  const caseStatus = runNodeTests(['--test', '--test-skip-pattern=' + row.skipPattern, row.file]);
  if (caseStatus !== 0) status = caseStatus;
}

process.exitCode = status;
