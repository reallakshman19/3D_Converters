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
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1} from './authentic-original-output-goldens.mjs';
import {
  runStandaloneResolverJsonTrace
} from '../../../../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {
  buildXmlNodeWiseTraceCsv,buildEvidenceTreeCsv
} from '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-export.js';

const FIRSTPASS_GOLDEN=ORIGINAL_B0_OUTPUT_GOLDENS_V1.firstpass;
const ORIGINAL_SHA=FIRSTPASS_GOLDEN.jsonSha256;
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
assert.equal(originalBytes.length,FIRSTPASS_GOLDEN.jsonBytes,'real source bytes drift');
assert.equal(sha(originalBytes),ORIGINAL_SHA,'original source SHA drift');
const original=JSON.parse(originalBytes.toString('utf8'));
const config={};
const slice=slimSourceFromOriginal(original,config);
assert.equal(slice.branches.length,FIRSTPASS_GOLDEN.sourceRoots,'root source branch census drift');
assert.equal(slice.facts,FIRSTPASS_GOLDEN.sourceFacts,'source consumer facts census drift');
const outcomes=[];
for(const [kind,xmlPath] of Object.entries(xmlPaths)){
  const xmlBytes=await readFile(xmlPath);
  if(kind==='FIRSTPASS'){
    assert.equal(xmlBytes.length,FIRSTPASS_GOLDEN.xmlBytes,'original paired XML bytes drift');
    assert.equal(sha(xmlBytes),FIRSTPASS_GOLDEN.xmlSha256,'original paired XML SHA-256 drift');
  }
  const xmlText=xmlBytes.toString('utf8');
  const input={sourceKind:'xml',sourceText:xmlText,jsonConfig:config};
  const legacy=runStandaloneResolverJsonTrace({...input,stagedJsonText:original});
  const slim=runStandaloneResolverJsonTrace({...input,stagedJsonText:slice.branches});
  const left=legacy.traceResolutionLedger.records,right=slim.traceResolutionLedger.records;
  const actual=counts(left);
  if(kind==='FIRSTPASS'){
    assert.equal(left.length,FIRSTPASS_GOLDEN.xmlNodes,'authentic Firstpass XML count');
    assert.deepEqual(actual,FIRSTPASS_GOLDEN.statuses,'authentic Firstpass positive oracle');
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
  if(kind==='FIRSTPASS'){
    // The historic legacy oracle is a FIXED source-golden, independent of
    // the serializer currently imported by both comparison pathways.
    assert.equal(sha(JSON.stringify(left)),FIRSTPASS_GOLDEN.ledgerSha256,
      'original Firstpass whole ledger SHA-256 drift');
    assert.equal(sha(legacyNode),FIRSTPASS_GOLDEN.nodeWiseCsvSha256,
      'original Firstpass Node-wise CSV SHA-256 drift');
    assert.equal(sha(legacyEvidence),FIRSTPASS_GOLDEN.evidenceTreeCsvSha256,
      'original Firstpass Evidence Tree SHA-256 drift');
    assert.equal(Buffer.byteLength(legacyNode,'utf8'),FIRSTPASS_GOLDEN.nodeWiseCsvBytes,
      'original Firstpass Node-wise CSV byte count drift');
    assert.equal(Buffer.byteLength(legacyEvidence,'utf8'),FIRSTPASS_GOLDEN.evidenceTreeCsvBytes,
      'original Firstpass Evidence Tree byte count drift');
  }
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
