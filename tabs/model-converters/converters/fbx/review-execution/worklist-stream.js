import { createReadStream, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { closeWritable, appendCanonicalArrayItem, digestWorklistPayload } from './canonical-spool.js';
import { ExternalJsonSorter } from './external-json-sort.js';
import { readTopLevelObject } from './json-value-reader.js';
import { failWorklist, validateMappingWorklistShape } from '../mapping-worklist-contract.js';
import { failBundle, failAssembler } from '../mapping-review-contract.js';

const WORKLIST_KEYS = [
  'schema', 'worklistId', 'source', 'parser', 'sourceGraph',
  'scopePolicy', 'workItems', 'retainedEvidence',
];

function exactTopLevelKeys(seenKeys) {
  const actual = [...seenKeys].sort().join('\0');
  const expected = [...WORKLIST_KEYS].sort().join('\0');
  if (actual !== expected) failWorklist('BLOCKED_WORKLIST_CONTRACT', 'worklist has missing or unexpected fields.');
}

function validateSingleton(fields, key, value) {
  const worklist = { ...fields, workItems: [], retainedEvidence: [] };
  worklist[key] = [value];
  validateMappingWorklistShape(worklist);
}

function identityRecords(item, key) {
  if (key === 'workItems') return [
    { key: `unique:work:${item.workItemId}`, role: 'work-item' },
    { key: `unique:occ:${item.sourceOccurrenceId}`, role: 'occurrence' },
    { key: `owner:${item.sourceModelObjectId}`, role: 'governed' },
  ];
  return [
    { key: `unique:retained:${item.sourceObjectId}`, role: 'retained' },
    { key: `owner:${item.sourceObjectId}`, role: 'retained' },
  ];
}

function validateIdentity(record, key, previousKey, previousRecord) {
  if (key !== previousKey) return;
  if (key.startsWith('unique:')) failWorklist('BLOCKED_WORKLIST_CONTRACT', `${record.role} identity is duplicated.`);
  if (key.startsWith('owner:') && record.role !== previousRecord.role) {
    failWorklist('BLOCKED_WORKLIST_CONTRACT', `source object ${key.slice(6)} is both governed and retained.`);
  }
}

async function writeLine(stream, value) {
  if (!stream.write(`${JSON.stringify(value)}\n`, 'utf8')) await once(stream, 'drain');
}

async function validateRetained(path, fields, checkCancellation) {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) {
    checkCancellation();
    validateSingleton(fields, 'retainedEvidence', JSON.parse(line));
  }
}

function createState(workspace, sortRunItems, checkCancellation) {
  const arrays = {
    workItems: join(workspace, 'work-items-input.canonical'),
    retainedEvidence: join(workspace, 'retained-input.canonical'),
  };
  const streams = Object.fromEntries(Object.entries(arrays).map(([key, path]) => [key, createWriteStream(path, { flags: 'wx' })]));
  const retainedPath = join(workspace, 'retained-raw.ndjson');
  return {
    arrays, streams, retainedPath, checkCancellation,
    retainedStream: createWriteStream(retainedPath, { flags: 'wx' }),
    counts: { workItems: 0, retainedEvidence: 0 },
    itemSorter: new ExternalJsonSorter({
      directory: join(workspace, 'work-item-runs'), prefix: 'work-items', maxRecords: sortRunItems,
      keyOf: (item) => item.workItemId, checkCancellation,
    }),
    identitySorter: new ExternalJsonSorter({
      directory: join(workspace, 'identity-runs'), prefix: 'identities', maxRecords: sortRunItems * 2,
      keyOf: (record) => record.key, checkCancellation,
    }),
  };
}

async function consumeArrayItem(state, key, item, index) {
  state.checkCancellation();
  await appendCanonicalArrayItem(state.streams[key], item, index);
  state.counts[key] += 1;
  if (key === 'workItems') await state.itemSorter.add(item);
  else await writeLine(state.retainedStream, item);
  for (const record of identityRecords(item, key)) await state.identitySorter.add(record);
}

async function parseWorklist(path, state, inputChunkBytes) {
  try {
    return await readTopLevelObject(path, {
      chunkBytes: inputChunkBytes,
      arrayKeys: ['workItems', 'retainedEvidence'],
      onArrayItem: (key, item, index) => consumeArrayItem(state, key, item, index),
      checkCancellation: state.checkCancellation,
    });
  } finally {
    await Promise.all([...Object.values(state.streams), state.retainedStream].map(closeWritable));
  }
}

async function finishItemSort(state, workspace, fields) {
  return state.itemSorter.finish({
    outputPath: join(workspace, 'work-items-sorted.ndjson'),
    onRecord: async (item, key, previousKey) => {
      if (key === previousKey) failWorklist('BLOCKED_WORKLIST_CONTRACT', 'worklist workItemId contains duplicates.');
      validateSingleton(fields, 'workItems', item);
    },
  });
}

async function finishIdentitySort(state, workspace) {
  return state.identitySorter.finish({
    outputPath: join(workspace, 'identities-sorted.ndjson'),
    onRecord: async (...args) => validateIdentity(...args.slice(0, 4)),
  });
}

function staleIdFailure(kind) {
  if (kind === 'assembler') failAssembler('BLOCKED_ASSEMBLER_BINDING', 'worklistId is stale or tampered.');
  failBundle('BLOCKED_REVIEW_BUNDLE_CONTRACT', 'worklistId is stale or tampered.');
}

export async function streamValidatedWorklist({
  worklistPath, workspace, sortRunItems = 5000, inputChunkBytes = 64 * 1024,
  failureKind = 'bundle', checkCancellation = () => {},
}) {
  const state = createState(workspace, sortRunItems, checkCancellation);
  const parsed = await parseWorklist(worklistPath, state, inputChunkBytes);
  checkCancellation();
  exactTopLevelKeys(parsed.seenKeys);
  const fields = parsed.fields;
  validateMappingWorklistShape({ ...fields, workItems: [], retainedEvidence: [] });
  await validateRetained(state.retainedPath, fields, checkCancellation);
  const observedId = await digestWorklistPayload(fields, state.arrays, state.counts);
  if (observedId !== fields.worklistId) staleIdFailure(failureKind);
  const [sorted, identities] = await Promise.all([
    finishItemSort(state, workspace, fields),
    finishIdentitySort(state, workspace),
  ]);
  checkCancellation();
  return {
    header: fields,
    workItemCount: state.counts.workItems,
    retainedEvidenceCount: state.counts.retainedEvidence,
    sortedItemsPath: sorted.outputPath,
    sortRunCount: sorted.sortRunCount + identities.sortRunCount,
    mergePassCount: sorted.mergePassCount + identities.mergePassCount,
  };
}
