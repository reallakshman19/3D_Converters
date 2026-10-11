/**
 * #212 NEXT-06B: actual native 2019 standalone conversion runtime, no product edits.
 * Source/CII slice characterization only, NOT full reviewed Mode A/B release.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const repository=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const source=join(repository,'Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml');
const native=join(repository,'converters/scripts/xml_to_cii2019_runtime_custody.py');
const outputDir=process.env.RUNNER_TEMP || tmpdir();
const sha='923a2b493483ecaaebe696f3d08a0b688f3ce3c9f456fb11b8e6a5889eea22ba';
const expected=[
 {id:10,xyz:[111369.76,101088.18,-108416.90]},
 {id:760,xyz:[109700,101229.30,-107022.33]},
 {id:1200,xyz:[108200,101229.30,-107022.33]},
 {id:1640,xyz:[106700,101229.30,-107022.33]},
 {id:2080,xyz:[105200,101229.30,-107022.33]},
 {id:2520,xyz:[103700,101229.30,-107022.33]},
 {id:2960,xyz:[102200,101229.30,-107022.33]},
];
const run=(xml,cii)=>spawnSync('python3',[
 native,'--input',xml,'--output',cii,'--coords-mode','first','--weight-scale','10',
],{cwd:repository,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},
 encoding:'utf8',maxBuffer:8*1024*1024,timeout:180000});
const save=async(label,receipt)=> {
 await mkdir(outputDir,{recursive:true});
 await writeFile(join(outputDir,'next06b-'+label+'-receipt.json'),
 JSON.stringify(receipt,null,2)+'\n');
 console.log('NEXT06B_'+label.toUpperCase()+'_RECEIPT '+JSON.stringify(receipt));
};
function actualCoords(cii) {
 const lines=cii.split(/\r?\n/);
 const index=lines.indexOf('#$ COORDS');
 assert.ok(index>=0,'Actual serialized native CII must have COORDS section');
 const count=Number(lines[index+1]?.trim());
 assert.ok(Number.isSafeInteger(count)&&count>=1,'Native COORDS must have positive declared count');
 const rows=lines.slice(index+2,index+2+count);
 assert.equal(rows.length,count);
 const parsed=rows.map((line,i)=>{
   assert.ok(line.length>=54, 'COORDS row '+i+' expected fixed width 54, got '+line.length);
   const id=Number(line.slice(0,15).trim());
   const xyz=[line.slice(15,28),line.slice(28,41),line.slice(41,54)].map(x=>Number(x.trim()));
   assert.ok(Number.isSafeInteger(id)&&id>0,'Valid positive coordinate node number');
   assert.ok(xyz.every(Number.isFinite),'Finite COORDS numeric geometry');
   return {id,xyz};
 });
 assert.equal(new Set(parsed.map(r=>r.id)).size,parsed.length,'Duplicate emitted coordinate node invalid');
 return parsed;
}
const near=(x,y)=>Math.abs(x-y)<=0.051;
test('NEXT-06B runs real GLRD native standalone runtime and parses emitted X001 CII anchors',async()=>{
 const bytes=await readFile(source);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
 const out=join(outputDir,'next06b-glrd-original.cii');
 const execution=run(source,out);
 let text=null,parsed=[],failure=null;
 if(execution.status===0){
   try{
     text=await readFile(out,'utf8');
     parsed=actualCoords(text);
   }catch(e){failure=String(e.stack||e);}
 }else failure='Converter status '+execution.status+', signal '+execution.signal
   +', stderr: '+(execution.stderr||'').slice(-4000);
 const matches=expected.map(w=>{
   const row=parsed.find(r=>r.id===w.id);
   return {id:w.id,present:!!row,actual:row?.xyz||null,
     expected:w.xyz,matched:!!row&&row.xyz.every((x,i)=>near(x,w.xyz[i]))};
 });
 const receipt={
   schema:'LFJ.NEXT06B.ActualCiiCoordinates.v1',sourceSha256:sha,
   actualRuntime:'converters/scripts/xml_to_cii2019_runtime_custody.py',
   invocation:'--coords-mode first --weight-scale 10',
   returnCode:execution.status,signal:execution.signal||null,
   converterStderr:(execution.stderr||'').slice(-5000),
   converterStdout:(execution.stdout||'').slice(-2000),
   outputCiiSha256:text?createHash('sha256').update(text).digest('hex'):null,
   outputBytes:text?Buffer.byteLength(text,'utf8'):null,
   emittedCoords:parsed.length,witnesses:matches,
   failure,
   qualification:'REAL_RUNTIME_CII_COORDINATE_SLICE_ONLY_NOT_FULL_X001_OR_OWNER_RUN',
 };
 await save('native',receipt);
 assert.equal(execution.error,undefined,'Python runtime timeout/spawn failure: '+execution.error);
 assert.equal(execution.status,0,failure);
 assert.equal(failure,null,failure);
 assert.ok(parsed.length>=1);
 // Only the first original source datum is necessarily COORDS-anchored.
 // Other X001 witnesses may lie inside a connected component and appear
 // in ELEMENTS rather than in sparse global COORDS, so report but do not
 // mislabel absent COORDS records as absent physical nodes.
 const first=matches[0];
 assert.equal(first.present,true,'Original GLRD first retained Node10 must be anchored');
 assert.equal(first.matched,true,'Original Node10 actual emitted CII axes must be X,Z,-Y');
 for(const match of matches)if(match.present)assert.equal(match.matched,true,
   'Present X001 witness '+match.id+' must use unchanged original global coordinates');
});
test('NEXT-06B actual native runtime rejects malformed source Position, no CII output',async()=>{
 const bytes=await readFile(source);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
 const original=bytes.toString('utf8'),marker='<Position>111369.76 108416.90 101088.18</Position>';
 assert.equal(original.split(marker).length-1,1,'Unique original Node10 coordinate mutation site');
 const dir=await mkdtemp(join(tmpdir(),'lfj-next06b-negative-'));
 try{
   const xml=join(dir,'bad-position.xml'),out=join(dir,'invalid.cii');
   await writeFile(xml,original.replace(marker,'<Position>NaN 108416.90 101088.18</Position>'),'utf8');
   const result=run(xml,out);
   let emitted=false;
   try{const f=await stat(out);emitted=f.size>0;}catch{}
   const combined=(result.stderr||'')+'\n'+(result.stdout||'');
   await save('malformed-position',{
     originalSha256:sha,mutation:'Original Node10 Position X set to NaN in temp file only',
     returnCode:result.status,exceptionExcerpt:combined.slice(-4500),wroteCii:emitted,
     qualification:'ACTUAL_RUNTIME_REJECTION_NOT_SOURCE_PARSER_ONLY',
   });
   assert.notEqual(result.status,0,'Invalid source Position must be rejected by real runtime');
   assert.match(combined,/Invalid Position|non-finite coordinate/i);
   assert.equal(emitted,false,'Malformed Position must never publish a CII output');
 }finally{await rm(dir,{recursive:true,force:true});}
});
