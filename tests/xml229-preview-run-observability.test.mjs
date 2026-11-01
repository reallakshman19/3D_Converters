import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createXml229EngineeringPhaseClock,XML229_ENGINEERING_PHASES}
 from '../tabs/xml-cii-2019-standalone/integration/xml229-engineering-phase-clock.mjs';
import {xml229RunHoldPlainMeaning}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-run-hold-explanation.mjs';

test('phase clock emits only allowlisted phase and bounded duration once',()=>{
 let time=100;const records=[];
 const clock=createXml229EngineeringPhaseClock(record=>records.push(record),()=>time);
 const end=clock.start('prefinal-restraints');
 time=127.25;end();end();
 assert.deepEqual(records,[
  {phase:'prefinal-restraints',state:'started'},
  {phase:'prefinal-restraints',state:'completed',elapsedMs:27},
 ]);
 assert(Object.isFrozen(records[0]));
 assert(Object.isFrozen(records[1]));
 assert.throws(()=>clock.start('PRIVATE_SOURCE_XML'),/UNKNOWN_ENGINEERING_PHASE/);
 assert.equal(XML229_ENGINEERING_PHASES.length,8);
});
test('diagnostic callback cannot fail engineering calculation',()=>{
 let time=0;
 const clock=createXml229EngineeringPhaseClock(()=>{throw Error('transport');},()=>time);
 const end=clock.start('finalized-geometry');time=4;
 assert.doesNotThrow(()=>end());
 const over=createXml229EngineeringPhaseClock(()=>{},()=>1e9);
 assert.doesNotThrow(()=>over.start('physical-facts')());
});
test('failed native candidate takes presentation precedence over held format authority',()=>{
 const audit={diagnosisCode:'BRANCH_FORMAT_IDENTITY_UNRESOLVED',
  evidence:[{name:'weight-final-readiness',status:'VERIFIED'}],
  nativeCandidate:{status:'FAILED',failureCode:'XML229_STAGED_POSITION_AMBIGUOUS',
   elapsedMs:24975,phase:'STAGED_POSITION_TRANSFER'}};
 const message=xml229RunHoldPlainMeaning(audit);
 assert.match(message,/candidate executed and FAILED/);
 assert.match(message,/XML229_STAGED_POSITION_AMBIGUOUS/);
 assert.match(message,/branch formats remain unmatched or conflicting/);
 assert.match(message,/release remains HELD/);
 assert.doesNotMatch(message,/Conversion has not started/);
 assert.doesNotMatch(message,/24975/);
});
test('other candidate states remain nonreleasing; no candidate has distinct explanation',()=>{
 const base={diagnosisCode:'BRANCH_FORMAT_IDENTITY_UNRESOLVED',evidence:[]};
 assert.match(xml229RunHoldPlainMeaning({...base,nativeCandidate:{status:'IN_PROGRESS'}}),/IN PROGRESS/);
 assert.match(xml229RunHoldPlainMeaning({...base,nativeCandidate:{status:'SUCCEEDED'}}),/not an independently authorized release/);
 assert.match(xml229RunHoldPlainMeaning(base),/No current native candidate attempt is recorded/);
 assert.doesNotMatch(xml229RunHoldPlainMeaning({...base,nativeCandidate:
  {status:'FAILED',failureCode:'PRIVATE-CLAIM'}}),/PRIVATE-CLAIM/);
});
test('instrumentation and presentation are root/docs byte-parity, and optional enrichment policy remains distinct',async()=>{
 const paths=[
  'integration/xml229-engineering-phase-clock.mjs',
  'integration/xml229-preview-engineering-fact-producer.mjs',
  'integration/xml229-original-blob-gcpw-worker.mjs',
  'ui-adapted/xml229-run-hold-explanation.mjs',
  'ui-adapted/xml-cii-adapted-output-run.js',
 ];
 for(const suffix of paths){
   const name='tabs/xml-cii-2019-standalone/'+suffix;
   const root=await readFile(new URL('../'+name,import.meta.url),'utf8');
   const mirror=await readFile(new URL('../docs/'+name,import.meta.url),'utf8');
   assert.equal(root,mirror,name);
 }
 const readiness=await readFile(new URL('../tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js',import.meta.url),'utf8');
 const core=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js',import.meta.url),'utf8');
 assert.match(readiness,/blocking:\s*false, severity:\s*'warning'/);
 assert.match(core,/formatPreviewPasses = \[0,1\]/);
 assert.match(core,/rating:row\.rating/);
});
