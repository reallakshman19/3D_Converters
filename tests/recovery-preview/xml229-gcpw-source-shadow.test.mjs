import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {installWeightBasisXmlDom} from '../../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {openXml229SourceShadow} from '../../tabs/xml-cii-2019-standalone/integration/xml229-gcpw-source-shadow.js';
import {openXml229SourceShadow as servedShadow}
  from '../../docs/tabs/xml-cii-2019-standalone/integration/xml229-gcpw-source-shadow.js';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
if(!globalThis.DOMParser)installWeightBasisXmlDom(globalThis);
const SOURCE_ID='GLRD-1000-PI-01';
const original=new URL('../../Benchmarks/XML%20to%20CII%202019/GLRD-1000-PI-01.xml',import.meta.url);
const xmlPromise=readFile(original).then(bytes=>{
 assert.equal(bytes.byteLength,627599);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),
  '923a2b493483ecaaebe696f3d08a0b688f3ce3c9f456fb11b8e6a5889eea22ba');
 return bytes.toString('utf8');
});
const direct=(node,part)=>[...(node?.childNodes||[])].filter(x=>x.nodeType===1
 &&String(x.localName||x.nodeName).replace(/^.*:/,'')===part);

// Independent canonical census directly from the ORIGINAL source tree.
// Never derive expected identities/counts from projectXmlCiiOccurrences,
// its FactRecords, or the Worker output under test.
function independentCensus(xml,sourceId,selected=null) {
 const root=new DOMParser().parseFromString(xml,'application/xml').documentElement;
 const out=[],branches=direct(root,'Pipe').flatMap(p=>direct(p,'Branch'));
 for(const [ordinal,branch] of branches.entries()){
  if(selected!==null&&!selected.includes(ordinal))continue;
  out.push({subjectType:'branch',sourceId,occurrenceId:JSON.stringify([sourceId,ordinal,null,''])});
  for(const [nodeOrdinal] of direct(branch,'Node').entries())
   out.push({subjectType:'node',sourceId,occurrenceId:JSON.stringify([sourceId,ordinal,nodeOrdinal,''])});
 }
 return {expectedOccurrences:out,expectedSelectedPopulation:{
  branchCount:out.filter(x=>x.subjectType==='branch').length,
  nodeCount:out.filter(x=>x.subjectType==='node').length,
 },totalOriginalBranches:branches.length};
}
function options(xml,selected=null,generation='v1'){
 const c=independentCensus(xml,SOURCE_ID,selected);
 return {
  source:{sourceId:SOURCE_ID,mediaType:'application/xml',text:xml},
  sourceGeneration:generation,
  scope:selected===null?{mode:'all'}:{mode:'branches',branches:selected},
  masters:{weight:{datasetId:'weight-master',revision:1,
   rows:[{kg:15,Rating:'150',bore:50}],mapping:{weightKg:'kg'}}},
  config:{rating:{version:'v1'}},overrides:{},stagedSource:null,
  ...c,
 };
}
const codeIs=code=>e=>e?.code===code;

test('actual GLRD 41 branches/1166 nodes are independently enumerated and read as source-only GC-PW FactPages',async()=>{
 const xml=await xmlPromise,args=options(xml);
 assert.equal(args.totalOriginalBranches,41);
 assert.equal(args.expectedSelectedPopulation.nodeCount,1166);
 const session=await openXml229SourceShadow(args);
 assert.equal(session.status,'SOURCE_CUSTODY_ONLY');
 assert.equal(session.selectedBranchCount,41);
 assert.equal(session.selectedNodeCount,1166);
 assert.equal(session.readModel.info.engineeringReady,false);
 assert.equal(session.readModel.info.computationStage,'source-custody-only');
 assert.equal(session.readModel.info.expectedOccurrenceCount,41+1166);
 assert.throws(()=>session.openWeightReview(),codeIs('ENGINEERING_FACTS_UNVERIFIED'));
 let cursor=null,read=0,markers=0;
 do{
  const page=await session.getFacts({cursor,limit:200});
  assert.equal(page.basisId,session.basisId);
  assert.equal(page.complete,page.nextCursor===null,
   'only the final bounded fact page is complete; intermediate cursors must remain incomplete');
  for(const fact of page.items){
   assert.equal(fact.authority==='source'||fact.authority==='unresolved',true);
   assert.equal(fact.basisId,session.basisId);
   if(fact.fieldId==='source.occurrence')markers++;
  }
  read+=page.items.length;
  cursor=page.nextCursor;
 }while(cursor!==null);
 assert.equal(read,session.sourceFactCount);
 assert.equal(markers,1207,'every source Branch+Node retains an original occurrence receipt');
});

