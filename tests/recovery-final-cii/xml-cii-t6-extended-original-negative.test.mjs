// 212-T6 successor: additional bounded source-only negative oracles.
// Synthetic controls only; no original Firstpass/NC golden or physical authority changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBoundedOriginalXmlSourceFacts as build} from '../../lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-source-fact-handoff.mjs';
import {buildStandalonePreviewDiagnosticsAudit as audit} from '../../tabs/xml-cii-2019-standalone/xml-cii-preview-diagnostics-audit.js';

const row = (xmlIndex, path, ordinal, status='RESOLVED_POS') => ({
  xmlIndex, xmlNodeNumber:-1, xmlBranch:'/OWNER-A/Z-01',
  status, matchType:status==='RESOLVED_POS_PS'?'POS_PS':'POS',
  sourcePaths:path?[path]:[],
  positionMembers:path?[{sourcePath:path,jsonNodeNo:-1,sourceOrdinal:ordinal}]:[]
});
const entries = [
  row(1, '$[0].children[9]', 101),
  row(2, '$[0].children[11]', 103, 'RESOLVED_POS_PS'),
  {xmlIndex:3,xmlNodeNumber:-1,xmlBranch:'/OWNER-A/Z-01',
   status:'UNRESOLVED',sourcePaths:[],positionMembers:[]}
];
test('212-T6 preserve three ordered original occurrences including repeated -1 and distinct source ordinals', () => {
  const result=build(entries);
  assert.equal(result.available,true);
  assert.equal(result.matchedCount,2);
  assert.deepEqual(result.records.map(r=>r.xmlIndex),[1,2,3]);
  assert.deepEqual(result.records.map(r=>r.xmlNodeNumber),[-1,-1,-1]);
  assert.deepEqual(result.records.slice(0,2).map(r=>r.sourceOccurrences[0].sourceOrdinal),[101,103]);
  assert.deepEqual(result.records.slice(0,2).map(r=>r.sourceOccurrences[0].jsonNodeNo),[-1,-1]);
  assert.notEqual(result.records[0].sourcePaths[0],result.records[1].sourcePaths[0]);
});
test('212-T6 missing, reordered, shifted, and duplicate XML occurrence numbers fail closed', () => {
  for(const malformed of [
    [entries[0], entries[2]],
    [entries[1], entries[0], entries[2]],
    [{...entries[0],xmlIndex:0}, entries[1]],
    [entries[0], {...entries[1],xmlIndex:1}],
  ]) {
    const value=build(malformed);
    assert.equal(value.available,false);
    assert.equal(value.code,'LFJ_FACT_XML_ORDER');
  }
  assert.equal(build([]).code,'LFJ_FACT_LEDGER_EMPTY');
});
test('212-T6 missing matched JSON paths and forged statuses cannot make positive source packet', () => {
  for(const status of ['RESOLVED_FORGED','RESOLVED_POS_EXTRA','RESOLVED_']) {
    assert.equal(build([{...entries[0],status}]).code,'LFJ_FACT_STATUS');
  }
  assert.equal(build([row(1,'',10)]).code,'LFJ_FACT_SOURCE_PATH');
  assert.equal(build([row(1,'',10,'UNRESOLVED')]).available,true);
});
test('212-T6 source occurrence member-path fallback keeps original number and path, no guessed identity', () => {
  const input={...entries[0],sourcePaths:[],positionMembers:[
    {sourcePath:'$[0].children[9]',jsonNodeNo:-1,sourceOrdinal:101}
  ]};
  const result=build([input]);
  assert.equal(result.available,true);
  assert.equal(result.records[0].sourcePaths[0],'$[0].children[9]');
  assert.equal(result.records[0].sourceOccurrences[0].jsonNodeNo,-1);
  assert.equal(result.records[0].sourceOccurrences[0].sourceOrdinal,101);
});
test('212-T6 owner/source change and incomplete fact packet never display source facts as current', () => {
  const p={sourceOnly:true,engineeringReady:false,downloadAuthorized:false,
    mode:'lfj-indexed-preview',xmlNodes:3,matchedXmlNodes:2,
    sourceFactRecords:build(entries).records};
  const a=new Blob(['SOURCE-A']), b=new Blob(['SOURCE-B']);
  const receipt={preview:p,sourceFile:a,selectedScopeId:'/OWNER-A/Z-01'};
  const s={resolverSourceMode:'lfj-indexed-preview',lfjIndexedPreview:p,
    lfjIndexedExportReceipt:receipt,stagedJsonFile:a,
    jsonTraceScopeId:'/OWNER-A/Z-01'};
  assert.equal(audit(s).summary.resolverMatched,2);
  assert.equal(audit({...s,jsonTraceScopeId:'/OWNER-B/Z-02'}).summary.resolverMatched,0);
  assert.equal(audit({...s,stagedJsonFile:b}).summary.resolverMatched,0);
  assert.equal(audit({...s,lfjIndexedPreview:{...p,sourceFactRecords:[...p.sourceFactRecords].slice(0,2)}}).summary.resolverMatched,0);
  assert.equal(p.engineeringReady,false);
  assert.equal(p.downloadAuthorized,false);
});
test('212-T6 exact UTF-8 residual transfer cap and invalid cap reject; source untouched', () => {
  const unicode=row(1,'$[0].原始路径'.repeat(100),13);
  const full=build([unicode]);
  assert.equal(full.available,true);
  assert.ok(full.bytes>JSON.stringify(full.records).length);
  assert.equal(build([unicode],{remainingBytes:full.bytes}).available,true);
  assert.equal(build([unicode],{remainingBytes:full.bytes-1}).code,'LFJ_FACT_TRANSFER_BOUND');
  for(const remainingBytes of [-1,1.2,NaN,Infinity]){
    assert.equal(build([unicode],{remainingBytes}).code,'LFJ_FACT_BUDGET_INVALID');
  }
});