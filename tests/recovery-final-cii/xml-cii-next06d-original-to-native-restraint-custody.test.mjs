/**
 * #212 NEXT-06D-01/02: raw original source → in-process retained model →
 * actual native RESTRANT blocks and all six serialized slots.
 *
 * No production change; no numerical/XYZ/NodeNumber surrogate is promoted
 * into evidence of original occurrence conservation. Even a matched candidate
 * remains UNKNOWN_PROVENANCE until B4 supplies an accepted origin-to-slot link.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,stat,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const input=join(root,'Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml');
const probe=join(root,'tests/recovery-final-cii/next06d-runtime-probe.py');
const target=process.env.RUNNER_TEMP||tmpdir();
const expectedSource='923a2b493483ecaaebe696f3d08a0b688f3ce3c9f456fb11b8e6a5889eea22ba';
const expectedOutput='a4ad66b1528731a3ae218ba814dc38343514b8813693ebb7ddf1bbbdf7cf42bc';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(code,message)=>Object.assign(new Error(message),{code});
function requireNumber(str,what){
 const s=String(str??'').trim();
 if(!s||!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/.test(s))throw fail('INVALID_CII_FIELD',what+' '+JSON.stringify(str));
 const v=Number(s);
 if(!Number.isFinite(v))throw fail('INVALID_CII_FIELD',what+' nonfinite');
 return v;
}
function parseCiiSlots(text){
 const rows=text.split(/\r?\n/);
 const first=rows.indexOf('#$ RESTRANT');
 if(first<0)throw fail('MISSING_RESTRANT','Native CII RESTRANT section absent');
 const stop=rows.findIndex((row,i)=>i>first&&row.startsWith('#$ '));
 if(stop<0)throw fail('MISSING_TERMINATOR','No RESTRANT section terminator');
 const data=rows.slice(first+1,stop);
 if(data.length===0||data.length%24!==0)throw fail('RESTRANT_BLOCK_WIDTH','Each native block must have six slots of four lines');
 const all=[],active=[];
 for(let b=0;b<data.length/24;b++){
  for(let slot=0;slot<6;slot++){
   const start=b*24+slot*4;
   const line=data[start],cosines=data[start+1],tag=data[start+2],guid=data[start+3];
   if(line.length<80||cosines.length<41||tag.length<113||guid.length<113)
     throw fail('RESTRANT_SLOT_WIDTH','Invalid native block/slot width '+(b+1)+'/'+(slot+1));
   const node=requireNumber(line.slice(0,15),'node'),
     code=requireNumber(line.slice(15,28),'type');
   const r={blockOrdinal:b+1,slotOrdinal:slot+1,nodeNumber:node,
     typeCode:code,rawLine:line,rawCosines:cosines,tag,guid,active:node!==0&&code!==0};
   if((node===0)!==(code===0))throw fail('RESTRANT_SLOT_PARTIAL','Partial slot is forbidden');
   all.push(r);
   if(r.active)active.push(r);
  }
 }
 return {blockCount:data.length/24,all,active};
}
function auditMatches(source,events){
 return events.filter(ev=>ev.branchName===source.branchName
  &&String(ev.sourceNodeNumber??'')===source.nodeNumber
  &&String(ev.sourceNodeName??'')===source.nodeName
  &&Array.isArray(ev.position)&&Array.isArray(source.position)
  &&ev.position.length===source.position.length
  &&ev.position.every((v,i)=>Math.abs(v-source.position[i])<1e-8));
}
function ledger(probed,cii){
 const originals=probed.original.restraints, events=probed.runtime.auditEvents;
 const retained=probed.runtime.retainedBranches.flatMap(b=>b.nodes.map(n=>({...n,branchName:b.branchName})));
 const rows=originals.map(s=>{
  const matches=auditMatches(s,events);
  const ev=matches.length===1?matches[0]:null;
  const targetNums=ev?ev.status==='unresolved'?[]:ev.status==='ambiguous'
    ?ev.retainedNodeNumbers||[]:[ev.retainedNodeNumber]:[];
  const candidates=targetNums.flatMap(n=>probed.runtime.assignments.filter(a=>a.nodeNumber===n)
    .flatMap(a=>cii.active.filter(slot=>slot.blockOrdinal===a.blockOrdinal
      &&a.specs.some(spec=>spec.slotOrdinal===slot.slotOrdinal
        &&spec.typeCode===slot.typeCode))
      .map(slot=>({blockOrdinal:slot.blockOrdinal,slotOrdinal:slot.slotOrdinal,
        nodeNumber:slot.nodeNumber,typeCode:slot.typeCode}))));
  return {occurrenceId:s.occurrenceId,sourcePath:s.sourcePath,branchName:s.branchName,
    nodeNumber:s.nodeNumber,nodeName:s.nodeName,position:s.position,type:s.type,
    auditAdmissionIssues:s.auditAdmissionIssues,matchedAuditEvents:matches.length,
    auditStatus:ev?.status??'NOT_UNIQUELY_ATTESTED',
    retainedCandidateNodeNumbers:targetNums,
    retainedModelCandidates:retained.filter(n=>targetNums.includes(n.nodeNumber)
      &&n.branchName===s.branchName)
      .map(n=>({nodeNumber:n.nodeNumber,retainedOrdinal:n.retainedNodeOrdinal,
        name:n.nodeName,position:n.position,typeCodes:n.typeCodes})),
    nativeSlotCandidates:candidates,
    disposition:s.auditAdmissionIssues.length?'UNKNOWN_AUDIT_EXCLUDED'
      :ev?.status==='unresolved'?'UNKNOWN_NO_RETAINED_CANDIDATE'
      :ev?.status==='ambiguous'?'UNKNOWN_AMBIGUOUS_RETAINED_CANDIDATES'
      :candidates.length?'CANDIDATE_SLOT_PROVENANCE_NOT_PROVEN'
      :'UNKNOWN_ORIGINAL_TO_SLOT_CONTRACT',
    originToEmittedSlotProven:false,
  };
 });
 const inProcessBlocks=probed.runtime.assignments;
 for(const a of inProcessBlocks){
  const slots=cii.active.filter(s=>s.blockOrdinal===a.blockOrdinal);
  assert.equal(slots.length,a.specs.length,'Live native model specs vs serialized slot block '+a.blockOrdinal);
  for(let i=0;i<a.specs.length;i++){
   assert.equal(slots[i].nodeNumber,a.nodeNumber);
   assert.equal(slots[i].typeCode,a.specs[i].typeCode);
   assert.equal(slots[i].slotOrdinal,a.specs[i].slotOrdinal);
  }
 }
 assert.equal(inProcessBlocks.length,cii.blockCount,'Native model block-to-serial identity');
 return {rows,outputSlots:cii.active.map(s=>({
  blockOrdinal:s.blockOrdinal,slotOrdinal:s.slotOrdinal,nodeNumber:s.nodeNumber,
  typeCode:s.typeCode,origin:'UNISSUED',classification:
    s.typeCode===1?'GENERATED_ANC_CANDIDATE':'EXPLICIT_TYPE_CANDIDATE',
  originalOccurrenceIdsProven:[],
 })),observedAuditEvents:events,retainedModelNodes:retained.length};
}
async function runCase(xmlPath,label,outputDir=target){
 await mkdir(outputDir,{recursive:true});
 const output=join(outputDir,'next06d-'+label+'.cii');
 const receipt=join(outputDir,'next06d-'+label+'-probe.json');
 const proc=spawnSync('python3',[probe,'--input',xmlPath,'--output',output,'--receipt',receipt],{
  cwd:root,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},
  encoding:'utf8',maxBuffer:32*1024*1024,timeout:180000,
 });
 if(proc.error)throw proc.error;
 const observed=JSON.parse(await readFile(receipt,'utf8'));
 const bytes=proc.status===0?await readFile(output):null;
 // No slicing: full stdout/stderr in a persisted receipt, unlike NEXT-06B.
 const result={label,returnCode:proc.status,stdout:proc.stdout,stderr:proc.stderr,
  sourceSha256:hash(await readFile(xmlPath)),outputSha256:bytes?hash(bytes):null,
  outputBytes:bytes?.length??null,error:observed.runtime.error,
  original:observed.original,runtime:observed.runtime,
  cii:bytes?parseCiiSlots(bytes.toString('utf8')):null};
 const assessed=result.cii?ledger(observed,result.cii):null;
 await writeFile(join(outputDir,'next06d-'+label+'-complete-receipt.json'),
  JSON.stringify({schema:'LFJ.NEXT06D.SourceRetainedNativeSlots.v1',
   qualification:'TEST_ONLY_CUSTODY_UNKNOWN_NOT_OWNER_APPROVAL',
   ...result,assessed,
   // Avoid repeating all native padding in the archived JSON receipt.
   cii:result.cii&&{blockCount:result.cii.blockCount,
     active:result.cii.active.map(({blockOrdinal,slotOrdinal,nodeNumber,typeCode})=>({
      blockOrdinal,slotOrdinal,nodeNumber,typeCode})),
     totalSerializedSlots:result.cii.all.length}},null,2)+'\n');
 return {...result,assessed};
}
function changeSupport(original,replacement){
 const pattern=/<Node>[\s\S]*?<NodeName>PS00371\.1<\/NodeName>[\s\S]*?<\/Node>/g;
 const matches=[...original.matchAll(pattern)];
 assert.equal(matches.length,1,'Mutate one original named source Node without touching protected input');
 const updated=original.replace(pattern,record=>replacement(record));
 assert.notEqual(updated,original);
 return updated;
}
test('NEXT-06D-01 exhaustive original → retained model → all six real CII slots',async()=>{
 const raw=await readFile(input);
 assert.equal(raw.length,627599);
 assert.equal(hash(raw),expectedSource,'Original pinned GLRD input SHA256');
 const result=await runCase(input,'original');
 assert.equal(result.returnCode,0,result.error?.message||result.stderr);
 assert.equal(result.outputSha256,expectedOutput,'Actual unmodified native CII SHA256');
 assert.equal(result.original.branches,41);
 assert.equal(result.original.nodes,1166);
 assert.equal(result.original.minusOne,778);
 assert.equal(result.original.restraints.length,51,'Every raw original restraint retained by independent census');
 assert.ok(result.original.restraints.every(r=>r.type==='+Y'&&r.auditAdmissionIssues.length===0));
 assert.equal(result.runtime.auditEvents.length,51,'In-process full audit, NEVER truncated stderr');
 assert.equal(result.cii.blockCount,49);
 assert.equal(result.cii.all.length,49*6,'No elided/folded native slots');
 assert.equal(result.cii.active.length,49);
 assert.equal(result.cii.active.filter(s=>s.typeCode===14).length,29);
 assert.equal(result.cii.active.filter(s=>s.typeCode===1).length,20);
 assert.equal(result.assessed.rows.length,51);
 assert.ok(result.assessed.rows.every(r=>!r.originToEmittedSlotProven));
 const source30=result.assessed.rows.find(x=>x.sourcePath==='/PipeStressExport/Pipe/Branch[1]/Node[3]/Restraint[1]');
 assert.equal(source30.nodeNumber,'30');
 assert.equal(source30.nodeName,'PS00371.1');
 assert.ok(!result.cii.active.some(s=>s.nodeNumber===30&&s.typeCode===14),
  'FIRST DIVERGENCE: source original #30 has no same-number CII RESTRANT slot');
 assert.ok(result.cii.active.some(s=>s.nodeNumber===20&&s.typeCode===14),
  'First coincident source #20 does have real CII RESTRANT block');
 console.log('NEXT06D_01_RECEIPT '+JSON.stringify({
  sourceSha256:result.sourceSha256,outputSha256:result.outputSha256,
  sourceRestraintOccurrences:51,fullAuditEvents:result.runtime.auditEvents.length,
  nativeBlocks:result.cii.blockCount,nativeActiveSlots:result.cii.active.length,
  explicitSlots:29,generatedAncSlots:20,firstDivergence:'B1/N3/R1 node30 has no same-node output slot',
  originToSlotConserved:'UNKNOWN_NOT_PROVEN',artifacts:target,
 }));
});
test('NEXT-06D-02 malformed, unnamed, duplicate and absent-type originals never gain invented custody',async()=>{
 const original=await readFile(input,'utf8');
 const cases=[
  {name:'missing-node-name',change:record=>record.replace(
    '<NodeName>PS00371.1</NodeName>','<NodeName></NodeName>'),issue:'EMPTY_NODE_NAME'},
  {name:'absent-restraint-type',change:record=>record.replace(
    '<Type>+Y</Type>','<Type></Type>'),issue:'EMPTY_RESTRAINT_TYPE'},
  {name:'invalid-position',change:record=>record.replace(
    '<Position>111369.76 108084.00 101088.18</Position>',
    '<Position>NaN 108084.00 101088.18</Position>'),issue:'INVALID_POSITION'},
  {name:'duplicate-support-name',change:record=>record.replace(
    'PS00371.1','PS00327.1'),issue:null},
  {name:'duplicate-minus-one-number',change:record=>record.replace(
    '<NodeNumber>30</NodeNumber>','<NodeNumber>-1</NodeNumber>'),issue:null},
 ];
 const report=[];
 const dir=await mkdtemp(join(tmpdir(),'lfj-next06d-negative-'));
 try{
  for(const fixture of cases){
   const changed=changeSupport(original,fixture.change);
   assert.notEqual(changed,original,fixture.name+' must change original in a TEMP file');
   const file=join(dir,fixture.name+'.xml');
   await writeFile(file,changed,'utf8');
   const result=await runCase(file,fixture.name,target);
   assert.equal(result.original.restraints.length,51,'Raw census preserves original 51 across '+fixture.name);
   const modified=result.original.restraints.find(x=>x.occurrenceId==='branch[1]/node[3]/restraint[1]');
   assert.ok(modified,'Original occurrence must retain its exact source path');
   if(fixture.issue){
    assert.ok(modified.auditAdmissionIssues.includes(fixture.issue),
      'Must identify excluded/invalid raw record '+fixture.name);
   }
   if(fixture.name==='invalid-position'){
    assert.notEqual(result.returnCode,0,'Native runtime must reject malformed real input Position');
    assert.equal(result.outputSha256,null,'Invalid source must not publish native CII');
    assert.match(result.runtime.error?.message||'',/Invalid Position|non-finite/i);
   }
   if(fixture.name==='duplicate-minus-one-number'){
    assert.equal(modified.nodeNumber,'-1');
    assert.equal(result.original.minusOne,779,'Duplicate negative ID retains distinct source ordinal');
   }
   if(fixture.name==='duplicate-support-name'){
    const p=result.original.restraints.filter(x=>x.nodeName==='PS00327.1');
    assert.equal(p.length,2);
    assert.notEqual(p[0].occurrenceId,p[1].occurrenceId,
      'Same support name at same XYZ must NEVER merge raw occurrence keys');
   }
   if(result.assessed){
    const affected=result.assessed.rows.find(r=>r.occurrenceId===modified.occurrenceId);
    assert.equal(affected.originToEmittedSlotProven,false,
      'No invalid, altered, coincident or same-number record can forge source→native slot custody');
   }
   report.push({fixture:fixture.name,inputSha256:result.sourceSha256,
    conversionExit:result.returnCode,outputSha256:result.outputSha256,
    originalOccurrences:51,auditAdmissibility:modified.auditAdmissionIssues,
    outcome:'SOURCE_CUSTODY_UNPROVEN_OR_NATIVE_REJECTED'});
  }
 }finally{await rm(dir,{recursive:true,force:true});}
 await writeFile(join(target,'next06d-negative-summary.json'),
   JSON.stringify({schema:'LFJ.NEXT06D.NegativeSourceReceipt.v1',
     status:'CHARACTERIZATION_NOT_OWNER_B4_DISPOSITION',cases:report},null,2)+'\n');
 console.log('NEXT06D_02_NEGATIVE_RECEIPT '+JSON.stringify(report));
});
