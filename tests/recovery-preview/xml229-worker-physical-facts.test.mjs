import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {installWeightBasisXmlDom} from '../../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {createPreviewBasis} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-basis.js';
import {digestUtf8} from '../../contracts/gc-pw-v1/contract.mjs';
import {openXml229SourceShadow} from '../../tabs/xml-cii-2019-standalone/integration/xml229-gcpw-source-shadow.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
if(!globalThis.DOMParser)installWeightBasisXmlDom(globalThis);
const sourceId='GLRD-1000-PI-01',digest='923a2b493483ecaaebe696f3d08a0b688f3ce3c9f456fb11b8e6a5889eea22ba';
const fixture=new URL('../../Benchmarks/XML%20to%20CII%202019/GLRD-1000-PI-01.xml',import.meta.url);
const original=readFile(fixture).then(bytes=>{
 assert.equal(bytes.byteLength,627599);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);
 return bytes.toString('utf8');
});
const children=(node,tag)=>[...(node?.childNodes||[])].filter(x=>x.nodeType===1&&
 String(x.localName||x.nodeName).replace(/^.*:/,'')===tag);
const fields=['Position','OutsideDiameter','WallThickness','Weight'];
function census(xml){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 const branches=children(doc.documentElement,'Pipe').flatMap(p=>children(p,'Branch'));
 const nodes=branches.flatMap(x=>children(x,'Node'));
 const expectedOccurrences=[];
 for(let b=0;b<branches.length;b++){
  expectedOccurrences.push({subjectType:'branch',sourceId,occurrenceId:JSON.stringify([sourceId,b,null,''])});
  const local=children(branches[b],'Node');
  for(let n=0;n<local.length;n++)expectedOccurrences.push({
   subjectType:'node',sourceId,occurrenceId:JSON.stringify([sourceId,b,n,'']),
  });
 }
 return {nodes,expectedOccurrences,branchCount:branches.length,nodeCount:nodes.length};
}
const options=xml=>({
 source:{sourceId,mediaType:'application/xml',text:xml},
 sourceGeneration:'authentic-glrd-v1',scope:{mode:'all'},
 masters:{weight:{datasetId:'fixture-master',revision:1,rows:[{weight:13,unit:'kg'}],mapping:{weight:'kg'}}},
 config:{rating:{tokenDelimiter:'-'}},overrides:{},stagedSource:null,
 ...(()=>{const c=census(xml);return{
  expectedOccurrences:c.expectedOccurrences,
  expectedSelectedPopulation:{branchCount:c.branchCount,nodeCount:c.nodeCount},
 };})(),
});
const basis=async o=>createPreviewBasis({
 domainId:'xml-cii/2019',sources:[o.source],selection:[{sourceId,selectionRef:'all@generation:'+o.sourceGeneration}],
 masters:o.masters,config:o.config,overrides:o.overrides,stagedSource:o.stagedSource,sha256:digestUtf8,
});
let serial=0;
async function executeRealWorker({xml,basisId,sourcePhysicalAudit=true,scope={mode:'A',sourceId},
 config,stagedJsonText='',urlPrefix='root'}={}){
 const originals={addEventListener:globalThis.addEventListener,
  postMessage:globalThis.postMessage,close:globalThis.close};
 let handler=null,closed=false;const messages=[];
 globalThis.addEventListener=(kind,fn)=>{if(kind==='message')handler=fn;};
 globalThis.postMessage=event=>messages.push(event);
 globalThis.close=()=>{closed=true;};
 try{
  const path=urlPrefix==='served'
   ?'../../docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-worker-entry.js'
   :'../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-worker-entry.js';
  await import(path+'?xml229-physical-audit='+ ++serial);
  assert.equal(typeof handler,'function');
  await handler({data:{protocol:'xml-cii-preview-local/1',kind:'execute',
   requestId:'physical-'+serial,basisId,xmlText:xml,config,stagedJsonText,scope,sourcePhysicalAudit}});
  assert.equal(closed,true,'terminal Worker message closes dedicated job');
  return messages;
 }finally{
  for(const [key,value] of Object.entries(originals)) {
   if(value===undefined)delete globalThis[key];else globalThis[key]=value;
  }
 }
}
test('actual GLRD Preview Worker emits bounded original-node physical source observations, never reviewed authority',async()=>{
 const xml=await original,o=options(xml),b=await basis(o),expected=census(xml);
 assert.deepEqual([expected.branchCount,expected.nodeCount],[41,1166]);
 const events=await executeRealWorker({xml,basisId:b.basisId,config:o.config});
 const end=events.at(-1);
 assert.equal(end?.state,'completed',JSON.stringify(end?.error));
 assert.equal(end.result.engineeringAcceptance,'NOT_ASSESSED');
 assert.equal(end.result.fullFactPopulationAccepted,false);
 const audit=end.result.sourcePhysicalAudit;
 assert.equal(audit.schema,'xml229-physical-source-audit/v1');
 assert.equal(audit.originalNodeCount,1166);
 assert.equal(audit.sourceFactCount,1166*4);
 assert.equal(audit.engineeringReady,false);
 assert.ok(audit.pages.length>1);
 assert.ok(audit.pages.every(p=>p.items.length>0&&p.items.length<=200&&p.complete===false));
 const records=audit.pages.flatMap(p=>p.items);
 assert.equal(records.length,4664);
 for(let n=0;n<expected.nodes.length;n++){
  const node=expected.nodes[n];
  for(let f=0;f<4;f++){
   const record=records[n*4+f],raw=String(children(node,fields[f])[0]?.textContent||'').trim();
   assert.equal(record.extensions.originalText,raw||null);
   assert.equal(record.basisId,b.basisId);
   assert.equal(record.occurrenceId,expected.expectedOccurrences
    .filter(x=>x.subjectType==='node')[n].occurrenceId);
   assert.ok(record.authority==='source'||record.authority==='unresolved');
   if(record.value!==null&&fields[f]==='Position'){
    assert.deepEqual(record.value,raw.split(/\s+/).map(Number));
   }
  }
 }
});

