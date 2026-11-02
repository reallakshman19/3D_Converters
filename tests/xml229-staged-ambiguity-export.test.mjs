import test from 'node:test';
import assert from 'node:assert/strict';
import {readXml229BoundedStagedPositionEvidence,diagnoseXml229NativeConverterFailure}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-native-converter-failure-diagnostic.mjs';

const sample={matcherRevision:'XML229_POSITION_PRECISION_V2',matchToleranceMm:3,
 count:2,sampleTruncated:false,sample:[
 {type:'dtxr-position-ambiguous',sourceClaimIndex:17,scope:'MANDATORY',
  reason:'NON_UNIQUE_POSITION_OWNER',candidateCount:2,candidatePositionRowIndices:[22,23],
  candidateGeometry:'DISTINCT',preciseCandidateCount:0,guardBandCandidateCount:2,
  matchedTransformCount:2,psCorroboratedCandidateCount:0,explicitXmlRefPresent:false,
  sourceBranch:'PRIVATE_PLANT'},
 {type:'dtxr-position-ambiguous',sourceClaimIndex:18,scope:'MANDATORY',
  reason:'COMPETING_POSITION_TRANSFORMS',candidateCount:3,candidatePositionRowIndices:[24,25,26],
  candidateGeometry:'COINCIDENT',preciseCandidateCount:2,guardBandCandidateCount:3,
  matchedTransformCount:2,psCorroboratedCandidateCount:2,explicitXmlRefPresent:true,
  rawPosition:'SECRET_COORDINATES'},
]};
const logs=['arbitrary raw source path PRIVATE_PLANT',
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify(sample)];

test('only bounded source-free staged-position indices enter downloadable native failure',()=>{
 const safe=readXml229BoundedStagedPositionEvidence(logs);
 assert.equal(safe.schema,'XML229.NativeStagedPositionAmbiguity.v1');
 assert.equal(safe.ambiguousCount,2);
 assert.equal(safe.matcherRevision,'XML229_POSITION_PRECISION_V2');
 assert.equal(safe.matchToleranceMm,3);
 assert.equal(safe.sample[0].scope,'MANDATORY');
 assert.equal(safe.sample[0].candidateGeometry,'DISTINCT');
 assert.equal(safe.sample[0].preciseCandidateCount,0);
 assert.equal(safe.sample[0].guardBandCandidateCount,2);
 assert.equal(safe.sample[1].candidateGeometry,'COINCIDENT');
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
test('legacy pre-version receipt remains bounded and scope optional',()=>{
 const older={count:1,sampleTruncated:false,sample:[{
  sourceClaimIndex:3,reason:'NON_UNIQUE_POSITION_OWNER',
  candidateCount:2,candidatePositionRowIndices:[2,3]}]};
 const receipt=readXml229BoundedStagedPositionEvidence([
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify(older)]);
 assert.equal(receipt.ambiguousCount,1);
 assert.equal(receipt.matcherRevision,undefined);
 assert.equal(receipt.sample[0].scope,undefined);
});
test('untrusted or oversized native logs cannot introduce arbitrary provenance',()=>{
 assert.equal(readXml229BoundedStagedPositionEvidence(['SECRET']),null);
 for(const changed of [
  {...sample,matcherRevision:'FORGED_NATIVE_AUTHORITY'},
  {...sample,matchToleranceMm:-1},
  {...sample,sample:[{...sample.sample[0],scope:'SECRET'}]},
  {...sample,sample:[{...sample.sample[0],candidateGeometry:'SECRET'}]},
  {...sample,sample:[{...sample.sample[0],preciseCandidateCount:3}]},
 ])assert.equal(readXml229BoundedStagedPositionEvidence([
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify(changed)]),null);
 assert.equal(readXml229BoundedStagedPositionEvidence([
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify({
   count:1,sample:[{sourceClaimIndex:0,reason:'FORGED',candidateCount:1,candidatePositionRowIndices:[0]}]})]),null);
 assert.equal(readXml229BoundedStagedPositionEvidence([
  'XML229_STAGED_POSITION_AMBIGUITY '+JSON.stringify({count:1,sample:new Array(21).fill(sample.sample[0])})]),null);
});
