import { deepFreezeVibrationMaster } from './canonical.js';
import { sealVibrationMaster } from './validate.js';

const PUBLICATION_TRANSITIONS = Object.freeze({
  CANDIDATE: Object.freeze(['ACTIVE', 'RETIRED']),
  ACTIVE: Object.freeze(['RETIRED']),
  RETIRED: Object.freeze([]),
});

function recordKey(record) {
  return `${record.masterId}@${record.revision}`;
}

function assertRegistry(registry) {
  if (registry?.schema !== 'VibrationMasterRegistry.v1' || !Array.isArray(registry.records)) {
    throw new TypeError('VIBRATION_MASTER_REGISTRY_INVALID');
  }
  return registry;
}

function assertNoDuplicateRevisions(records) {
  const keys = records.map(recordKey);
  if (new Set(keys).size !== keys.length) throw new Error('VIBRATION_MASTER_REVISION_DUPLICATE');
}

function assertSingleActiveRevision(records) {
  const activeIds = records.filter((record) => record.publicationState === 'ACTIVE')
    .map((record) => record.masterId);
  if (new Set(activeIds).size !== activeIds.length) throw new Error('VIBRATION_MASTER_ACTIVE_CONFLICT');
}

async function sealAll(masters) {
  return Promise.all(masters.map((master) => sealVibrationMaster(master)));
}

export async function buildVibrationMasterRegistry(masters = []) {
  if (!Array.isArray(masters)) throw new TypeError('VIBRATION_MASTER_REGISTRY_RECORDS_INVALID');
  const records = await sealAll(masters);
  assertNoDuplicateRevisions(records);
  assertSingleActiveRevision(records);
  return deepFreezeVibrationMaster({ schema: 'VibrationMasterRegistry.v1', records: [...records] });
}

export async function withVibrationMaster(registry, master) {
  assertRegistry(registry);
  const sealed = await sealVibrationMaster(master);
  return buildVibrationMasterRegistry([...registry.records, sealed]);
}

function recordsForMaster(registry, masterId) {
  const id = String(masterId ?? '').trim();
  if (!id) throw new TypeError('VIBRATION_MASTER_ID_REQUIRED');
  return registry.records.filter((record) => record.masterId === id);
}

function resolutionFailure(records) {
  if (records.length === 0) return 'VIBRATION_MASTER_KEY_UNKNOWN';
  if (records.every((record) => record.publicationState === 'RETIRED')) return 'VIBRATION_MASTER_RETIRED';
  return 'VIBRATION_MASTER_NOT_ACTIVE';
}

export function resolveVibrationMaster(registry, masterId) {
  assertRegistry(registry);
  const matches = recordsForMaster(registry, masterId);
  const active = matches.find((record) => record.publicationState === 'ACTIVE');
  if (!active) throw new Error(resolutionFailure(matches));
  return deepFreezeVibrationMaster({
    schema: 'VibrationMasterResolution.v1',
    master: active,
    provenance: {
      masterId: active.masterId,
      masterRevision: active.revision,
      masterContentHash: active.contentHash,
      sourceRepository: active.source.repository,
      sourceCommit: active.source.commit,
      sourceGitBlob: active.source.gitBlobSha1,
      sourcePath: active.source.path,
      sourceLocator: active.source.locator,
    },
  });
}

export function listVibrationMasterRecords(registry, masterId = null) {
  assertRegistry(registry);
  const records = masterId === null ? registry.records : recordsForMaster(registry, masterId);
  return Object.freeze([...records]);
}

function findRevisionIndex(registry, masterId, revision) {
  const index = registry.records.findIndex((record) => (
    record.masterId === masterId && record.revision === revision
  ));
  if (index < 0) throw new Error('VIBRATION_MASTER_REVISION_UNKNOWN');
  return index;
}

function assertTransition(current, nextState) {
  if (current.publicationState === nextState) return;
  if (!PUBLICATION_TRANSITIONS[current.publicationState]?.includes(nextState)) {
    throw new Error('VIBRATION_MASTER_PUBLICATION_TRANSITION_INVALID');
  }
}

export async function transitionVibrationMasterPublication(registry, masterId, revision, nextState) {
  assertRegistry(registry);
  const index = findRevisionIndex(registry, masterId, revision);
  const current = registry.records[index];
  assertTransition(current, nextState);
  if (current.publicationState === nextState) return registry;
  const replacement = { ...current, publicationState: nextState };
  const records = registry.records.map((record, position) => (position === index ? replacement : record));
  return buildVibrationMasterRegistry(records);
}