test('real physical Worker facts enter GC-PW read model only after independent original XML verification',async()=>{
 const xml=await original,o=options(xml),b=await basis(o);
 const events=await executeRealWorker({xml,basisId:b.basisId,config:o.config});
 const audit=events.at(-1).result.sourcePhysicalAudit;
 const read=await openXml229SourceShadow({...o,workerSourcePhysicalAudit:audit});
 assert.equal(read.basisId,b.basisId);
 assert.equal(read.readModel.info.engineeringReady,false);
 assert.equal(read.readModel.info.computationStage,'source-custody-only');
 const page=await read.getFacts({fieldId:'source.position.xyz',limit:200});
 assert.equal(page.totalCount,1166);
 assert.equal(page.complete,false);
 assert.throws(()=>read.openWeightReview(),e=>e?.code==='ENGINEERING_FACTS_UNVERIFIED');
 const modified=structuredClone(audit);
 modified.pages[0].items[0].value=[9,9,9];
 await assert.rejects(openXml229SourceShadow({...o,workerSourcePhysicalAudit:modified}),
  e=>e?.code==='PHYSICAL_FIELD_MISMATCH');
 const truncated=structuredClone(audit);truncated.pages.pop();
 await assert.rejects(openXml229SourceShadow({...o,workerSourcePhysicalAudit:truncated}),
  e=>['PHYSICAL_PAGE_TRUNCATED','PHYSICAL_PAGE_ORDER'].includes(e?.code));
 const crossed=structuredClone(audit);crossed.pages[0].basisId='b'.repeat(64);
 await assert.rejects(openXml229SourceShadow({...o,workerSourcePhysicalAudit:crossed}),
  e=>e?.code==='PHYSICAL_PAGE_INVALID');
});

test('selected Owner/zone still fails closed; opt-out preserves earlier Worker messages',async()=>{
 const xml=await original,o=options(xml),b=await basis(o);
 const selected=await executeRealWorker({xml,basisId:b.basisId,config:o.config,
  scope:{mode:'A',sourceId,selection:[{zone:'OWNER-UNATTESTED'}]}});
 assert.equal(selected.at(-1)?.state,'failed');
 assert.equal(selected.at(-1)?.error?.code,'SCOPED_ENGINEERING_PENDING');
 assert.ok(!selected.some(x=>x.state==='completed'));
 const noOpt=await executeRealWorker({xml,basisId:b.basisId,config:o.config,
  sourcePhysicalAudit:false,urlPrefix:'served'});
 assert.equal(noOpt.at(-1)?.state,'completed',JSON.stringify(noOpt.at(-1)?.error));
 assert.equal(noOpt.at(-1).result.sourcePhysicalAudit,undefined);
});

test('oversized source audit fails with a typed gate rather than truncating original population',async()=>{
 const parts=Array.from({length:2501},(_,i)=>
  '<Node><NodeNumber>'+i+'</NodeNumber><Position>'+i+' 0 0</Position></Node>');
 const xml='<PipeStressExport><Pipe><Branch><Branchname>/OVER-LIMIT/B1</Branchname>'+
  parts.join('')+'</Branch></Pipe></PipeStressExport>';
 const events=await executeRealWorker({xml,basisId:'a'.repeat(64),config:{}});
 const end=events.at(-1);
 assert.equal(end?.state,'failed',JSON.stringify(end));
 assert.equal(end.error?.code,'PHYSICAL_AUDIT_BOUNDED_LIMIT');
 assert.ok(!events.some(x=>x.state==='completed'));
});
