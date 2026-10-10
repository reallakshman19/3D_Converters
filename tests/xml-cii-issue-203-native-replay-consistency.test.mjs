import test from 'node:test';
import assert from 'node:assert/strict';
import { REPLAY_SCHEMA,stableWitness,compareIndependentNativeReplays,compareNodeBrowserSummaries } from '../scripts/check-xml-cii-issue-203-native-replay.mjs';

const sourceSha = 'a'.repeat(64);
const copy = x => structuredClone(x);
function record(id) {
  return {
    schema:'XMLCII_ISSUE_893_CONSUMER_AUTHORITY_V1',ok:true,
    refs:{
      pipingClass:{datasetId:id+'pc',datasetRevision:1},
      materialMap:{datasetId:id+'mat',datasetRevision:1},
      weight:{datasetId:id+'wt',datasetRevision:1,masterFingerprint:'weight-fp'},
    },
    consumers:{
      pipingClassRows:10699,materialMapRows:383,weightRows:1595,
      regexSampledBoundedRows:4,regexIndexedRowFetches:1,
      positiveSourceToken:'11000',positiveWorkerMatchCount:30,
      positiveIndexedRowCount:4,positiveIndexedRowIndexes:[0,1,2,3],
      positiveIndexedRowSha256:'b'.repeat(64),positiveRowSerialization:'stable-key-json-v1',
    },
    guards:{
      wrongMasterIndexedError:'dataset belongs to materialMap',
      staleIndexedError:'Dataset revision mismatch',
      fingerprintIndexedError:'Dataset fingerprint mismatch',
    },
    assertions:Object.fromEntries([
      'nativePositiveIndexedRowSha256Recorded','nativeWorkerIndexedRowRetrievalObserved',
      'positiveSourceTokenRecoveredInIndexedRows','indexedWrongMasterFailsClosed',
      'indexedStaleRevisionFailsClosed','indexedWeightFingerprintFailsClosed',
      'noSecondMasterSourceImport','appliedRevisionsIndependent',
    ].map(key=>[key,true])),
  };
}
test('P12 two independent positive receipts produce one canonical witness',()=>{
  const r=compareIndependentNativeReplays(record('a'),record('b'),sourceSha);
  assert.equal(r.schema,REPLAY_SCHEMA);
  assert.equal(r.replayCount,2);
  assert.equal(r.stableWitness.canonicalRowsSha256,'b'.repeat(64));
  assert.equal(r.independentProtectedGolden,false);
});
test('P12 mutated content digest is a hard failure',()=>{
  const b=record('b');b.consumers.positiveIndexedRowSha256='c'.repeat(64);
  assert.throws(()=>compareIndependentNativeReplays(record('a'),b,sourceSha),/witness drift/);
});
test('P12 same import identity cannot masquerade as independent process',()=>{
  const a=record('a');
  assert.throws(()=>compareIndependentNativeReplays(a,copy(a),sourceSha),/reused pipingClass datasetId/);
});
test('P12 rejects missing indexed proof, empty row, bad hash, duplicate/invalid indexes',()=>{
  const mutations=[
    r=>{r.consumers.regexIndexedRowFetches=0},
    r=>{r.consumers.positiveIndexedRowCount=0},
    r=>{r.consumers.positiveIndexedRowSha256='bad'},
    r=>{r.consumers.positiveIndexedRowIndexes=[0,0,1,2]},
    r=>{r.consumers.positiveIndexedRowIndexes=[-1,1,2,3]},
    r=>{r.consumers.positiveIndexedRowCount=9},
  ];
  for(const mutate of mutations){const r=record('bad');mutate(r);assert.throws(()=>stableWitness(r));}
});
test('P12 rejects missing wrong-master, stale revision or Weight fingerprint vetoes',()=>{
  for(const key of ['indexedWrongMasterFailsClosed','indexedStaleRevisionFailsClosed','indexedWeightFingerprintFailsClosed']){
    const r=record('bad');r.assertions[key]=false;
    assert.throws(()=>stableWitness(r),/missing native guard/);
  }
});
test('P13 Node22/24 summaries compare source digest and actual indexed-row witness',()=>{
  const a=compareIndependentNativeReplays(record('a'),record('b'),sourceSha);
  const b=compareIndependentNativeReplays(record('c'),record('d'),sourceSha);
  const out=compareNodeBrowserSummaries(a,b);
  assert.deepEqual(out.nodeVersions,[22,24]);
  assert.equal(out.distinctBrowserProcesses,4);
  assert.equal(out.nativePositiveIndexedReads,4);
});
test('P13 cross-version row digest or source drift cannot pass',()=>{
  const a=compareIndependentNativeReplays(record('a'),record('b'),sourceSha);
  const b=compareIndependentNativeReplays(record('c'),record('d'),sourceSha);
  const altered=copy(b);altered.stableWitness.canonicalRowsSha256='c'.repeat(64);
  assert.throws(()=>compareNodeBrowserSummaries(a,altered),/rows or authority drifted/);
  const asset=copy(b);asset.sourceAssetSha256='c'.repeat(64);
  assert.throws(()=>compareNodeBrowserSummaries(a,asset),/asset hash drifted/);
});
