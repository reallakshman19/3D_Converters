/**
 * #1104 A04-COMPOSE: actual original R03 Blob→R04 tokenizer→R05 OPEN/SEAL →
 * first-party #1104 published SOURCE_ONLY CAS → A04 typed owner candidate.
 * Not an H1 deployed browser test, not durable, not engineering authority.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openBlobSourceSnapshot} from '../../source/source-snapshot.mjs';
import {streamJsonOccurrenceEvents} from '../../index/source-occurrence-index.mjs';
import {createSourceFactsGenerationStore} from './source-generation-store.mjs';
import {projectPublishedSourceCandidate} from './published-source-typed-candidate.mjs';

const code=x=>e=>{assert.equal(e?.code,x);return true;};
const dataValue=[
  {type:'BRANCH',name:'/DUP',attributes:{OWNER_SITE:'/SITE'},
    children:[{type:'VALVE',name:'é',attributes:{OWNER_ZONE:'/CHILD'}}]},
  {type:'BRANCH',name:'/DUP',attributes:{OWNER_ZONE:'/OTHER'}}
];
async function realSource(value=dataValue){
  const data=new TextEncoder().encode(JSON.stringify(value));
  const sha=createHash('sha256').update(data).digest('hex');
  const snapshot=await openBlobSourceSnapshot(new Blob([data]),{
    revision:'A04-PUBLISHED-SOURCE',expectedSha256:sha,chunkBytes:64
  });
  const events=[];
  try{
    const summary=await streamJsonOccurrenceEvents(snapshot,{
      sourceRefId:'A04-ORIGINAL',pageEvents:5,pageBytes:64,
      onEventPage:async page=>events.push(...page)
    });
    const seals=new Map(events.filter(r=>r.kind==='SEAL')
      .map(r=>[r.occurrenceId,r.endByteExclusive]));
    const facts=events.filter(r=>r.kind==='OPEN').map(row=>({
      row,bytes:['string','number','boolean','null'].includes(row.type)?
        data.slice(row.startByte,seals.get(row.occurrenceId)):null,
      sourceOnly:true
    }));
    return {facts,summary,expectedBasis:{
      sourceRefId:'A04-ORIGINAL',sourceSha256:sha,
      sourceRevision:snapshot.revision,selectionDigest:'A04-ALL',
      jobId:'A04-APP-JOB',dependencyRevision:'A04-XML-MASTERS',
      byteLength:data.byteLength
    }};
  }finally{snapshot.close();}
}
function publish({facts,summary,expectedBasis}){
  let live={...expectedBasis};
  const sink=createSourceFactsGenerationStore({
    getCurrentBasis:()=>({...live}),maxFacts:4096,maxTotalBytes:8388608
  });
  sink.transaction.begin({expectedBasis,selectedCount:facts.length,
    sourceIndexSummary:summary,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
  for(const fact of facts)sink.transaction.stage(fact);
  const receipt={schema:'LFJ.3D.ConsumerSourceFactsReceipt.v1',
    complete:true,...expectedBasis,selectedCount:facts.length,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
  const publication=sink.transaction.commit({receipt,expectedBasis,
    getCurrentBasis:()=>({...live})});
  assert.equal(publication.committed,true);
  return {sink,update:(patch)=>{live={...live,...patch};}};
}
test('A04-COMPOSE original R05→first-party published source→R02 owners with duplicate names',async()=>{
  const source=await realSource();
  assert.equal(source.summary.occurrenceCount,source.facts.length);
  const {sink}=publish(source);
  const view=sink.readPublished();
  assert.equal(view.receipt.engineeringReady,false);
  assert.equal(view.sourceIndexSummary.occurrenceCount,source.facts.length);
  const v=projectPublishedSourceCandidate({generationStore:sink});
  assert.equal(v.rightsBasis,'SOURCE_ONLY_PROJECTED_CANDIDATE');
  assert.equal(v.engineeringReady,false);
  assert.equal(v.nodes.length,3);
  const [parent,child,other]=v.nodes;
  assert.equal(parent.name,'/DUP');
  assert.equal(child.name,'é');
  assert.equal(other.name,'/DUP');
  assert.notEqual(parent.occurrenceId,other.occurrenceId);
  assert.equal(parent.ownerSite,'/SITE');
  assert.equal(parent.ownerZone,null);
  assert.equal(child.parentOccurrenceId,parent.occurrenceId);
  assert.equal(child.ownerSite,'/SITE');
  assert.equal(child.ownerZone,'/CHILD');
  assert.equal(other.ownerZone,'/OTHER');
});
test('A04-COMPOSE an intentionally selected prefix CANNOT be a complete typed original hierarchy',async()=>{
  const original=await realSource();
  const subset=original.facts.filter(f=>f.row.path===''||f.row.path.startsWith('/0'));
  assert.ok(subset.length<original.facts.length);
  const {sink}=publish({...original,facts:subset});
  assert.equal(sink.readPublished().receipt.selectedCount,subset.length,
    'the source generation may legitimately publish selected R09 subsets');
  assert.throws(()=>projectPublishedSourceCandidate({generationStore:sink}),
    code('SOURCE_CENSUS_MISMATCH'),
    'A04 complete-source projection must reject a partial committed R09 selection');
});
test('A04-COMPOSE stale dependency / job / SHA closes candidate read',async()=>{
  for(const patch of [
    {dependencyRevision:'new XML or master'},
    {jobId:'new-job'},
    {sourceSha256:'altered-original'},
    {selectionDigest:'other-scope'}
  ]){
    const source=await realSource();
    const {sink,update}=publish(source);
    update(patch);
    assert.equal(sink.readPublished(),null);
    assert.throws(()=>projectPublishedSourceCandidate({generationStore:sink}),
      code('APP_SOURCE_GENERATION_REQUIRED'));
  }
});
test('A04-COMPOSE published scalar and census are detached from mutable caller/reader aliases',async()=>{
  const source=await realSource();
  const {sink}=publish(source);
  const published=sink.readPublished();
  const index=source.facts.findIndex(f=>f.row.path==='/0/name');
  const before=projectPublishedSourceCandidate({generationStore:sink});
  source.facts[index].bytes.fill(0); // mutate original caller bytes
  published.facts[index].bytes.fill(0); // mutate detached consumer read
  published.sourceIndexSummary.rootFacts.rootCount=991;
  const after=projectPublishedSourceCandidate({generationStore:sink});
  assert.deepEqual(after.nodes.map(x=>x.name),before.nodes.map(x=>x.name));
  assert.equal(sink.readPublished().sourceIndexSummary.rootFacts.rootCount,2);
});
test('A04-COMPOSE wrong source-only read model and unbound store cannot grant engineering facts',()=>{
  assert.throws(()=>projectPublishedSourceCandidate({generationStore:null}),
    code('APP_SOURCE_GENERATION_REQUIRED'));
  assert.throws(()=>projectPublishedSourceCandidate({generationStore:{
    readPublished:()=>({receipt:{engineeringReady:true}})
  }}),code('APP_SOURCE_GENERATION_INVALID'));
});
