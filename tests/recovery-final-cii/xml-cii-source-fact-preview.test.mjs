import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBoundedOriginalXmlSourceFacts as build} from '../../lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-source-fact-handoff.mjs';
import {buildStandalonePreviewDiagnosticsAudit as preview} from '../../tabs/xml-cii-2019-standalone/xml-cii-preview-diagnostics-audit.js';
const rows=[{xmlIndex:1,xmlNodeNumber:-1,xmlBranch:'B1',status:'RESOLVED_POS',matchType:'POS',sourcePaths:['$[0].children[0]'],positionMembers:[{sourcePath:'$[0].children[0]',jsonNodeNo:-1,sourceOrdinal:21}]},
{xmlIndex:2,xmlNodeNumber:-1,xmlBranch:'B1',status:'RESOLVED_POS_PS',matchType:'POS_PS',sourcePaths:['$[0].children[1]'],positionMembers:[{sourcePath:'$[0].children[1]',jsonNodeNo:-1,sourceOrdinal:22}]},
{xmlIndex:3,xmlNodeNumber:3,xmlBranch:'B1',status:'UNRESOLVED',sourcePaths:[],positionMembers:[]}];
test('212-T5 preserves both repeated -1 identities and exact original source paths',()=>{
  const r=build(rows);assert.equal(r.available,true);assert.equal(r.matchedCount,2);
  assert.deepEqual(r.records.map(f=>f.xmlIndex),[1,2,3]);
  assert.deepEqual(r.records.slice(0,2).map(f=>f.sourcePaths[0]),['$[0].children[0]','$[0].children[1]']);
  assert.deepEqual(r.records.slice(0,2).map(f=>f.sourceOccurrences[0].jsonNodeNo),[-1,-1]);
});
test('212-T5 refuses missing source path, out-of-order XML and truncated transport',()=>{
  assert.equal(build([rows[1]]).code,'LFJ_FACT_XML_ORDER');
  assert.equal(build([{...rows[0],sourcePaths:[],positionMembers:[]}]).code,'LFJ_FACT_SOURCE_PATH');
  assert.equal(build(rows,{remainingBytes:3}).code,'LFJ_FACT_TRANSFER_BOUND');
});
test('212-T5 source-only Preview represents original ledger only with current selected source receipt',()=>{
  const stagedJsonFile=new Blob(['data']),rec=build(rows).records;
  const p={mode:'lfj-indexed-preview',sourceOnly:true,engineeringReady:false,downloadAuthorized:false,
    sourceFactRecords:rec,xmlNodes:3,matchedXmlNodes:2};
  const receipt={preview:p,sourceFile:stagedJsonFile,selectedScopeId:'Owner-A'};
  const s={resolverSourceMode:'lfj-indexed-preview',lfjIndexedPreview:p,lfjIndexedExportReceipt:receipt,
    stagedJsonFile,jsonTraceScopeId:'Owner-A'};
  const a=preview(s);assert.equal(a.summary.resolverMatched,2);
  assert.equal(a.summary.resolverRejected,1);
  assert.equal(a.matchedFacts[0].source,'lfj-indexed-source-only');
  assert.equal(a.matchedFacts[0].raw.engineeringReady,false);
  assert.equal(preview({...s,jsonTraceScopeId:'Owner-B'}).summary.resolverMatched,0);
});