test('one explicitly selected GLRD branch is exactly scoped, never inferred as ALL',async()=>{
 const xml=await xmlPromise,args=options(xml,[2]);
 const session=await openXml229SourceShadow(args);
 assert.equal(session.selectedBranchCount,1);
 assert.equal(session.selectedNodeCount,args.expectedSelectedPopulation.nodeCount);
 assert.ok(session.selectedNodeCount<1166);
 const source=await session.getFacts({subjectType:'node',limit:200});
 assert.equal(source.totalCount,session.selectedNodeCount*5);
 const ids=new Set(source.items.map(x=>x.occurrenceId));
 assert.ok([...ids].every(x=>JSON.parse(x)[1]===2));
 assert.throws(()=>session.openWeightReview(),codeIs('ENGINEERING_FACTS_UNVERIFIED'));
});

test('duplicate -1 NodeNumbers and repeated identities remain distinct original ordinals',async()=>{
 const xml=await xmlPromise,args=options(xml);
 const session=await openXml229SourceShadow(args);
 const expectedIds=args.expectedOccurrences.map(x=>x.occurrenceId);
 assert.equal(new Set(expectedIds).size,expectedIds.length);
 const nums=[...xml.matchAll(/<NodeNumber>-1<\/NodeNumber>/g)].length;
 assert.ok(nums>0,'original GLRD contains real repeated negative node numbers');
 const facts=await session.getFacts({fieldId:'source.nodeNumber',limit:200});
 assert.equal(facts.totalCount,1166,'no negative-node coalescing at source read model');
});

test('same-length changed source, same-count changed master, and per-file generation re-key the SHA basis',async()=>{
 const xml=await xmlPromise,base=options(xml,[0]);
 const initial=await openXml229SourceShadow(base);
 const changedXml=xml.replace('/GLRD-1000-PI-01','/GLRD-1000-PI-02');
 assert.equal(changedXml.length,xml.length,'equal-length modified original source');
 const changed=await openXml229SourceShadow(options(changedXml,[0]));
 assert.notEqual(changed.basisId,initial.basisId);
 const master=options(xml,[0]);master.masters.weight.rows[0].kg=99;
 assert.notEqual((await openXml229SourceShadow(master)).basisId,initial.basisId);
 assert.notEqual((await openXml229SourceShadow(options(xml,[0],'v2'))).basisId,initial.basisId);
});

test('identity omissions, duplicate receipts and invalid scope fail closed',async()=>{
 const xml=await xmlPromise;
 const absent=options(xml,[0]);absent.expectedOccurrences.pop();
 await assert.rejects(openXml229SourceShadow(absent),codeIs('SOURCE_IDENTITY_MISMATCH'));
 const dup=options(xml,[0]);dup.expectedOccurrences.push(dup.expectedOccurrences[0]);
 await assert.rejects(openXml229SourceShadow(dup),codeIs('DUPLICATE_ORIGINAL'));
 const wrong=options(xml,[0]);wrong.expectedOccurrences[0].occurrenceId='other/branch';
 await assert.rejects(openXml229SourceShadow(wrong),codeIs('SOURCE_IDENTITY_MISMATCH'));
 for(const scope of [null,{}, {mode:'branches',branches:[]},
  {mode:'branches',branches:[1,1]},{mode:'all',branches:[]}]) {
  await assert.rejects(openXml229SourceShadow({...options(xml,[0]),scope}),
   e=>['EXPLICIT_SCOPE_REQUIRED','INVALID_SCOPE'].includes(e?.code));
 }
});

test('late cancellation and master mutation before second attestation never opens a shadow read model',async()=>{
 const xml=await xmlPromise;
 const cancelled=options(xml,[0]);cancelled.isCancelled=()=>true;
 await assert.rejects(openXml229SourceShadow(cancelled),codeIs('CANCELLED'));
 const drift=options(xml,[0]);
 drift.parseXml=value=>{
  const doc=new DOMParser().parseFromString(value,'application/xml');
  drift.masters.weight.rows[0].kg=123;
  return doc;
 };
 await assert.rejects(openXml229SourceShadow(drift),codeIs('STALE_INPUT_BASIS'));
});

test('served mirror is byte-identical and has equal source-custody behavior',async()=>{
 const path='../../tabs/xml-cii-2019-standalone/integration/xml229-gcpw-source-shadow.js';
 const served='../../docs/tabs/xml-cii-2019-standalone/integration/xml229-gcpw-source-shadow.js';
 assert.equal(await readFile(new URL(path,import.meta.url),'utf8'),
  await readFile(new URL(served,import.meta.url),'utf8'));
 const xml=await xmlPromise,args=options(xml,[0]);
 const a=await openXml229SourceShadow(args),b=await servedShadow(args);
 assert.equal(a.basisId,b.basisId);
 assert.equal(a.sourceFactCount,b.sourceFactCount);
 assert.equal(b.readModel.info.engineeringReady,false);
});
