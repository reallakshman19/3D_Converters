import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPLAY_SCHEMA = 'XMLCII_C05_NATIVE_POSITIVE_REPLAY_V1';
const nativeSchema = 'XMLCII_ISSUE_893_CONSUMER_AUTHORITY_V1';
const sourcePath = 'docs/Masters/Piping_class_master.json';
const checkedSourceHash = () => createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');

export function stableWitness(r) {
  assert.equal(r?.schema, nativeSchema, 'native source receipt schema');
  assert.equal(r?.ok, true, 'native browser receipt not successful');
  const c = r.consumers || {}, refs = r.refs || {};
  assert.ok(typeof c.positiveSourceToken === 'string' && c.positiveSourceToken.length > 0, 'missing real source token');
  assert.ok(Number.isInteger(c.positiveWorkerMatchCount) && c.positiveWorkerMatchCount > 0, 'missing positive Worker hits');
  assert.equal(c.regexIndexedRowFetches, 1, 'missing native IndexedDB indexed read');
  assert.ok(Number.isInteger(c.positiveIndexedRowCount) && c.positiveIndexedRowCount > 0 && c.positiveIndexedRowCount <= 8,
    'indexed row count outside 1..8 bound');
  assert.ok(Array.isArray(c.positiveIndexedRowIndexes), 'missing index list');
  assert.equal(c.positiveIndexedRowIndexes.length, c.positiveIndexedRowCount, 'index/row count mismatch');
  assert.equal(new Set(c.positiveIndexedRowIndexes).size, c.positiveIndexedRowIndexes.length, 'duplicate index');
  assert.ok(c.positiveIndexedRowIndexes.every(i => Number.isInteger(i) && i >= 0), 'invalid index');
  assert.match(c.positiveIndexedRowSha256 || '', /^[a-f0-9]{64}$/, 'missing actual indexed-row sha256');
  assert.equal(c.positiveRowSerialization, 'stable-key-json-v1', 'wrong canonicalization');
  assert.equal(c.regexSampledBoundedRows, c.positiveIndexedRowCount, 'Regex indexed-row count mismatch');
  for (const k of ['pipingClass', 'materialMap', 'weight']) {
    assert.ok(typeof refs[k]?.datasetId === 'string' && refs[k].datasetId, 'missing ' + k + ' dataset ID');
    assert.ok(Number.isInteger(refs[k].datasetRevision) && refs[k].datasetRevision > 0, 'missing ' + k + ' revision');
  }
  assert.ok(refs.weight.masterFingerprint, 'missing weight fingerprint');
  assert.deepEqual([c.pipingClassRows, c.materialMapRows, c.weightRows], [10699,383,1595], 'real master row counts changed');
  for (const key of [
    'nativePositiveIndexedRowSha256Recorded','nativeWorkerIndexedRowRetrievalObserved',
    'positiveSourceTokenRecoveredInIndexedRows','indexedWrongMasterFailsClosed',
    'indexedStaleRevisionFailsClosed','indexedWeightFingerprintFailsClosed',
    'noSecondMasterSourceImport','appliedRevisionsIndependent',
  ]) assert.equal(r.assertions?.[key], true, 'missing native guard ' + key);
  assert.match(r.guards?.wrongMasterIndexedError || '', /materialMap/, 'no wrong-master error');
  assert.match(r.guards?.staleIndexedError || '', /revision mismatch/i, 'no stale-index error');
  assert.match(r.guards?.fingerprintIndexedError || '', /fingerprint mismatch/i, 'no weight fingerprint error');
  return {
    token: c.positiveSourceToken,
    canonicalRowsSha256: c.positiveIndexedRowSha256,
    encoding: c.positiveRowSerialization,
    workerMatchCount: c.positiveWorkerMatchCount,
    indexedRowCount: c.positiveIndexedRowCount,
    indexes: [...c.positiveIndexedRowIndexes],
    revisions: [refs.pipingClass.datasetRevision, refs.materialMap.datasetRevision, refs.weight.datasetRevision],
    fingerprint: refs.weight.masterFingerprint,
    masterRowCounts: [c.pipingClassRows, c.materialMapRows, c.weightRows],
  };
}
export function secondaryNativeWitness(r) {
  const c = r?.consumers || {};
  const v = c.secondaryPositive || {};
  assert.equal(r?.assertions?.nativeTwoDistinctPositiveTokens, true,
    'second independent native positive search/fetch not attested');
  assert.ok(typeof v.token === 'string' && v.token.length > 0 &&
    v.token !== c.positiveSourceToken, 'second source token missing or duplicates original');
  assert.ok(Number.isInteger(v.workerMatchCount) && v.workerMatchCount > 0,
    'second source token has no native Worker hits');
  assert.ok(Number.isInteger(v.indexedRowCount) && v.indexedRowCount >= 1 &&
    v.indexedRowCount <= 4, 'second native indexed row bound violation');
  assert.ok(Array.isArray(v.indexes) && v.indexes.length === v.indexedRowCount,
    'second indexed row indexes missing');
  assert.equal(new Set(v.indexes).size, v.indexes.length, 'duplicate secondary indexes');
  assert.ok(v.indexes.every(index => Number.isInteger(index) && index >= 0),
    'invalid secondary index');
  assert.match(v.indexedRowSha256 || '', /^[a-f0-9]{64}$/,
    'second native indexed row digest missing');
  return {
    token: v.token, matchCount: v.workerMatchCount,
    indexes: [...v.indexes], rowCount: v.indexedRowCount, sha256: v.indexedRowSha256,
  };
}
export function nativeWorkerLifecycleWitness(r) {
  const c = r?.consumers || {};
  assert.equal(r?.assertions?.nativeWorkerReleaseAndColdRehydrate, true,
    'native release/IndexedDB rehydrate not attested');
  assert.equal(r?.assertions?.nativeWorkerTerminateObserved, true,
    'native worker terminate not attested');
  assert.equal(c.workerLifecycleCreatedCount, 2, 'expected two independent Worker instances');
  assert.equal(c.workerLifecycleTerminatedCount, 2, 'both Worker instances must terminate');
  assert.equal(c.workerReleaseRehydratedRows, c.positiveIndexedRowCount,
    'post-release indexed rows differ from original');
  assert.equal(c.workerReleaseRehydratedSha256, c.positiveIndexedRowSha256,
    'post-release IndexedDB rows differ from primary native row digest');
  return { workerCount: 2, terminatedCount: 2, durableRowCount: c.workerReleaseRehydratedRows,
    durableSha256: c.workerReleaseRehydratedSha256 };
}
export function assertNonprotectedDiagnosticAnchor(record, anchor, sourceBytes, mirrorBytes) {
  assert.equal(anchor?.schema, 'XMLCII_C05_NONPROTECTED_DIAGNOSTIC_ANCHOR_V1',
    'missing versioned NON-PROTECTED diagnostic anchor');
  assert.equal(anchor?.purpose, 'SOURCE_DRIFT_DIAGNOSTIC_ONLY_NOT_AN_INDEPENDENT_SEMANTIC_GOLDEN',
    'diagnostic anchor must never imply accepted semantic oracle');
  assert.equal(anchor.releaseAuthority, false, 'source witness cannot claim release authority');
  assert.equal(anchor.protectedGolden, false, 'source witness is not a protected golden');
  assert.equal(anchor.ownerOriginal30MbQualified, false, 'source witness is not Owner original fixture');
  assert.equal(anchor.provenance?.updatePolicy,
    'REVIEW_EXPLICIT_WITNESS_AND_SOURCE_DIFF_NO_AUTOREGEN',
    'anchor silently permits regeneration');
  assert.match(String(anchor.provenance?.sourceCandidateCommit || ''), /^[a-f0-9]{40}$/,
    'diagnostic witness missing exact original source commit');
  assert.equal(anchor.source?.repoPath, 'docs/Masters/Piping_class_master.json');
  assert.equal(anchor.source?.mirrorPath, 'docs/docs/Masters/Piping_class_master.json');
  assert.match(anchor.source?.sha256 || '', /^[a-f0-9]{64}$/);
  assert.ok(Buffer.isBuffer(sourceBytes) && Buffer.isBuffer(mirrorBytes),
    'source and mirror must be read as genuine checked-out bytes');
  assert.ok(sourceBytes.equals(mirrorBytes),
    'Piping Class deployed source mirror differs from original checked-in master bytes');
  const actualSha = createHash('sha256').update(sourceBytes).digest('hex');
  assert.equal(actualSha, anchor.source.sha256,
    'Piping Class checked-in source drifted from reviewed diagnostic anchor');
  assert.equal(record?.sourceAssetSha256, actualSha,
    'browser/replay source SHA256 differs from original checked-in asset');
  assert.deepEqual(record?.stableWitness, anchor.stableWitness,
    'native positive indexed-row content or authority drifted from reviewed diagnostic anchor');
  assert.equal(record?.independentProtectedGolden, false,
    'unapproved golden must not be inferred from source diagnostic');
  assert.ok(record?.schema === REPLAY_SCHEMA ||
      record?.schema === 'XMLCII_C05_NODE22_NODE24_BROWSER_PARITY_V1',
    'unsupported actual hosted replay schema for source drift pin');
  return true;
}
function checkCheckoutDiagnosticAnchor(record) {
  const anchor = read('tests/fixtures/c05-issue203-nonprotected-positive-row-diagnostic.v1.json');
  return assertNonprotectedDiagnosticAnchor(record, anchor,
    fs.readFileSync(anchor.source.repoPath),
    fs.readFileSync(anchor.source.mirrorPath));
}

