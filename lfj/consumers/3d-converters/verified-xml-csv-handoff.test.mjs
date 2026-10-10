/** A3: product-boundary positive/negative tests; original goldens stay untouched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  XML_NODE_TRACE_HEADERS, EVIDENCE_TREE_HEADERS, serializeRowsToCsv
} from '../../../tabs/xml-cii-2019-standalone/xml-cii-trace-export.js';
import {verifyResolverResearchHandoff} from './verified-xml-csv-handoff.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const originalSha256='a'.repeat(64),configDigest='b'.repeat(64);
const projectionSha256='c'.repeat(64),recordSha256='d'.repeat(64);
const evidenceDigest='e'.repeat(64);
const xmlText='<Root><NodeNumber>1</NodeNumber></Root>';
const nodeRow=()=>({
  xmlNode:'1',xmlBranch:'B-1',componentType:'SUPPORT',
  jsonNodeNoDtxrPs:'100',jsonNodeNoDtxrPos:'100',matchType:'POS/PS',
  posBasis:'E=1 N=2 EL=3',distanceMm:'0.000',toleranceMm:'6.000',
  dtxrPosValue:'POS',dtxrPsName:'SUP-A',dtxrPsValue:'SPREF',
  effectiveSource:'POS',derivedRestraints:'ANCHOR',status:'RESOLVED_POS_PS'
});
const evidenceRow=()=>({
  branch:'B-1',bore:'100',sourceNodeNo:'100',
  position:'E=1 N=2 EL=3',objectType:'SUPPORT',dtxrPos:'POS',
  name:'SUP-A',cmpSupGap:'',componentRefNo:'42',sourcePath:'$[0].children[0]'
});
function fixture() {
  const nodeWiseRows=[nodeRow()],evidenceTreeRows=[evidenceRow()];
  const nodeWiseCsv=serializeRowsToCsv(XML_NODE_TRACE_HEADERS,nodeWiseRows);
  const evidenceTreeCsv=serializeRowsToCsv(EVIDENCE_TREE_HEADERS,evidenceTreeRows);
  const bytes=x=>Buffer.byteLength(x,'utf8');
  const c={
    schema:'LFJ.B0.ResearchHandoff.v1',
    basis:{
      originalSha256,xmlSha256:sha(xmlText),
      projectionGeneration:'g1',sourceGeneration:'g1',
      projectionSha256,projectionConfigDigest:configDigest,
      matchingEvidenceDigestSha256:evidenceDigest,
      xmlNodes:1,xmlRecordsSha256:recordSha256
    },
    nodeWiseRows,evidenceTreeRows,nodeWiseCsv,evidenceTreeCsv,
    nodeWiseCsvSha256:sha(nodeWiseCsv),
    evidenceTreeCsvSha256:sha(evidenceTreeCsv),
    nodeWiseCsvBytes:bytes(nodeWiseCsv),
    evidenceTreeCsvBytes:bytes(evidenceTreeCsv),
    sourceOnly:true,engineeringReady:false,
    downloadAuthorized:false,appWired:false,
    payloadBytes:bytes(nodeWiseCsv)+bytes(evidenceTreeCsv)+
      bytes(JSON.stringify(nodeWiseRows))+bytes(JSON.stringify(evidenceTreeRows))
  };
  const result={
    schema:'LFJ.B0.XmlCsvResearch.v1',originalSha256,
    projectionSha256,projectionConfigDigest:configDigest,
    matchingEvidenceDigestSha256:evidenceDigest,
    xmlNodes:1,matchedXmlNodes:1,xmlRecordsSha256:recordSha256,
    nodeWiseCsvSha256:c.nodeWiseCsvSha256,
    evidenceTreeCsvSha256:c.evidenceTreeCsvSha256,
    nodeWiseCsvBytes:c.nodeWiseCsvBytes,
    evidenceTreeCsvBytes:c.evidenceTreeCsvBytes,
    sourceOnly:true,engineeringReady:false,
    downloadAuthorized:false,appWired:false,
    researchHandoff:c
  };
  const basis={originalSha256,xmlText,projectionConfigDigest:configDigest,
    revision:3,currentRevision:()=>3};
  return {result,basis,c};
}
const check=(r,b)=>verifyResolverResearchHandoff(r,b);
const rejected=async (r,b,code)=>assert.rejects(()=>check(r,b),e=>e?.code===code);

test('A3 accepts exact current native capsule as pending, never export rights',async()=>{
  const {result,basis}=fixture();
  const a=await check(result,basis);
  assert.equal(a.schema,'LFJ.A3.VerifiedResearchView.v1');
  assert.equal(a.xmlNodes,1);
  assert.equal(a.nodeWiseRows[0].status,'RESOLVED_POS_PS');
  assert.ok(a.nodeWiseCsv.startsWith('\ufeffXML Node,'));
  assert.ok(a.nodeWiseCsv.endsWith('\r\n'));
  assert.equal(sha(a.nodeWiseCsv),result.nodeWiseCsvSha256);
  assert.equal(sha(a.evidenceTreeCsv),result.evidenceTreeCsvSha256);
  assert.equal(a.downloadAuthorized,false);
  assert.equal(a.engineeringReady,false);
  assert.equal(a.appWired,false);
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.nodeWiseRows[0]));
});

test('A3 rejects both top-level and capsule self-promotion',async()=>{
  const {result,basis,c}=fixture();
  result.downloadAuthorized=true;
  await rejected(result,basis,'A3_RESEARCH_ONLY');
  result.downloadAuthorized=false;c.appWired=true;
  await rejected(result,basis,'A3_RESEARCH_ONLY');
});

test('A3 rejects wrong original JSON SHA',async()=>{
  const {result,basis}=fixture();
  await rejected(result,{...basis,originalSha256:'f'.repeat(64)},'A3_HANDOFF_IDENTITY');
});

test('A3 rejects changed capture alias/config digest',async()=>{
  const {result,basis}=fixture();
  await rejected(result,{...basis,projectionConfigDigest:'f'.repeat(64)},'A3_HANDOFF_IDENTITY');
});

test('A3 rejects XML mutation even with stable row/CSV summaries',async()=>{
  const {result,basis}=fixture();
  await rejected(result,{...basis,xmlText:basis.xmlText+' '},'A3_XML_CHANGED');
});

test('A3 rejects input revision changed while async digest pending',async()=>{
  const {result,basis}=fixture();let live=3;
  const pending=check(result,{...basis,currentRevision:()=>live});
  live=4;
  await assert.rejects(pending,e=>e?.code==='A3_PRODUCT_SUPERSEDED');
});

test('A3 rejects mutated DOM row despite unchanged CSV bytes/hashes',async()=>{
  const {result,basis,c}=fixture();
  c.nodeWiseRows[0].xmlNode='FORGED';
  await rejected(result,basis,'A3_HANDOFF_ROWS_CSV');
});

test('A3 rejects mutated CSV despite unchanged visible rows',async()=>{
  const {result,basis,c}=fixture();
  c.evidenceTreeCsv+='FORGED';
  await rejected(result,basis,'A3_HANDOFF_ROWS_CSV');
});

test('A3 refuses missing XML rows even with valid original digest labels',async()=>{
  const {result,basis,c}=fixture();
  c.nodeWiseRows=[];
  await rejected(result,basis,'A3_HANDOFF_CENSUS');
});

test('A3 refuses inconsistent claimed transport payload size',async()=>{
  const {result,basis,c}=fixture();
  c.payloadBytes++;
  await rejected(result,basis,'A3_HANDOFF_LIMIT');
});

test('A3 refuses malformed row shapes and forged row fields',async()=>{
  const {result,basis,c}=fixture();
  c.evidenceTreeRows[0].unexpected='FORGED';
  await rejected(result,basis,'A3_HANDOFF_ROWS');
});

test('A3 refuses mutated exact byte SHA, even when row/CSV text matches',async()=>{
  const {result,basis,c}=fixture();
  c.nodeWiseCsvSha256='f'.repeat(64);
  result.nodeWiseCsvSha256=c.nodeWiseCsvSha256;
  await rejected(result,basis,'A3_HANDOFF_CSV');
});

test('A3 requires live state callback, not a stale captured approval boolean',async()=>{
  const {result,basis}=fixture();
  await rejected(result,{...basis,currentRevision:undefined},'A3_PRODUCT_BASIS');
});
