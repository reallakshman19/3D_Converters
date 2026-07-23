/**
 * Runs the current real/simulated node-history evidence bases and builds one
 * deterministic, explicitly unapproved closure candidate.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import {
  buildNodeHistoryClosureCandidate,
} from '../node-history/closure/node-history-closure-candidate.js';
import {
  buildNodeHistoryLifecyclePolicy,
} from '../node-history/closure/node-history-lifecycle-policy.js';

const REAL_TEST = ['node', ['--test', 'tests/node-history-registry-bootstrap-asim-1885.test.mjs']];
const MATCHER_TEST = ['node', ['--test', 'tests/node-history-registered-global-matcher.test.mjs']];
const PSI_BLOCKER = ['node', [
  'tests/fixtures/topo-enriched-xml/cii2019-proof/generate-remediation-production-result.mjs',
  'CANONICAL',
  'CLEAN',
]];

export async function collectNodeHistoryClosureArtifacts(input) {
  const root = resolve(required(input.root, 'root'));
  runPassing(root, REAL_TEST, input.echoOutput);
  runPassing(root, MATCHER_TEST, input.echoOutput);
  const psiBlocker = runExpectedPsiBlocker(root);
  const policy = await buildNodeHistoryLifecyclePolicy({
    policyVersion: required(input.policyVersion, 'policyVersion'),
    configVersion: required(input.configVersion, 'configVersion'),
  });
  const candidate = await buildCandidate({
    root,
    policy,
    baselineRevision: required(input.baselineRevision, 'baselineRevision'),
    evaluatedAt: required(input.evaluatedAt, 'evaluatedAt'),
    psiBlocker,
  });
  return Object.freeze({ policy, candidate });
}

async function buildCandidate(context) {
  const benchmarks = [
    realBootstrapBenchmark(context.root),
    simulatedMatcherBenchmark(context.root),
    blockedPsiBenchmark(context.root, context.psiBlocker),
  ];
  return buildNodeHistoryClosureCandidate({
    candidateId: 'ASIM-1885-NODE-HISTORY-CLOSURE-CANDIDATE-001',
    evidenceBaselineRevision: context.baselineRevision,
    projectId: 'ASIM-1885',
    zoneId: 'ZONE-1885-NC',
    lifecyclePolicyHash: context.policy.lifecyclePolicyHash,
    requestedMode: 'HISTORY_DRY_RUN',
    decisionStatement: {
      decisionId: 'NODE_HISTORY_GROUNDWORK-001',
      statement: 'Permit evidence collection in HISTORY_DRY_RUN only; retain the current production authority.',
      contractImpact: [
        'NodeHistoryLifecyclePolicy.v1',
        'NodeHistoryClosureCandidate.v1',
        'NodeHistoryModeDecision.v1',
      ],
    },
    benchmarks,
    downstreamComparison: {
      status: 'NOT_EVALUATED',
      basis: '[SIMULATED]',
      summary: 'No approved second real project or release-selected PSI/CII comparison is available.',
    },
    closureGates: closureGates(),
    approval: {
      status: 'UNAPPROVED',
      approvalRecordId: null,
      approvers: [],
      approvedAt: null,
      approvalRecordHash: null,
    },
    evaluatedAt: context.evaluatedAt,
  });
}

function realBootstrapBenchmark(root) {
  const approved = 'node-history/bootstrap/approved/ASIM-1885/ZONE-1885-NC';
  const manifest = readJson(root, `${approved}/manifest.json`);
  const result = readJson(root, `${approved}/bootstrap-result.json`);
  assert(manifest.validation?.status === 'PASS', 'ASIM-1885 registry manifest is not PASS.');
  assert(result.validation?.status === 'PASS', 'ASIM-1885 bootstrap result is not PASS.');
  return {
    benchmarkId: 'REAL-ASIM-1885-REGISTRY-BOOTSTRAP',
    basis: 'REAL_PROJECT',
    command: 'node --test tests/node-history-registry-bootstrap-asim-1885.test.mjs',
    status: 'PASS',
    positiveResult: 'PASS',
    negativeResult: 'PASS',
    determinismResult: 'PASS',
    metrics: {
      canonicalNodeCount: 3926,
      lineHistoryCount: manifest.lineHistories.length,
      registrySnapshotHash: manifest.registrySnapshotHash,
      bootstrapResultHash: result.bootstrapResultHash,
    },
    artifactHashes: hashFiles(root, [
      'Benchmarks/1885_NC/1885_NC.json',
      `${approved}/manifest.json`,
      `${approved}/zone-registry.json`,
      `${approved}/bootstrap-result.json`,
      'tests/node-history-registry-bootstrap-asim-1885.test.mjs',
    ]),
  };
}

function simulatedMatcherBenchmark(root) {
  return {
    benchmarkId: 'SIMULATED-REGISTERED-GLOBAL-MATCHER',
    basis: '[SIMULATED]',
    command: 'node --test tests/node-history-registered-global-matcher.test.mjs',
    status: 'PASS',
    positiveResult: 'PASS',
    negativeResult: 'PASS',
    determinismResult: 'PASS',
    metrics: {
      realProjectCalibrationCount: 0,
      productionAuthorityChanged: false,
    },
    artifactHashes: hashFiles(root, [
      'node-history/matching/registered-global-matcher.js',
      'node-history/matching/registered-coordinate-evidence.js',
      'tests/node-history-registered-global-matcher.test.mjs',
      'tests/fixtures/node-history/registered-global/global-matrix.json',
    ]),
  };
}

function blockedPsiBenchmark(root, blockerCodes) {
  return {
    benchmarkId: 'SIMULATED-PSI-CII-CLOSURE-PROOF',
    basis: '[SIMULATED]',
    command: PSI_BLOCKER.flat().join(' '),
    status: 'BLOCKED',
    positiveResult: 'BLOCKED',
    negativeResult: 'NOT_EVALUATED',
    determinismResult: 'NOT_EVALUATED',
    metrics: {
      realProjectRunCount: 0,
      productionAuthorityChanged: false,
    },
    blockerCodes,
    artifactHashes: hashFiles(root, [
      'tests/fixtures/topo-enriched-xml/production/production-fixture.mjs',
      'tests/fixtures/topo-enriched-xml/cii2019-proof/generate-remediation-production-result.mjs',
      'tests/test_topo_enriched_xml_cii2019_proof.py',
      'tests/test_topo_enriched_xml_cii2019_adversarial.py',
    ]),
  };
}

function closureGates() {
  return [
    gate('EG-01', 'Shared PSI-node serialization', 'BLOCKED',
      'The simulated PSI/CII remediation fixture blocks before proof execution.', ['SIMULATED-PSI-CII-CLOSURE-PROOF']),
    gate('EG-02', 'Historical stability vs. monotonic numbering', 'REVIEW_REQUIRED',
      'The real bootstrap is all-new and does not prove retained-number mutation behavior.', ['REAL-ASIM-1885-REGISTRY-BOOTSTRAP']),
    gate('EG-03', 'Historical matcher score calibration', 'BLOCKED',
      'Registered matching has no approved real-project calibration corpus.', ['SIMULATED-REGISTERED-GLOBAL-MATCHER']),
    gate('EG-04', 'Non-contiguous line leases', 'NOT_EVALUATED',
      'Deferred until a real project requires non-contiguous leases.', []),
    gate('EG-05', 'Inline audit extension profile', 'REVIEW_REQUIRED',
      'The ADR exists, but no approved closure packet is bound here.', []),
    gate('EG-06', 'Split/merge/rename/zone-transfer automation', 'PASS',
      'Automation remains disabled; this groundwork adds no transformation fallback.', []),
    gate('EG-07', 'Coordinate registration calibration', 'BLOCKED',
      'No approved real-project anchor/residual calibration corpus is available.', ['SIMULATED-REGISTERED-GLOBAL-MATCHER']),
    gate('EG-08', 'Support attachment ownership', 'REVIEW_REQUIRED',
      'No approved ASIM-1885 downstream support-mapping closure packet is bound here.', []),
  ];
}

function gate(gateId, decision, status, reason, evidenceBenchmarkIds) {
  return { gateId, decision, status, reason, evidenceBenchmarkIds };
}

function runPassing(root, command, echoOutput) {
  const [executable, args] = command;
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (echoOutput === true) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.status !== 0) throw new Error(`${executable} ${args.join(' ')} failed with exit ${result.status}.`);
}

function runExpectedPsiBlocker(root) {
  const [executable, args] = PSI_BLOCKER;
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const codes = ['NODE_PLAN_BUILD_BLOCKED', 'LOGICAL_NODE_MAPPING_MISSING'];
  if (result.status === 0 || !codes.every((code) => output.includes(code))) {
    throw new Error('The expected PSI/CII closure blocker changed; regenerate evidence after investigation.');
  }
  return codes;
}

function hashFiles(root, paths) {
  return [...paths].sort().map((path) => ({
    path: portable(relative(root, join(root, path))),
    sha256: sha256(readFileSync(join(root, path))),
  }));
}

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function portable(path) {
  return path.split(sep).join('/');
}

function required(value, field) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${field} is required.`);
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