export function compareIndependentNativeReplays(first, second, sourceAssetSha256) {
  const witnessA = stableWitness(first);
  const witnessB = stableWitness(second);
  assert.deepEqual(witnessB, witnessA, 'native indexed-row witness drift across two cold browser processes');
  const secondaryA = secondaryNativeWitness(first);
  const secondaryB = secondaryNativeWitness(second);
  assert.deepEqual(secondaryB, secondaryA, 'second native token or row content drifted between browser processes');
  const workerLifecycleA = nativeWorkerLifecycleWitness(first);
  const workerLifecycleB = nativeWorkerLifecycleWitness(second);
  assert.deepEqual(workerLifecycleB, workerLifecycleA,
    'Worker release/rehydration differed between browser processes');
  for (const key of ['pipingClass','materialMap','weight']) {
    assert.notEqual(first.refs[key].datasetId, second.refs[key].datasetId,
      'independent browser process reused ' + key + ' datasetId');
  }
  assert.match(sourceAssetSha256 || '', /^[a-f0-9]{64}$/, 'missing original Piping master source hash');
  return {
    schema: REPLAY_SCHEMA, nativePositive: true, replayCount: 2,
    distinctImportIds: true, sourceAssetSha256, stableWitness: witnessA,
    secondaryWitness: secondaryA, workerLifecycle: workerLifecycleA,
    independentProtectedGolden: false, originalOwner30MbQualified: false,
  };
}
export function compareNodeBrowserSummaries(first, second) {
  assert.equal(first?.schema, REPLAY_SCHEMA, 'node22 summary schema');
  assert.equal(second?.schema, REPLAY_SCHEMA, 'node24 summary schema');
  for (const r of [first,second]) {
    assert.equal(r.nativePositive, true, 'failed native positive replay');
    assert.equal(r.replayCount, 2, 'missing independent browser process');
    assert.equal(r.distinctImportIds, true, 'same session identity');
    assert.equal(r.independentProtectedGolden, false, 'protected golden claimed');
    assert.equal(r.originalOwner30MbQualified, false, 'original Owner fixture claimed');
  }
  assert.deepEqual(second.stableWitness, first.stableWitness, 'Node22/24 indexed rows or authority drifted');
  assert.ok(first.secondaryWitness && second.secondaryWitness, 'second independent native token missing');
  assert.deepEqual(second.secondaryWitness, first.secondaryWitness,
    'second native token/indexed-row content drifted between Node22 and Node24');
  assert.ok(first.workerLifecycle && second.workerLifecycle,
    'native Worker release/termination lifecycle evidence missing');
  assert.deepEqual(second.workerLifecycle, first.workerLifecycle,
    'Worker lifecycle evidence drifted between Node22 and Node24');
  assert.equal(second.sourceAssetSha256, first.sourceAssetSha256, 'Node22/24 original asset hash drifted');
  return {
    schema: 'XMLCII_C05_NODE22_NODE24_BROWSER_PARITY_V1',
    sourceAssetSha256: first.sourceAssetSha256,
    stableWitness: first.stableWitness,
    secondaryWitness: first.secondaryWitness,
    workerLifecycle: first.workerLifecycle,
    nodeVersions: [22,24], distinctBrowserProcesses: 4,
    nativePositiveIndexedReads: 4, independentProtectedGolden: false,
  };
}
function read(file) { return JSON.parse(fs.readFileSync(file,'utf8')); }
function write(file, record) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--verify-anchor') {
    const [file] = process.argv.slice(3);
    if (!file) throw Error('usage --verify-anchor native-replay-summary.json');
    checkCheckoutDiagnosticAnchor(read(file));
    console.log('NONPROTECTED_C05_DIAGNOSTIC_ANCHOR_VERIFIED', file);
  } else if (process.argv[2] === '--compare') {
    const [a,b,out] = process.argv.slice(3);
    if (!a || !b || !out) throw Error('usage --compare node22 node24 output');
    const result = compareNodeBrowserSummaries(read(a),read(b));
    assert.equal(result.sourceAssetSha256, checkedSourceHash(), 'source bytes differ from browser summaries');
    checkCheckoutDiagnosticAnchor(result);
    write(out,result);
    console.log(JSON.stringify(result,null,2));
  } else {
    const [a,b,out] = process.argv.slice(2);
    if (!a || !b || !out) throw Error('usage first-native.json second-native.json output.json');
    const result = compareIndependentNativeReplays(read(a),read(b),checkedSourceHash());
    write(out,result);
    console.log(JSON.stringify(result,null,2));
  }
}
