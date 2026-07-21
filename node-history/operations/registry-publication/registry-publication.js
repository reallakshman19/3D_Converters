import path from 'node:path';
import { deepFreeze, text } from '../../../contracts/topo-enriched-xml/contract-core.js';
import { issue } from '../../registry/registry-contracts.js';
import {
  PUBLICATION_RESULT_SCHEMA,
  assertArtifactsUnchanged,
  compareCanonical,
  immutableResult,
  normalizeTargetManifest,
  sortIssues,
  validateCommit,
  validateEvaluatedAt,
  validationFrom,
} from '../registry-operations-common.js';
import { buildRecoveryManifest, restoreRegistrySnapshot } from '../registry-recovery/registry-recovery.js';
import { validateApprovedProposal, proposalArtifacts } from './registry-publication-authority.js';
import { createNodeFileSystemAdapter } from './registry-filesystem.js';
import {
  artifactFileHashes,
  materializeRegistrySnapshot,
  readRegistrySnapshot,
} from './registry-snapshot-io.js';
import { buildPublicationPackage } from './registry-publication-package.js';

export async function prepareRegistryPublication(input) {
  const inputsBefore = captureInputs(input), blockers = [];
  const targetManifest = normalizeTargetManifest(input?.targetManifest);
  blockers.push(...targetManifest.blockers);
  const expectedBaseCommit = validateCommit(input?.expectedBaseCommit, 'expectedBaseCommit', blockers);
  const evaluatedAt = validateEvaluatedAt(input?.evaluatedAt, blockers);
  const fileSystem = input?.fileSystem || createNodeFileSystemAdapter();
  let current = null, proposed = null, rollbackProof = emptyRollbackProof();
  try {
    validateRootIsolation(input?.currentRegistryRoot, targetManifest, blockers);
    current = await readCurrent(input, targetManifest, fileSystem, blockers);
    proposed = await validateApprovedProposal({ input, current, targetManifest, blockers });
    const reRead = await materializeAndRead(input, targetManifest, fileSystem, blockers);
    validateMaterialized(proposed, reRead, blockers);
    const recoveryManifest = blockers.length ? null : buildRecoveryManifest({
      currentSnapshot: current, targetManifest, expectedBaseCommit,
    });
    rollbackProof = await proveRollback(recoveryManifest, targetManifest, fileSystem, blockers);
    await verifyLiveRegistry(input, current, targetManifest, fileSystem, blockers);
    const result = blockers.length
      ? await blockedResult({ blockers, current, proposed, rollbackProof, evaluatedAt, targetManifest, fileSystem })
      : passResult({ input, current, proposed: reRead, rollbackProof, recoveryManifest, targetManifest, expectedBaseCommit, evaluatedAt });
    assertArtifactsUnchanged(inputsBefore, captureInputs(input));
    return result;
  } catch (error) {
    blockers.push(issue(error?.code || 'REGISTRY_PUBLICATION_STAGE_FAILED', errorEvidence(error)));
    await cleanupTemporaryRoots(targetManifest, fileSystem);
    assertArtifactsUnchanged(inputsBefore, captureInputs(input));
    return blockedResult({ blockers, current, proposed, rollbackProof, evaluatedAt, targetManifest, fileSystem, cleaned: true });
  }
}

async function readCurrent(input, targetManifest, fileSystem, blockers) {
  const current = await readRegistrySnapshot({ root: input?.currentRegistryRoot, targetManifest, fileSystem });
  if (current.validation.status !== 'PASS') {
    blockers.push(...current.validation.blockers);
    blockers.push(issue('CURRENT_REGISTRY_NOT_PASS', { blockers: current.validation.blockers }));
  }
  const expected = text(input?.expectedCurrentSnapshotHash);
  if (expected !== text(current.snapshotHash)) blockers.push(issue('STALE_CURRENT_REGISTRY_SNAPSHOT', {
    expected, actual: text(current.snapshotHash),
  }));
  return current;
}

async function materializeAndRead(input, targetManifest, fileSystem, blockers) {
  if (blockers.length) return null;
  await materializeRegistrySnapshot({
    root: targetManifest.temporaryRoot,
    targetManifest,
    artifacts: proposalArtifacts(input.bootstrapResult),
    fileSystem,
  });
  return readRegistrySnapshot({ root: targetManifest.temporaryRoot, targetManifest, fileSystem });
}

async function proveRollback(recoveryManifest, targetManifest, fileSystem, blockers) {
  if (!recoveryManifest) return emptyRollbackProof();
  let proof;
  try {
    proof = await restoreRegistrySnapshot({
      recoveryManifest,
      restoreRoot: targetManifest.rollbackProofRoot,
      targetManifest,
      fileSystem,
    });
  } finally {
    await fileSystem.removeTree(targetManifest.rollbackProofRoot);
  }
  if (proof.status !== 'PASS') blockers.push(issue('ROLLBACK_PROOF_NOT_PASS', {
    blockers: proof.validation.blockers,
  }));
  return proof;
}

async function verifyLiveRegistry(input, before, targetManifest, fileSystem, blockers) {
  if (!before) return;
  const after = await readRegistrySnapshot({ root: input.currentRegistryRoot, targetManifest, fileSystem });
  if (after.validation.status !== 'PASS') {
    blockers.push(...after.validation.blockers);
    blockers.push(issue('LIVE_REGISTRY_REREAD_FAILED', { blockers: after.validation.blockers }));
    return;
  }
  if (text(before.snapshotHash) !== text(after.snapshotHash)
    || !compareCanonical(artifactFileHashes(before), artifactFileHashes(after))) blockers.push(issue('LIVE_REGISTRY_MUTATED'));
}

