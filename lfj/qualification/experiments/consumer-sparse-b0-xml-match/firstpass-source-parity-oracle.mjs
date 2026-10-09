/**
 * #1147 B0-05 authentic SOURCE-level XML/CSV parity oracle.
 * Node-only, source-only qualification (NOT Worker/IDB/real UI acceptance).
 * Imports both actual production matching+CSV functions and the actual B0
 * evidence/record-to-node adapters. Does not use generated XML or fake DTXR.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {slimSourceFromOriginal} from './original-source-slim-fixture.mjs';
import {
  runStandaloneResolverJsonTrace
} from '../../../../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {
  buildXmlNodeWiseTraceCsv,buildEvidenceTreeCsv
} from '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-export.js';

const ORIGINAL_SHA='6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288';
const originalPath='Benchmarks/1885Sjson/Sjson.json';
const xmlPaths={
  FIRSTPASS:'Benchmarks/1885Sjson/FirstpassXML',
  EXPECTED:'Benchmarks/1885Sjson/ExpectedXML'
};
const sha=x=>createHash('sha256').update(x).digest('hex');
function counts(records){
  return records.reduce((out,record)=>
    (out[record.status]=(out[record.status]||0)+1,out),{});
}
const originalBytes=await readFile(originalPath);
assert.equal(originalBytes.length,733806,'real source bytes drift');
assert.equal(sha(originalBytes),ORIGINAL_SHA,'original source SHA drift');
const original=JSON.parse(originalBytes.toString('utf8'));
const config={};
const slice=slimSourceFromOriginal(original,config);
assert.equal(slice.branches.length,13,'root source branch census drift');
assert.equal(slice.facts,266,'source consumer facts census drift');
const outcomes=[];
for(const [kind,xmlPath] of Object.entries(xmlPaths)){
  const xmlText=await readFile(xmlPath,'utf8');
  const input={sourceKind:'xml',sourceText:xmlText,jsonConfig:config};
  const legacy=runStandaloneResolverJsonTrace({...input,stagedJsonText:original});
  const slim=runStandaloneResolverJsonTrace({...input,stagedJsonText:slice.branches});
  const left=legacy.traceResolutionLedger.records,right=slim.traceResolutionLedger.records;
  const actual=counts(left);
  if(kind==='FIRSTPASS'){
    assert.equal(left.length,216,'authentic Firstpass XML count');
    assert.deepEqual(actual,{
      UNRESOLVED:52,RESOLVED_POS:139,RESOLVED_POS_PS:25
    },'authentic Firstpass positive oracle');
  }else{
    assert.equal(left.length,174,'authentic Expected XML count');
    assert.deepEqual(actual,{UNRESOLVED:174},
      'authentic Expected XML is an all-unresolved NEGATIVE fixture');
  }
  assert.deepEqual(right,left,'complete XML resolution ledger changed: '+kind);
  const legacyNode=buildXmlNodeWiseTraceCsv(legacy);
  const slimNodeCsv=buildXmlNodeWiseTraceCsv(slim);
  const legacyEvidence=buildEvidenceTreeCsv(legacy);
  const slimEvidence=buildEvidenceTreeCsv(slim);
  assert.equal(slimNodeCsv,legacyNode,'real Node-wise CSV bytes differ: '+kind);
  assert.equal(slimEvidence,legacyEvidence,'real Evidence Tree CSV bytes differ: '+kind);
  if(kind==='FIRSTPASS')
    assert.ok(Buffer.byteLength(legacyEvidence,'utf8')>103,
      'positive engineering match must have nonempty Evidence Tree');
  outcomes.push({kind,xmlPath,xmlNodes:left.length,
    statuses:actual,matchedXmlNodes:left.filter(r=>r.status.startsWith('RESOLVED_')).length,
    fullLedgerSha256:sha(JSON.stringify(left)),
    nodeWiseCsvSha256:sha(legacyNode),
    evidenceTreeCsvSha256:sha(legacyEvidence),
    nodeWiseCsvBytes:Buffer.byteLength(legacyNode,'utf8'),
    evidenceTreeCsvBytes:Buffer.byteLength(legacyEvidence,'utf8')});
}
console.log('LFJ_B0_AUTHENTIC_SOURCE_PARITY_PASS '+JSON.stringify({
  schema:'LFJ.B0.AuthenticSourceParity.v1',originalPath,
  originalSha256:ORIGINAL_SHA,sourceRoots:slice.branches.length,
  sourceFacts:slice.facts,sourceDomainObjects:slice.sourceObjects,
  outputs:outcomes,sourceOnly:true,engineeringReady:false,
  chromiumWorkerQualified:false,deployedBuildQualified:false
}));
