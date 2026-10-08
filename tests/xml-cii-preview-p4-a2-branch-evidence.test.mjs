import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {projectXmlCiiOccurrences} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-xml-source.js';
import {extractBranchFieldsWithFormats} from '../converters/xml-cii2019-core/branch-format-extraction.js';
import {reconcilePreviewBranchEvidence} from
 '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-branch-evidence.js';
import {golden,combinedSourceText,modeBManifest} from './fixtures/xml-cii-preview-p4-a1/oracle.mjs';

installWeightBasisXmlDom(globalThis);
const basisId='b'.repeat(64);
const config={regexTester:{formats:[
 {lineKey:{regex:'^/ASIM-1885-[0-9]+(?:"|-)-(S[0-9]+)'},
  pipingClass:{regex:'^/ASIM-1885-[0-9]+(?:"|-)-S[0-9]+-([A-Z0-9]+)'}},
 {lineKey:{regex:'^/ASIM-1885-PL-HOT-(S[0-9]+)'},
  pipingClass:{regex:'^/ASIM-1885-PL-HOT-S[0-9]+-([A-Z0-9]+)'}},
]}};
function inputs(){
 const sourceOccurrences=projectXmlCiiOccurrences({
   xmlText:combinedSourceText(),mode:'B',manifest:modeBManifest()});
 const branchRows=sourceOccurrences.branches.map((o,i)=>{
   const value=extractBranchFieldsWithFormats(o.branchName,config);
   return {branchOccurrenceIndex:i,branchName:o.branchName,
     extractionStatus:value.status,matchedFormatIndex:value.matchedFormatIndex,
     lineKey:value.lineKey,lineKeyMethod:'exact',
     pipingClass:value.pipingClass,pipingClassMethod:'format',
     rating:'300',ratingSource:'line-list',
     material:'A106',materialSource:'piping-class-material-map',
     materialCode:'P1',materialCodeMethod:'exact',p1:'100',
     p1Source:'line-list',sizeMm:80,wallThickness:'8.0',
     wallThicknessSource:'piping-class',corrosion:'1.5',
     corrosionSource:'master'};
 });
 return {basisId,sourceOccurrences,branchRows};
}
test('P4-A2: independent Format1/2 golden stays attached to original Mode B source ordinal',()=>{
 const source=inputs();
 const result=reconcilePreviewBranchEvidence(source);
 assert.equal(result.schema,'xml-cii-preview-branch-evidence/1');
 assert.equal(result.engineeringReady,false);
 assert.equal(result.engineeringAcceptance,'NOT_ASSESSED');
 assert.equal(result.sourceBranchCount,4);
 assert.deepEqual(result.branches.map(r=>[r.sourceId,r.branchOrdinal,r.formatIndex,
   r.fields.lineKey.candidate,r.fields.pipingClass.candidate]),golden.branches.map(x=>[
   x.sourceId,x.branchOrdinal,x.format-1,x.lineKey,x.pipingClass]));
 assert.equal(result.branches[0].branchName,result.branches[3].branchName);
 assert.notEqual(result.branches[0].occurrenceId,result.branches[3].occurrenceId);
 assert.equal(result.branches[0].fields.rating.method,'line-list');
 assert.equal(result.branches[0].fields.material.verification,'NOT_ASSESSED');
 assert.ok(Object.isFrozen(result.branches[0].fields));
 assert.throws(()=>result.branches.push({}),TypeError);
});
test('P4-A2: same branch name in distinct original source is never deduplicated',()=>{
 const r=reconcilePreviewBranchEvidence(inputs());
 assert.equal(new Set(r.branches.map(x=>x.branchName)).size,2);
 assert.equal(new Set(r.branches.map(x=>x.occurrenceId)).size,4);
 assert.deepEqual(r.branches.map(x=>x.sourceId),['P4-A','P4-A','P4-B','P4-B']);
});
test('P4-A2 negative: incomplete computed branches or mismatched original order fail',()=>{
 const data=inputs();
 assert.throws(()=>reconcilePreviewBranchEvidence({...data,
   branchRows:data.branchRows.slice(1)}),{code:'BRANCH_POPULATION_MISMATCH'});
 const altered=inputs();altered.branchRows[0].branchName='ANOTHER-BRANCH';
 assert.throws(()=>reconcilePreviewBranchEvidence(altered),{code:'BRANCH_IDENTITY_DRIFT'});
 const wrong=inputs();wrong.branchRows[1].branchOccurrenceIndex=0;
 assert.throws(()=>reconcilePreviewBranchEvidence(wrong),{code:'BRANCH_ORDINAL_DRIFT'});
});
test('P4-A2 negative: duplicate, missing or reindexed source identities reject authority',()=>{
 const duplicate=inputs();duplicate.sourceOccurrences={
   ...duplicate.sourceOccurrences,
   branches:duplicate.sourceOccurrences.branches.map(x=>({...x}))};
 duplicate.sourceOccurrences.branches[1].occurrenceId=duplicate.sourceOccurrences.branches[0].occurrenceId;
 assert.throws(()=>reconcilePreviewBranchEvidence(duplicate),{code:'DUPLICATE_ORIGINAL'});
 const missing=inputs();missing.sourceOccurrences.branches=[];
 assert.throws(()=>reconcilePreviewBranchEvidence(missing),{code:'SOURCE_CENSUS_REQUIRED'});
 const drift=inputs();drift.sourceOccurrences={
   ...drift.sourceOccurrences,
   branches:drift.sourceOccurrences.branches.map(x=>({...x}))};
 drift.sourceOccurrences.branches[2].branchOccurrenceIndex=0;
 assert.throws(()=>reconcilePreviewBranchEvidence(drift),{code:'ORIGINAL_IDENTITY_INVALID'});
});
test('P4-A2 negative: competing Format2 values stay candidates, never verified',()=>{
 const data=inputs();
 data.branchRows[1].extractionStatus='AMBIGUOUS';
 data.branchRows[1].branchIdentityConflict='EXACT_LINE_LIST_CLASS_CONFLICT';
 const r=reconcilePreviewBranchEvidence(data);
 const f=r.branches[1].fields;
 assert.equal(r.branches[1].extractionStatus,'AMBIGUOUS');
 assert.equal(r.branches[1].conflictReason,'EXACT_LINE_LIST_CLASS_CONFLICT');
 assert.equal(f.lineKey.value,null);
 assert.equal(f.pipingClass.value,null);
 assert.equal(f.rating.value,null);
 assert.equal(f.rating.candidate,'300');
 assert.equal(f.wallThickness.verification,'NOT_ASSESSED');
 assert.equal(r.engineeringReady,false);
});
test('P4-A2 negative: no source SHA or missing Worker evidence is a non-accepted result',()=>{
 const data=inputs();
 assert.throws(()=>reconcilePreviewBranchEvidence({...data,basisId:'short'}),{
  code:'BASIS_REQUIRED'});
 const r=reconcilePreviewBranchEvidence(data);
 assert.equal(r.engineeringAcceptance,'NOT_ASSESSED');
});
test('P4-A2 deployed docs and production modules have the same exact source',async()=>{
 const name='xml-cii-adapted-preview-facts-branch-evidence.js';
 const left=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/'+name,import.meta.url),'utf8');
 const right=await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/ui-adapted/'+name,import.meta.url),'utf8');
 assert.equal(left,right);
});