function validateMaterialized(proposed, reRead, blockers) {
  if (!reRead) return;
  if (reRead.validation.status !== 'PASS') {
    blockers.push(...reRead.validation.blockers);
    blockers.push(issue('MATERIALIZED_REGISTRY_NOT_PASS', { blockers: reRead.validation.blockers }));
  }
  if (text(reRead.snapshotHash) !== text(proposed?.snapshotHash)) blockers.push(issue('MATERIALIZED_SNAPSHOT_HASH_MISMATCH', {
    expected: text(proposed?.snapshotHash), actual: text(reRead.snapshotHash),
  }));
  if (!compareCanonical(artifactFileHashes(proposed), artifactFileHashes(reRead))) blockers.push(issue('MATERIALIZED_FILE_HASH_MISMATCH'));
}

function passResult(values) {
  const publishablePackage = buildPublicationPackage({
    currentSnapshot: values.current,
    proposedSnapshot: values.proposed,
    approvedPatch: values.input.approvedPatch,
    bootstrapResult: values.input.bootstrapResult,
    targetManifest: values.targetManifest,
    recoveryManifest: values.recoveryManifest,
    expectedBaseCommit: values.expectedBaseCommit,
    evaluatedAt: values.evaluatedAt,
  });
  return immutableResult({
    schema: PUBLICATION_RESULT_SCHEMA,
    status: 'PASS',
    projectId: text(values.current.zoneRegistry.projectId),
    zoneId: text(values.current.zoneRegistry.zoneId),
    currentSnapshotHash: values.current.snapshotHash,
    patchHash: text(values.input.approvedPatch.proposedRegistryHash),
    proposedSnapshotHash: values.proposed.snapshotHash,
    materializedSnapshotHash: values.proposed.snapshotHash,
    reReadSnapshotHash: values.proposed.snapshotHash,
    publicationPackageHash: publishablePackage.publicationPackageHash,
    publishablePackage,
    acceptedMaterializedRoot: values.targetManifest.temporaryRoot,
    rollbackProof: values.rollbackProof,
    liveRegistryMutated: false,
    validation: validationFrom([]),
    evaluatedAt: values.evaluatedAt,
  });
}

async function blockedResult(values) {
  if (!values.cleaned) await cleanupTemporaryRoots(values.targetManifest, values.fileSystem);
  return immutableResult({
    schema: PUBLICATION_RESULT_SCHEMA,
    status: 'BLOCKED',
    projectId: text(values.current?.zoneRegistry?.projectId),
    zoneId: text(values.current?.zoneRegistry?.zoneId),
    currentSnapshotHash: text(values.current?.snapshotHash),
    patchHash: '',
    proposedSnapshotHash: text(values.proposed?.snapshotHash),
    materializedSnapshotHash: '',
    reReadSnapshotHash: '',
    publicationPackageHash: '',
    publishablePackage: null,
    acceptedMaterializedRoot: null,
    rollbackProof: values.rollbackProof,
    liveRegistryMutated: false,
    validation: validationFrom(sortIssues(values.blockers)),
    evaluatedAt: text(values.evaluatedAt),
  });
}

async function cleanupTemporaryRoots(targetManifest, fileSystem) {
  if (!targetManifest || !fileSystem) return;
  await Promise.allSettled([
    targetManifest.temporaryRoot && fileSystem.removeTree(targetManifest.temporaryRoot),
    targetManifest.rollbackProofRoot && fileSystem.removeTree(targetManifest.rollbackProofRoot),
  ]);
}

function captureInputs(input = {}) {
  return structuredClone({
    currentRegistryRoot: input.currentRegistryRoot,
    approvedPatch: input.approvedPatch,
    bootstrapResult: input.bootstrapResult,
    expectedBaseCommit: input.expectedBaseCommit,
    expectedCurrentSnapshotHash: input.expectedCurrentSnapshotHash,
    targetManifest: input.targetManifest,
    evaluatedAt: input.evaluatedAt,
  });
}

function validateRootIsolation(currentRoot, targetManifest, blockers) {
  const current = text(currentRoot);
  for (const [field, value] of [['temporaryRoot', targetManifest.temporaryRoot], ['rollbackProofRoot', targetManifest.rollbackProofRoot]]) {
    if (current && value && rootsOverlap(current, value)) blockers.push(issue('LIVE_REGISTRY_TEMPORARY_ROOT_OVERLAP', {
      field, currentRegistryRoot: current, value,
    }));
  }
  if (!current) blockers.push(issue('CURRENT_REGISTRY_ROOT_MISSING'));
}

function rootsOverlap(left, right) {
  const first = path.resolve(left), second = path.resolve(right);
  return second === first || second.startsWith(`${first}${path.sep}`) || first.startsWith(`${second}${path.sep}`);
}

function emptyRollbackProof() {
  return deepFreeze({
    status: 'BLOCKED', restoredSnapshotHash: '', restoredFileHashes: [],
    validation: validationFrom([issue('ROLLBACK_NOT_EXECUTED')]),
  });
}

function errorEvidence(error) {
  return { code: text(error?.code), message: text(error?.message), evidence: error?.evidence || {} };
}
