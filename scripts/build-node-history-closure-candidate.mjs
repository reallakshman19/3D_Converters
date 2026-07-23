#!/usr/bin/env node
/**
 * Generates the deterministic lifecycle policy and unapproved closure candidate.
 * All timestamps and evidence revisions are explicit command inputs.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { serializeNodeHistoryArtifact } from '../node-history/closure/node-history-lifecycle-policy.js';
import { collectNodeHistoryClosureArtifacts } from './node-history-closure-evidence.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const POLICY_PATH = resolve(ROOT, 'node-history/closure/policies/default-policy.v1.json');
const CANDIDATE_PATH = resolve(ROOT, 'node-history/closure/candidates/ASIM-1885/ZONE-1885-NC/closure-candidate.json');

const artifacts = await collectNodeHistoryClosureArtifacts({
  root: ROOT,
  policyVersion: '1.0.0',
  configVersion: 'NODE-HISTORY-LIFECYCLE-2026-07',
  baselineRevision: '6b91a9618d3fd03c4f87947b76f44c423816a209',
  evaluatedAt: '2026-07-23T06:00:00Z',
  echoOutput: true,
});

writeArtifact(POLICY_PATH, artifacts.policy);
writeArtifact(CANDIDATE_PATH, artifacts.candidate);
process.stdout.write(`Wrote ${POLICY_PATH}\nWrote ${CANDIDATE_PATH}\n`);

function writeArtifact(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, serializeNodeHistoryArtifact(value), 'utf8');
}
