import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const AUTHORITY_PATH = 'tests/xml-cii-issue-769-release-test-authority.json';
const COVERAGE_GUARD = 'tests/xml-cii-issue-769-release-coverage.test.mjs';
const AUTHORITY_GUARD = 'tests/xml-cii-issue-769-release-test-authority.test.mjs';

const authority = JSON.parse(readFileSync(AUTHORITY_PATH, 'utf8'));

const FOCUSED = Object.freeze([
  AUTHORITY_GUARD,
  COVERAGE_GUARD,
  'tests/xml-cii-linelist-synthetic-label-mapping.test.mjs',
  'tests/xml-cii-linelist-auto-map-integration.test.mjs',
  'tests/xml-cii-master-large-persistence.test.mjs',
  'tests/xml-cii-regex-confidence-buckets.test.mjs',
  'tests/xml-cii-branch-line-family-suggestion.test.mjs',
  'tests/xml-cii-rigid-weight-lifecycle.test.mjs',
  'tests/xml-cii-mode-a-consolidated-rigid-review.test.mjs',
  'tests/xml-cii-standalone-weight-validator-deprecated-ui.test.mjs',
  'tests/xml-cii-b313-preview-blocker-provenance.test.mjs',
  'tests/xml-cii-b313-preview-blocker-ui-static.test.mjs',
  'tests/xml-cii-authority-migration.test.mjs',
  'tests/xml-cii-pr340-review-regressions.test.mjs',
]);

const ESTABLISHED_GUARDS = Object.freeze([
  'tests/xml-cii-smart-ui-integration.test.mjs',
  'tests/xml-cii-smart-ui-preflight.test.mjs',
  'tests/xml-cii-adapted-branch-line-auto-pattern.test.mjs',
  'tests/xml-cii-standalone-source-mode-integration.test.js',
  'tests/xml-cii-standalone-live-smoke.test.js',
]);

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

function roleFor(file) {
  return authority.fileDispositions?.[file]?.role || authority.policy?.defaultXmlCiiRole || 'RELEASE_GUARD';
}

function currentReleaseGuards(files) {
  return files.filter((file) => roleFor(file) === 'RELEASE_GUARD');
}

function regexEscape(value) {
  return String(value).replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
}

function supersededCasePattern() {
  const names = [];
  for (const cases of Object.values(authority.testNameDispositions || {})) {
    for (const [name, entry] of Object.entries(cases || {})) {
      if (entry?.role === 'SUPERSEDED_ACCEPTANCE') names.push(name);
    }
  }
  return unique(names).map(regexEscape).join('|');
}

const full = process.argv.includes('--full');
const discovered = allXmlCiiTests();
const requested = full ? discovered : unique([...FOCUSED, ...ESTABLISHED_GUARDS]);
const files = requireFiles(currentReleaseGuards(requested));
const excluded = requested.filter((file) => roleFor(file) !== 'RELEASE_GUARD');
const skipPattern = supersededCasePattern();

if (!files.includes(AUTHORITY_GUARD) || !files.includes(COVERAGE_GUARD)) {
  throw new Error('Canonical #769 qualification must include authority and coverage audits.');
}

console.log('[issue-769] mode=' + (full ? 'full' : 'focused') + ' release-guards=' + files.length + ' excluded=' + excluded.length);
for (const file of excluded) console.log('[issue-769] non-blocking ' + roleFor(file) + ' ' + file);
for (const file of files) console.log('[issue-769] release-guard ' + file);
if (skipPattern) console.log('[issue-769] superseded-case-pattern=' + skipPattern);

const args = ['--test'];
if (skipPattern) args.push('--test-skip-pattern=' + skipPattern);
args.push(...files);

const result = spawnSync(process.execPath, args, {
  cwd: resolve('.'),
  stdio: 'inherit',
  env: process.env,
});

if (result.error) throw result.error;
process.exitCode = Number.isInteger(result.status) ? result.status : 1;
