/**
 * NEXT-06C: actual native CII ELEMENTS + COORDS geometry, independent reconstruction.
 * Do not infer source occurrence identity from numerical CII node IDs. This remains
 * test-only author characterization, not approved B4 topology or full Mode A/B.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join,resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {tmpdir} from 'node:os';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const original=join(root,'Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml');
const script=join(root,'converters/scripts/xml_to_cii2019_runtime_custody.py');
const artifacts=process.env.RUNNER_TEMP||tmpdir();
const expectedHash='923a2b493483ecaaebe696f3d08a0b688f3ce3c9f456fb11b8e6a5889eea22ba';
const toleranceMm=1.0; // CII ELEMENTS uses six significant decimal digits, quantized locally.
const witnesses=[
  {id:10,xyz:[111369.76,101088.18,-108416.90]},
  {id:760,xyz:[109700,101229.30,-107022.33]},
  {id:1200,xyz:[108200,101229.30,-107022.33]},
  {id:1640,xyz:[106700,101229.30,-107022.33]},
  {id:2080,xyz:[105200,101229.30,-107022.33]},
  {id:2520,xyz:[103700,101229.30,-107022.33]},
  {id:2960,xyz:[102200,101229.30,-107022.33]},
];
const wrong=(code,message)=>Object.assign(new Error(message),{code});
const dist=(a,b)=>Math.sqrt(a.reduce((sum,x,i)=>sum+(x-b[i])**2,0));
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const neg=(a)=>a.map(x=>-x);
function readNumber(row,start,width,label){
 const v=Number(row.slice(start,start+width).trim());
 if(!Number.isFinite(v))throw wrong('INVALID_CII_NUMBER','Nonfinite '+label);
 return v;
}
function parseNeutralCii(text){
 const lines=text.split(/\r?\n/), section=name=>lines.findIndex(x=>x==='#$ '+name);
 const start=section('ELEMENTS'), coordStart=section('COORDS');
 if(start<0||coordStart<0)throw wrong('CII_SECTIONS_REQUIRED','Need native ELEMENTS/COORDS');
 const end=lines.findIndex((x,i)=>i>start&&x.startsWith('#$ '));
 if(end<0)throw wrong('CII_ELEMENT_TERMINATOR_REQUIRED','Missing ELEMENTS section terminator');
 const payload=lines.slice(start+1,end);
 if(payload.length%15!==0)throw wrong('CII_ELEMENT_WIDTH_INVALID','Each ELEMENTS record must be 15 rows');
 const edges=[];
 for(let i=0;i<payload.length;i+=15){
   const row=payload[i];
   if(row.length<80)throw wrong('CII_ELEMENT_WIDTH_INVALID','Each first ELEMENTS row requires six fixed fields');
   const from=readNumber(row,0,15,'from node'),to=readNumber(row,15,13,'to node');
   const xyz=[readNumber(row,28,13,'DX'),readNumber(row,41,13,'DY'),
     readNumber(row,54,13,'DZ')];
   if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<=0||to<=0)
     throw wrong('CII_NODE_INVALID','Expected positive integer native CII node IDs');
   edges.push({from,to,delta:xyz});
 }
 const declared=Number(lines[coordStart+1]?.trim());
 if(!Number.isSafeInteger(declared)||declared<1)
   throw wrong('CII_ANCHORS_REQUIRED','Positive COORDS count required');
 const anchors=lines.slice(coordStart+2,coordStart+2+declared).map(row=>({
   id:readNumber(row,0,15,'coordinate node'),
   xyz:[readNumber(row,15,13,'X'),readNumber(row,28,13,'Y'),readNumber(row,41,13,'Z')],
 }));
 if(anchors.length!==declared||anchors.some(x=>!Number.isSafeInteger(x.id)||x.id<=0))
   throw wrong('CII_COORDS_INVALID','COORDS record count/positive ids invalid');
 return {edges,anchors};
}
function reconstruct({edges,anchors}){
 const adjacency=new Map();
 const attach=(x,y,d)=>{
   if(!adjacency.has(x))adjacency.set(x,[]);
   adjacency.get(x).push({id:y,delta:d});
 };
 for(const edge of edges){
   attach(edge.from,edge.to,edge.delta);
   attach(edge.to,edge.from,neg(edge.delta));
 }
 const resolved=new Map(),conflicts=[],componentRoots=new Map(),unknownAnchors=[];
 for(const a of anchors){
   if(!adjacency.has(a.id)){unknownAnchors.push(a.id);continue;}
   if(!resolved.has(a.id)){
     resolved.set(a.id,a.xyz);componentRoots.set(a.id,a.id);
   }else if(dist(resolved.get(a.id),a.xyz)>toleranceMm){
     conflicts.push({kind:'ANCHOR_CONFLICT',id:a.id,
       expected:a.xyz,actual:resolved.get(a.id),
       driftMm:dist(resolved.get(a.id),a.xyz)});
   }
   const queue=[a.id],visited=new Set();
   for(let cursor=0;cursor<queue.length;cursor++){
     const from=queue[cursor];if(visited.has(from))continue;visited.add(from);
     for(const next of adjacency.get(from)){
       const computed=add(resolved.get(from),next.delta);
       if(!resolved.has(next.id)){
         resolved.set(next.id,computed);
         componentRoots.set(next.id,componentRoots.get(from));
         queue.push(next.id);
       }else{
         const drift=dist(resolved.get(next.id),computed);
         if(drift>toleranceMm){
           if(conflicts.length<80)conflicts.push({
             kind:'EDGE_CONFLICT',from,to:next.id,driftMm:drift,
             computed,actual:resolved.get(next.id),
           });
         }
         if(!visited.has(next.id))queue.push(next.id);
       }
     }
   }
 }
 const uncovered=[...adjacency.keys()].filter(id=>!resolved.has(id));
 return {resolved,conflicts,uncovered,unknownAnchors,
   componentCount:new Set(componentRoots.values()).size,
   nodeCount:adjacency.size};
}
async function publish(receipt){
 await mkdir(artifacts,{recursive:true});
 await writeFile(join(artifacts,'next06c-independent-geometry-receipt.json'),
   JSON.stringify(receipt,null,2)+'\n');
 console.log('NEXT06C_INDEPENDENT_CII_GEOMETRY '+JSON.stringify(receipt));
}
test('NEXT-06C reconstructs actual 308-element serialized CII and seven GLRD X001 witness coordinates',async()=>{
 const raw=await readFile(original);
 assert.equal(createHash('sha256').update(raw).digest('hex'),expectedHash,
   'Never substitute another GLRD original input');
 const output=join(artifacts,'next06c-original-generated.cii');
 const cli=spawnSync('python3',[script,'--input',original,'--output',output,
   '--coords-mode','first','--weight-scale','10'],{
   cwd:root,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},
   encoding:'utf8',maxBuffer:8*1024*1024,timeout:180000,
 });
 if(cli.status!==0)throw wrong('NATIVE_CONVERTER_REJECTED',
   'Converter failed '+cli.status+'\n'+(cli.stderr||'').slice(-4000));
 const outputBytes=await readFile(output),cii=outputBytes.toString('utf8');
 const model=parseNeutralCii(cii);
 const result=reconstruct(model);
 const comparison=witnesses.map(w=>{
   const actual=result.resolved.get(w.id)||null;
   const drift=actual?dist(actual,w.xyz):null;
   return {nodeNumber:w.id,sourceExpected:w.xyz,ciiReconstructed:actual,
     driftMm:drift,withinTolerance:drift!==null&&drift<=toleranceMm};
 });
 const receipt={
   schema:'LFJ.NEXT06C.NativeCiiGraphGeometry.v1',status:'CHARACTERIZATION_NOT_OWNER_APPROVAL',
   sourceSha256:expectedHash,outputSha256:createHash('sha256').update(outputBytes).digest('hex'),
   outputBytes:outputBytes.length,actualRuntime:'xml_to_cii2019_runtime_custody.py',
   emittedElementEdges:model.edges.length,ciiAnchorCount:model.anchors.length,
   emittedNodeNumbers:result.nodeCount,recoveredNodeNumbers:result.resolved.size,
   computedConnectedComponents:result.componentCount,
   unknownAnchorIds:result.unknownAnchors,unanchoredNodeIds:result.uncovered.slice(0,40),
   conflicts:result.conflicts.slice(0,18),witnesses:comparison,toleranceMm,
   originalRestaintWarnings:(cli.stderr||'').split('\n').filter(x=>
     /EXPLICIT_RESTRAINT_CUSTODY_(UNRESOLVED|AMBIGUOUS)/.test(x)).slice(0,30),
 };
 await publish(receipt);
 assert.equal(model.edges.length,308,'Real reference GLRD runtime has 308 ELEMENTS at this head');
 assert.equal(model.anchors.length,6,'Real reference GLRD runtime has 6 sparse COORDS anchors');
 assert.deepEqual(result.unknownAnchors,[],'Each COORDS anchor needs an actual ELEMENTS node');
 assert.deepEqual(result.uncovered,[],'Each emitted element graph needs absolute coordinate custody');
 assert.deepEqual(result.conflicts,[],'No conflicting edge/anchor coordinate integration');
 for(const witness of comparison){
   assert.equal(witness.withinTolerance,true,'Node '+witness.nodeNumber+
     ' full CII graph coordinate drift='+witness.driftMm+'mm');
 }
});
test('NEXT-06C independent graph oracle detects incompatible anchor and unanchored component',()=>{
 const edges=[{from:1,to:2,delta:[5,0,0]}];
 const tampered=reconstruct({edges,anchors:[
   {id:1,xyz:[0,0,0]},{id:2,xyz:[900,0,0]},
 ]});
 assert.ok(tampered.conflicts.some(x=>x.kind==='ANCHOR_CONFLICT'));
 const partial=reconstruct({edges:[...edges,{from:10,to:20,delta:[4,0,0]}],
   anchors:[{id:1,xyz:[0,0,0]}]});
 assert.deepEqual(partial.uncovered,[10,20]);
});
