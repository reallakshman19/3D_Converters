import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createPreviewBasis} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-basis.js';
import {attestLiveBasis} from '../contracts/gc-pw-v1/occurrence-bridge.mjs';
import {digestUtf8, digestCanonical} from '../contracts/gc-pw-v1/contract.mjs';
import {isolatedOriginalPreviewWorkConfig} from '../tabs/xml-cii-2019-standalone/integration/xml229-original-preview-work-config.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;

test('Owner-shaped 385/10699/383/1595 master rows survive both independent Preview calculations without changing the source InputBasis',async()=>{
 const weightRows=JSON.parse(await readFile(
   new URL('../docs/Masters/wtValveweights.json',import.meta.url),'utf8'));
 const classRows=JSON.parse(await readFile(
   new URL('../docs/Masters/Piping_class_master.json',import.meta.url),'utf8'));
 assert.equal(weightRows.length,1595);
 assert.equal(classRows.length,10699);
 const lineRows=Array.from({length:385},(_,i)=>({
   'Line Number':String(i+1),'From':'F'+i,'To':'T'+i,'Piping Class':'31441C4',
   'Design Pressure':String(15+i/10),
   '_raw':{'lineNo':String(i+1),'rowIndex':i,'nested':[2,3]},
 }));
 const materialRows=Array.from({length:383},(_,i)=>({'Code':'M'+i,'Material':'A106-B'}));
 const specs={lineList:lineRows,pipingClass:classRows,materialMap:materialRows,weight:weightRows};
 const masters=Object.fromEntries(Object.entries(specs).map(([k,rows])=>[
   k,{datasetId:k+'-Owner-lease',revision:2,rows,mapping:{checked:true}},
 ]));
 const config={linelist:{masterRows:lineRows},pipingClass:{masterRows:classRows},
   material:{mapRows:materialRows},weight:{masterRows:weightRows},overrides:{}};
 const sources=[{sourceId:'OwnerXML',mediaType:'application/xml',
   text:'<PipeStressExport><Branch><Node><NodeNumber>-1</NodeNumber></Node></Branch></PipeStressExport>'}];
 const selection=[{sourceId:'OwnerXML',selectionRef:'all'}],overrides={};
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',sources,
   selection,masters,config,overrides,sha256:digestUtf8});
 const live=()=>({basis,sources:{OwnerXML:sources[0].text},
   masters,selection,stagedSource:null,config,overrides});
 await attestLiveBasis(live());
 const originalHashes=Object.fromEntries(await Promise.all(
   Object.entries(masters).map(async([k,v])=>[k,await digestCanonical(v.rows)])));
 // Reproduce a legacy computation-side normalization / reordering operation.
 // Both Preview and independent source-cleanup must receive detached buffers.
 const dryRun=isolatedOriginalPreviewWorkConfig(config);
 dryRun.linelist.masterRows[0].From='computation-mutation';
 dryRun.linelist.masterRows[0]._raw.nested.push(7);
 dryRun.linelist.masterRows.reverse();
 const census=isolatedOriginalPreviewWorkConfig(config);
 census.linelist.masterRows[1]['Design Pressure']='999';
 census.pipingClass.masterRows[0]={...census.pipingClass.masterRows[0],tag:'temporary'};
 census.weight.masterRows[0].weight=7777;
 await attestLiveBasis(live());
 for(const [k,v] of Object.entries(masters))
   assert.equal(await digestCanonical(v.rows),originalHashes[k],k+' mutated in actual source/master basis');
 assert.equal(config.linelist.masterRows[0].From,'F0');
 assert.deepEqual(config.linelist.masterRows[0]._raw.nested,[2,3]);
 assert.equal(dryRun.linelist.masterRows.length,385);
 assert.equal(census.pipingClass.masterRows.length,10699);
 assert.notStrictEqual(dryRun.linelist.masterRows,masters.lineList.rows);
 assert.notStrictEqual(census.linelist.masterRows,masters.lineList.rows);
 assert.notStrictEqual(dryRun.linelist.masterRows[0],census.linelist.masterRows[384]);
});
test('real master edits remain fail-closed; isolation must never hide a changed Owner Line List',async()=>{
 const rows=[{line:'x',p:20}];
 const masters={lineList:{datasetId:'file-1',revision:1,rows,mapping:{line:'line'}}};
 const config={linelist:{masterRows:rows}};
 const sources=[{sourceId:'SRC',mediaType:'application/xml',text:'<xml/>'}];
 const selection=[{sourceId:'SRC',selectionRef:'all'}],overrides={};
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',sources,masters,
   selection,config,overrides,sha256:digestUtf8});
 const live=()=>({basis,sources:{SRC:'<xml/>'},masters,selection,
   stagedSource:null,config,overrides});
 await attestLiveBasis(live());
 isolatedOriginalPreviewWorkConfig(config).linelist.masterRows[0].p=99;
 await attestLiveBasis(live());
 rows[0].p=99; // actual source edit, not isolated calculation
 await assert.rejects(()=>attestLiveBasis(live()),e=>(assert.equal(e.code,'MASTER_CONTENT_DRIFT'),true));
});
test('root and served isolation modules remain byte-identical',async()=>{
 const root=await readFile(new URL('../tabs/xml-cii-2019-standalone/integration/xml229-original-preview-work-config.mjs',import.meta.url),'utf8');
 const mirror=await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/integration/xml229-original-preview-work-config.mjs',import.meta.url),'utf8');
 assert.equal(root,mirror);
 for(const file of ['xml229-original-blob-gcpw-worker.mjs','xml229-preview-engineering-fact-producer.mjs']){
   const r=await readFile(new URL('../tabs/xml-cii-2019-standalone/integration/'+file,import.meta.url),'utf8');
   const d=await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/integration/'+file,import.meta.url),'utf8');
   assert.equal(r,d);
   assert.match(r,/isolatedOriginalPreviewWorkConfig/);
 }
});
