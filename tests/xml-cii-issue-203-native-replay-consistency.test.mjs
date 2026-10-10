import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REPLAY_SCHEMA,stableWitness,compareIndependentNativeReplays,compareNodeBrowserSummaries,assertNonprotectedDiagnosticAnchor,secondaryNativeWitness,nativeWorkerLifecycleWitness } from '../scripts/check-xml-cii-issue-203-native-replay.mjs';
import { createMasterDatasetClient } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-client.js';

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
      secondaryPositive:{token:'12000',workerMatchCount:7,indexes:[4,5],indexedRowCount:2,
        indexedRowSha256:'c'.repeat(64)},
      workerLifecycleCreatedCount:2,workerLifecycleTerminatedCount:2,
      workerReleaseRehydratedRows:4,workerReleaseRehydratedSha256:'b'.repeat(64),
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
      'nativeTwoDistinctPositiveTokens','nativeWorkerReleaseAndColdRehydrate','nativeWorkerTerminateObserved',
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


// P15/P16: These are deliberately SOURCE-DERIVED REGRESSION DIAGNOSTICS.
// They are not the protected LFJ/CII semantic golden or Owner 30 MiB evidence.
const diagnosticAnchor = JSON.parse(fs.readFileSync(
  new URL('./fixtures/c05-issue203-nonprotected-positive-row-diagnostic.v1.json', import.meta.url), 'utf8'));
const originalMasterBytes = fs.readFileSync(
  new URL('../docs/Masters/Piping_class_master.json', import.meta.url));
const deployedMirrorBytes = fs.readFileSync(
  new URL('../docs/docs/Masters/Piping_class_master.json', import.meta.url));

function anchoredSummary() {
  return {
    schema: REPLAY_SCHEMA,
    sourceAssetSha256: diagnosticAnchor.source.sha256,
    stableWitness: structuredClone(diagnosticAnchor.stableWitness),
    independentProtectedGolden: false,
  };
}
function checkDiagnostic(r, a = diagnosticAnchor, source = originalMasterBytes, mirror = deployedMirrorBytes) {
  return assertNonprotectedDiagnosticAnchor(r,a,source,mirror);
}

test('P15 reviewed nonprotected anchor binds actual source bytes, deployed mirror and observed native witness', () => {
  const summary = anchoredSummary();
  assert.equal(checkDiagnostic(summary), true);
  assert.equal(diagnosticAnchor.releaseAuthority, false);
  assert.equal(diagnosticAnchor.protectedGolden, false);
  assert.equal(diagnosticAnchor.ownerOriginal30MbQualified, false);
  assert.equal(diagnosticAnchor.provenance.githubWorkflowRun, 38092619920);
  assert.deepEqual(diagnosticAnchor.provenance.githubArtifactIds,
    [11684995551,11684791442,11684995577]);
});

test('P16 any uniform drift in token, row content, indexes, revisions and fingerprint fails reviewed diagnostic', () => {
  const variations = [
    r => { r.stableWitness.canonicalRowsSha256 = '0'.repeat(64); },
    r => { r.stableWitness.token = 'changed-class-token'; },
    r => { r.stableWitness.indexes = [0,1,2,4]; },
    r => { r.stableWitness.revisions = [2,1,1]; },
    r => { r.stableWitness.fingerprint = 'wrong-weight-fp'; },
    r => { r.stableWitness.masterRowCounts = [1,383,1595]; },
    r => { r.stableWitness.workerMatchCount = 29; },
    r => { r.stableWitness.indexedRowCount = 0; },
  ];
  for (const mutate of variations) {
    const summary = anchoredSummary();
    mutate(summary);
    assert.throws(() => checkDiagnostic(summary), /drifted from reviewed diagnostic anchor/);
  }
});

test('P16 mismatch in source, mirror, declared SHA or replay SHA fails independently', () => {
  assert.throws(() => checkDiagnostic(anchoredSummary(), diagnosticAnchor,
    Buffer.concat([originalMasterBytes, Buffer.from('drift')]), deployedMirrorBytes),
  /mirror differs/);
  assert.throws(() => checkDiagnostic(anchoredSummary(), diagnosticAnchor,
    originalMasterBytes, Buffer.concat([deployedMirrorBytes, Buffer.from('drift')])),
  /mirror differs/);
  const fabricated = structuredClone(diagnosticAnchor);
  fabricated.source.sha256 = 'e'.repeat(64);
  assert.throws(() => checkDiagnostic(anchoredSummary(), fabricated), /checked-in source drifted/);
  const badSummary = anchoredSummary();
  badSummary.sourceAssetSha256 = 'e'.repeat(64);
  assert.throws(() => checkDiagnostic(badSummary), /replay source SHA256 differs/);
});

