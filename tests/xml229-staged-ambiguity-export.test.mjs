import test from 'node:test';
import assert from 'node:assert/strict';
import {readXml229BoundedStagedPositionEvidence,diagnoseXml229NativeConverterFailure}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-native-converter-failure-diagnostic.mjs';

const sample={count:2,sampleTruncated:false,sample:[
 {type:'dtxr-position-ambiguous',sourceClaimIndex:17,reason:'NON_UNIQUE_POSITION_OWNER',
  candidateCount:2,candidatePositionRowIndices:[22,23],sourceBranch:'PRIVATE_PLANT'},
 {type:'dtxr-position-ambiguous',sourceClaimIndex:18,reason:'COMPETING_POSITION_TRANSFORMS',
  candidateCount:3,candidatePositionRowIndices:[24,25,26],rawPosition:'SECRET_COORDINATES'},
]};
const logs=['arbitrary raw source path PRIVATE_PLANT',
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify(sample)];

test('only bounded source-free staged-position indices enter downloadable native failure',()=>{
 const safe=readXml229BoundedStagedPositionEvidence(logs);
 assert.equal(safe.schema,'XML229.NativeStagedPositionAmbiguity.v1');
 assert.equal(safe.ambiguousCount,2);
 assert.equal(safe.sample.length,2);
 assert.deepEqual(safe.sample[0].candidatePositionRowIndices,[22,23]);
 assert(!JSON.stringify(safe).includes('PRIVATE_PLANT'));
 assert(!JSON.stringify(safe).includes('SECRET_COORDINATES'));
 const failure=diagnoseXml229NativeConverterFailure({
  ok:false,error:'XML229_STAGED_POSITION_AMBIGUOUS',nativeFailurePhase:'CII_CONVERSION',
  nativePythonFailure:{code:'XML229_STAGED_POSITION_AMBIGUOUS',stage:'STAGED_POSITION_TRANSFER'},logs,
 });
 assert.equal(failure.code,'XML229_STAGED_POSITION_AMBIGUOUS');
 assert.deepEqual(failure.stagedPositionAmbiguity,safe);
 assert.equal(failure.nativeCiiReleaseAuthorized,false);
 assert.equal(failure.candidatePublished,false);
});
test('untrusted or oversized native logs cannot introduce arbitrary provenance',()=>{
 assert.equal(readXml229BoundedStagedPositionEvidence(['SECRET']),null);
 assert.equal(readXml229BoundedStagedPositionEvidence([
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify({
   count:1,sample:[{sourceClaimIndex:0,reason:'FORGED',candidateCount:1,candidatePositionRowIndices:[0]}]})]),null);
 assert.equal(readXml229BoundedStagedPositionEvidence([
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify({count:1,sample:new Array(21).fill(sample.sample[0])})]),null);
});
