import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REPLAY_SCHEMA,stableWitness,compareIndependentNativeReplays,compareNodeBrowserSummaries,assertNonprotectedDiagnosticAnchor } from '../scripts/check-xml-cii-issue-203-native-replay.mjs';

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