test('P16 tampered status cannot promote a diagnostic source witness to release authority', () => {
  const variants = [
    r => { r.releaseAuthority = true; },
    r => { r.protectedGolden = true; },
    r => { r.ownerOriginal30MbQualified = true; },
    r => { r.purpose = 'SIGNED_SEMANTIC_GOLDEN'; },
    r => { r.provenance.updatePolicy = 'AUTO_REGENERATE'; },
  ];
  for (const mutate of variants) {
    const a = structuredClone(diagnosticAnchor);
    mutate(a);
    assert.throws(() => checkDiagnostic(anchoredSummary(),a));
  }
  const unsupported = anchoredSummary();
  unsupported.schema = 'C05_FAKE_SEMANTIC_RELEASE_GREEN';
  assert.throws(() => checkDiagnostic(unsupported), /unsupported actual hosted replay schema/);
});


test('P18 second genuine positive token and content digest bind independent Chromium receipts',()=>{
  const a=record('a'),b=record('b');
  assert.equal(secondaryNativeWitness(a).token,'12000');
  assert.deepEqual(secondaryNativeWitness(a).indexes,[4,5]);
  const replay=compareIndependentNativeReplays(a,b,sourceSha);
  assert.equal(replay.secondaryWitness.sha256,'c'.repeat(64));
  assert.equal(replay.workerLifecycle.workerCount,2);
});
test('P18 altered secondary token, SHA256, indexes and worker hits fail closed',()=>{
  const mutations=[
    r=>{r.consumers.secondaryPositive.token='11000'},
    r=>{r.consumers.secondaryPositive.indexedRowSha256='bad'},
    r=>{r.consumers.secondaryPositive.indexes=[4,4]},
    r=>{r.consumers.secondaryPositive.workerMatchCount=0},
    r=>{r.consumers.secondaryPositive.indexedRowCount=5},
  ];
  for(const mutate of mutations){
    const bad=record('bad');mutate(bad);
    assert.throws(()=>secondaryNativeWitness(bad));
  }
  const moved=record('moved');moved.consumers.secondaryPositive.indexedRowSha256='d'.repeat(64);
  assert.throws(()=>compareIndependentNativeReplays(record('other'),moved,sourceSha),
    /second native token or row content drifted/);
});
test('P19 forged Worker cleanup, leaked terminate or altered durable rows fail closed',()=>{
  const mutations=[
    r=>{r.assertions.nativeWorkerReleaseAndColdRehydrate=false},
    r=>{r.assertions.nativeWorkerTerminateObserved=false},
    r=>{r.consumers.workerLifecycleTerminatedCount=1},
    r=>{r.consumers.workerLifecycleCreatedCount=1},
    r=>{r.consumers.workerReleaseRehydratedRows=0},
    r=>{r.consumers.workerReleaseRehydratedSha256='d'.repeat(64)},
  ];
  for(const mutate of mutations){
    const bad=record('bad');mutate(bad);
    assert.throws(()=>nativeWorkerLifecycleWitness(bad));
  }
});
test('P19 pending native transport request rejects on dispose and stale response cannot revive it',async()=>{
  const instances=[];
  const client=createMasterDatasetClient({
    workerFactory(){
      const listeners=new Map(),messages=[];
      const worker={
        messages,terminated:false,
        addEventListener(type,listener){listeners.set(type,listener)},
        postMessage(payload){messages.push(payload)},
        terminate(){this.terminated=true},
        emit(type,data){listeners.get(type)?.({data})},
      };
      instances.push(worker);
      return worker;
    },
  });
  const pending=client.search('real-piping-id','11000');
  assert.equal(instances.length,1);
  const envelope=instances[0].messages[0];
  assert.equal(envelope.type,'SEARCH');
  client.dispose();
  await assert.rejects(pending,/Master dataset client disposed/);
  assert.equal(instances[0].terminated,true);
  instances[0].emit('message',{
    type:'SEARCH_RESULT',requestId:envelope.requestId,
    datasetId:'real-piping-id',indexes:[0],matchCount:1,
  });
  const fresh=client.search('real-piping-id','12000');
  assert.equal(instances.length,2,'client restart must not reuse dead Worker');
  const newEnvelope=instances[1].messages[0];
  instances[1].emit('message',{
    type:'SEARCH_RESULT',requestId:newEnvelope.requestId,
    datasetId:'real-piping-id',indexes:[1],matchCount:1,
  });
  const accepted=await fresh;
  assert.deepEqual(accepted.indexes,[1]);
  client.dispose();
  assert.equal(instances[1].terminated,true);
});
test('P18/P19 Node22/24 summaries refuse secondary or lifecycle drift independently',()=>{
  const a=compareIndependentNativeReplays(record('a'),record('b'),sourceSha);
  const b=compareIndependentNativeReplays(record('c'),record('d'),sourceSha);
  b.secondaryWitness.sha256='d'.repeat(64);
  assert.throws(()=>compareNodeBrowserSummaries(a,b),/second native token\/indexed-row content drifted/);
  b.secondaryWitness.sha256='c'.repeat(64);
  b.workerLifecycle.terminatedCount=1;
  assert.throws(()=>compareNodeBrowserSummaries(a,b),/Worker lifecycle evidence drifted/);
});
