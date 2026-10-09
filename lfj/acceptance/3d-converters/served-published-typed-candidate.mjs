/**
 * #1104 A04-COMPOSE. Provisional only: genuine Chromium native Worker +
 * IndexedDB source session -> first-party CAS -> original R05 typed owners.
 * Canonical authored docs/lfj H1 MUST be separately qualified by #1097.
 * NO Resolver/Enrichment, GC-PW, CII, XML/CSV or engineering rights.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const value=[
  {type:'BRANCH',name:'/DUP',attributes:{OWNER_SITE:'/SITE'},
    children:[{type:'VALVE',name:'é',attributes:{OWNER_ZONE:'/CHILD'}}]},
  {type:'BRANCH',name:'/DUP',attributes:{OWNER_ZONE:'/OTHER'}}
];
const original=JSON.stringify(value);
const expectedPaths=['','/0','/0/type','/0/name','/0/attributes',
  '/0/attributes/OWNER_SITE','/0/children','/0/children/0',
  '/0/children/0/type','/0/children/0/name','/0/children/0/attributes',
  '/0/children/0/attributes/OWNER_ZONE','/1','/1/type','/1/name',
  '/1/attributes','/1/attributes/OWNER_ZONE'];
const expectedHash=createHash('sha256').update(original).digest('hex');
const sourceDir='lfj/consumers/3d-converters/';
const routeFiles=[
  ['**/lfj/consumers/3d-converters/source-facts-receiver.mjs',
    sourceDir+'source-facts-receiver.mjs'],
  ['**/lfj/consumers/3d-converters/source-generation-store.mjs',
    sourceDir+'source-generation-store.mjs'],
  ['**/lfj/consumers/3d-converters/typed-own-attributes.mjs',
    sourceDir+'typed-own-attributes.mjs'],
  ['**/lfj/consumers/3d-converters/published-source-typed-candidate.mjs',
    sourceDir+'published-source-typed-candidate.mjs'],
  // These two original neutral dependencies are supplied as pinned source-only
  // test routes; NOT claims about public docs/lfj module closure.
  ['**/lfj/contracts/profiles/root-profile.mjs',
    'lfj/contracts/profiles/root-profile.mjs'],
  ['**/lfj/adapters/ownership/source-ownership.mjs',
    'lfj/adapters/ownership/source-ownership.mjs']
];
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  for(const [pattern,file] of routeFiles){
    const body=await readFile(file,'utf8');
    await page.route(pattern,route=>route.fulfill({
      status:200,contentType:'text/javascript',body
    }));
  }
  await page.goto('http://127.0.0.1:4186/lfj/served-durable-qualification.html',
    {waitUntil:'load'});
  const actual=await page.evaluate(async({original,expectedHash})=>{
    let consumer,store,projection,neutral;
    try{
      [consumer,store,projection,neutral]=await Promise.all([
        import('/lfj/consumers/3d-converters/source-facts-receiver.mjs'),
        import('/lfj/consumers/3d-converters/source-generation-store.mjs'),
        import('/lfj/consumers/3d-converters/published-source-typed-candidate.mjs'),
        Promise.all([
          import('/lfj/runtime/source-session.mjs'),
          import('/lfj/runtime/indexed-occurrence-pairs.mjs'),
          import('/lfj/storage/browser/indexed-record-store.mjs')
        ])
      ]);
    }catch(e){return {kind:'SERVE_IMPORT_REJECT',error:String(e?.message||e)};}
    const [{openSourceSession},{openIndexedOccurrencePairStore,createPairedIndexStore},
      {openIndexedRecordStore}]=neutral;
    const {consumeSelectedSourceFacts}=consumer;
    const {createSourceFactsGenerationStore}=store;
    const {projectPublishedSourceCandidate}=projection;
    const bytes=new TextEncoder().encode(original);
    const sourceHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
      n=>n.toString(16).padStart(2,'0')).join('');
    if(sourceHash!==expectedHash)
      return {kind:'SOURCE_SHA_MISMATCH',sourceHash,expectedHash};
    const once=async(stale)=>{
      const jobId='A04-typed-'+crypto.randomUUID();
      const sourceRefId='A04-original-'+crypto.randomUUID();
      const sourceRevision='A04:sha256:'+sourceHash;
      const selectionDigest='A04-SOURCE-ALL';
      const dependencyRevision='A04-pinned-XML-config-masters';
      const basis={sourceRefId,sourceSha256:sourceHash,sourceRevision};
      const expectedBasis={...basis,selectionDigest,jobId,dependencyRevision,
        byteLength:bytes.byteLength};
      let current={...expectedBasis};
      const db='lfj-1104-a04-real-'+crypto.randomUUID();
      let source,selected,pair,session,sourceStore,receipt,error=null,candidate=null;
      let stagedCount=0;
      try{
        source=await openIndexedRecordStore({databaseName:db,namespace:'source',
          generation:jobId,basis,kind:'source'});
        selected=await openIndexedRecordStore({databaseName:db,
          namespace:'selected',generation:jobId,basis,kind:'selection',
          selectionDigest,jobEpoch:jobId});
        pair=await openIndexedOccurrencePairStore({databaseName:db+'-pairs',
          namespace:'source',generation:jobId,basis});
        sourceStore=createSourceFactsGenerationStore({
          getCurrentBasis:()=>({...current}),maxFacts:128,maxTotalBytes:65536
        });
        const txn={
          begin:args=>sourceStore.transaction.begin(args),
          stage:f=>{
            sourceStore.transaction.stage(f);stagedCount++;
            if(stale&&stagedCount===3)
              current.dependencyRevision='superseded XML and master during source staging';
          },
          commit:args=>sourceStore.transaction.commit(args),
          abort:args=>sourceStore.transaction.abort(args)
        };
        session=await openSourceSession({
          blob:new Blob([bytes]),revision:'A04',expectedSha256:sourceHash,
          sourceRefId,jobId,selectionDigest,
          selection:{mode:'ALL',includes:[],excludes:[]},
          trustedWorkerCtor:Worker,
          createWorker:()=>new Worker(
            new URL('/lfj/ports/source-browser-worker.mjs',location.origin),
            {type:'module'}),
          indexStore:createPairedIndexStore({indexStore:source,pairPort:pair}),
          selectedStore:selected,getCurrentBasis:()=>({...current}),pageEvents:3
        });
        try{
          receipt=await consumeSelectedSourceFacts({
            session,expectedBasis,getCurrentBasis:()=>({...current}),
            transaction:txn,maxRows:3,maxPageBytes:65536,maxScalarBytes:2048
          });
          candidate=projectPublishedSourceCandidate({generationStore:sourceStore});
        }catch(e){error=e?.code||String(e?.message||e);}
        const published=sourceStore.readPublished();
        let afterCloseCode=null;
        try{await session.readPage({cursor:null,maxRows:3,maxBytes:65536});}
        catch(e){afterCloseCode=e?.code||String(e);}
        return {
          error,receipt,stagedCount,
          workerConsumed:session.receipt?.workerConsumedBytes,
          sourceOccurrenceCount:session.summary?.occurrenceCount,
          publishedSelectedCount:published?.receipt.selectedCount??null,
          publishedOriginalCount:published?.sourceIndexSummary.occurrenceCount??null,
          publishedPaths:published?.facts.map(f=>f.row.path)??[],
          candidateNodes:candidate?.nodes.map(x=>({
            name:x.name,type:x.type,occurrenceId:x.occurrenceId,
            parentOccurrenceId:x.parentOccurrenceId,ownerSite:x.ownerSite,
            ownerZone:x.ownerZone,engineeringReady:x.engineeringReady
          }))??[],
          candidateRights:candidate?.rightsBasis??null,
          candidateReady:candidate?.engineeringReady??null,
          afterCloseCode
        };
      }finally{
        try{await session?.close();}catch{}
        try{source?.close();}catch{}
        try{selected?.close();}catch{}
        try{pair?.close();}catch{}
        indexedDB.deleteDatabase(db);indexedDB.deleteDatabase(db+'-pairs');
      }
    };
    return {kind:'SOURCE_ONLY_TYPED_BROWSER_RESULTS',sourceHash,
      positive:await once(false),superseded:await once(true)};
  },{original,expectedHash});
  assert.equal(actual.kind,'SOURCE_ONLY_TYPED_BROWSER_RESULTS',
    JSON.stringify(actual));
  assert.equal(actual.sourceHash,expectedHash);
  const p=actual.positive;
  assert.equal(p.error,null);
  assert.equal(p.receipt.complete,true);
  assert.equal(p.receipt.engineeringReady,false);
  assert.equal(p.receipt.rightsBasis,'SOURCE_FACTS_ONLY');
  assert.equal(p.workerConsumed,Buffer.byteLength(original));
  assert.equal(p.sourceOccurrenceCount,expectedPaths.length);
  assert.equal(p.publishedSelectedCount,expectedPaths.length);
  assert.equal(p.publishedOriginalCount,expectedPaths.length);
  assert.deepEqual(p.publishedPaths,expectedPaths);
  assert.equal(p.candidateRights,'SOURCE_ONLY_PROJECTED_CANDIDATE');
  assert.equal(p.candidateReady,false);
  assert.equal(p.candidateNodes.length,3);
  const [parent,child,other]=p.candidateNodes;
  assert.equal(parent.name,'/DUP');
  assert.equal(parent.type,'BRANCH');
  assert.equal(parent.ownerSite,'/SITE');
  assert.equal(parent.ownerZone,null);
  assert.equal(child.name,'é');
  assert.equal(child.type,'VALVE');
  assert.equal(child.ownerSite,'/SITE');
  assert.equal(child.ownerZone,'/CHILD');
  assert.equal(child.parentOccurrenceId,parent.occurrenceId);
  assert.equal(other.name,'/DUP');
  assert.equal(other.ownerZone,'/OTHER');
  assert.notEqual(other.occurrenceId,parent.occurrenceId);
  assert.equal(p.candidateNodes.every(n=>n.engineeringReady===false),true);
  assert.equal(p.afterCloseCode,'SESSION_CLOSED');
  const s=actual.superseded;
  assert.equal(s.error,'CONSUMER_BASIS_STALE');
  assert.equal(s.publishedSelectedCount,null);
  assert.equal(s.candidateNodes.length,0);
  assert.equal(s.afterCloseCode,'SESSION_CLOSED');
  assert.deepEqual(pageErrors,[]);
  console.log('A04 actual Chromium Worker+native IndexedDB -> first-party complete published R05 -> typed R02 source-only candidate PASS (PROVISIONAL non-docs)');
}finally{
  await browser.close();
}
