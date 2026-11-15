// Actual committed PSI-02/STF bytes; no production changes or mocked writer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {runXmlCii2019Workflow} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js';
import {supportKindFromMember} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js';
import {migrateSupportMappingConfig} from '../v045/converters/xml-cii2019-core/support-mapping-config.js';
import {DEFAULT_XML_CII_2019_SUPPORT_CONFIG} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js';
import {runStandaloneSupportTypeMapper} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js';
import {buildStandaloneCiiInvocation} from '../v045/converters/xml-cii-2019-standalone/invocation-builder.js';
import {parseCiiEngineeringFields} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-propagation-proof.mjs';

import {runStandaloneResolverJsonTrace as activeTrace} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {runStandaloneResolverJsonTrace as rootTrace} from '../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {runStandaloneSupportTypeMapper as rootMapper} from '../tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js';

installWeightBasisXmlDom(globalThis);
const root=new URL('../Benchmarks/XML-CII-2019/revamped/',import.meta.url);
const xmlBytes=readFileSync(new URL('GLRD-1000-PSI-02.xml',root));
const jsonBytes=readFileSync(new URL('STF_2026Nov03-0839_managed_stage.json',root));
const sourceText=xmlBytes.toString('utf8'),stagedJsonText=jsonBytes.toString('utf8');
const source=JSON.parse(stagedJsonText), members=[7,9,10].map(i=>source[14].children[i]);
const names=['/PS-4131.1.1','/PS-4131.2.1','/PS-4131.3.1'];
const targetNodes=['3760','3770','3780'];
const hash=(value)=>createHash('sha256').update(value).digest('hex');
const blobHash=(value)=>createHash('sha1').update('blob '+value.length+'\0').update(value).digest('hex');
const field=(node,key)=>node.getElementsByTagName(key)[0]?.textContent||'';
const originalBranch=source[14].name;
function xmlRows(xml){
  if(!xml)return [];
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  return [...doc.getElementsByTagName('Node')].filter(n=>names.includes('/'+field(n,'NodeName').replace(/^\//,'')))
    .map(n=>({name:field(n,'NodeName'),node:field(n,'NodeNumber'),ref:field(n,'ComponentRefNo'),
      restraints:[...n.getElementsByTagName('Restraint')].map(r=>({type:field(r,'Type'),gap:field(r,'Gap')}))}));
}
function baseConfig(){
  const cfg={...DEFAULT_XML_CII_2019_SUPPORT_CONFIG,weight:{enabled:false},pipingClass:{enabled:false},
    material:{enabled:false},dropGasketNodes:false,splitCondensedValveFlange:false};
  return {...cfg,supportMapping:{...migrateSupportMappingConfig(cfg),useJsonForRestraints:true}};
}
function caseConfig(mode){
  const cfg=baseConfig();
  if(mode==='audit-signature-reconstruction'){
    // Reconstruct the invalid saved GT5 rule. Owner's permanent policy must repair it.
    cfg.supportMapping.rules=cfg.supportMapping.rules.map(r=>r.id==='builtin-gt5-mds'?{...r,kind:'REST'}:r);
  }
  if(mode==='arbitrary-field-control'){
    cfg.supportMapping.rules.unshift(
      {id:'owner-function-stop',priority:1,source:'staged-json',field:'MDSSUPPFUNC,OWNER',match:'equals',pattern:'ST',kind:'LINESTOP'},
      {id:'owner-function-guide',priority:2,source:'staged-json',field:'MDSSUPPFUNC',match:'regex',pattern:'^GT$',kind:'GUIDE'});
  }
  if(mode==='mapper-default-control'){
    return JSON.parse(runStandaloneSupportTypeMapper({supportConfigJson:JSON.stringify(cfg)}).supportConfigJson);
  }
  return cfg;
}
function decisions(config){
  return members.map((m,i)=>{
    let d;
    const kind=supportKindFromMember({raw:m,capturedFields:m.attributes},config,v=>{d=v;});
    return {source:names[i],path:'$[14].children['+[7,9,10][i]+']',mds:m.attributes.MDSSUPPTYPE,
      kind,rule:d?.rule?.id,matched:d?.rule?.value,ruleKind:d?.rule?.kind};
  });
}
function selectedConfig(config){
  const mapping=migrateSupportMappingConfig(config);
  return {sha256:hash(JSON.stringify(config)),enabled:mapping.useJsonForRestraints,
    rules:mapping.rules.filter(r=>/gt|st|rest|guide|limit/i.test(r.id))
      .map(({id,kind,field,match,pattern,priority,enabled})=>({id,kind,field,match,pattern,priority,enabled}))};
}
function nativeEngine(t,receipt){
  const dir=mkdtempSync(join(tmpdir(),'ps4131-proof-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  return async job=>{
    const inputPath=join(dir,'input.xml'),stagedJsonPath=join(dir,'stage.json');
    writeFileSync(inputPath,job.sourceText);writeFileSync(stagedJsonPath,job.stagedJsonText);
    receipt.engineInput={sha256:hash(job.sourceText),rows:xmlRows(job.sourceText),
      stagedSha256:hash(job.stagedJsonText),config:selectedConfig(JSON.parse(job.supportConfigJson)),options:job.options};
    console.log('PS4131_ENGINE_INPUT '+JSON.stringify(receipt.engineInput));
    const invocation=buildStandaloneCiiInvocation(job,{inputPath,stagedJsonPath},dir.replaceAll('\\','/'));
    const script=fileURLToPath(new URL('../v045/converters/scripts/'+basename(invocation.scriptPath),import.meta.url));
    execFileSync(process.env.PYTHON||'python3',[script,...invocation.argv.slice(1)],
      {encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe'],timeout:180000});
    const ciiText=readFileSync(invocation.outputPath,'utf8');
    const parsed=parseCiiEngineeringFields(ciiText);
    const elements=parsed.elements.filter(e=>e.branch===originalBranch);
    const nearby=new Set([...targetNodes,...elements.filter(e=>targetNodes.includes(e.from)||targetNodes.includes(e.to))
      .flatMap(e=>[e.from,e.to])]);
    receipt.native={sha256:hash(ciiText),ps4122Slots:parsed.restraints.filter(s=>['3260','3270','3280'].includes(s.node)),targetSlots:parsed.restraints.filter(s=>targetNodes.includes(s.node)),
      nearbySlots:parsed.restraints.filter(s=>nearby.has(s.node)),
      targetElements:elements.filter(e=>targetNodes.includes(e.from)||targetNodes.includes(e.to))
        .map(({index,from,to,restraintPointer})=>({index,from,to,restraintPointer}))};
    console.log('PS4131_NATIVE '+JSON.stringify(receipt.native));
    return {ok:true,enrichedText:job.sourceText,ciiText,logs:[],diagnostics:{}};
  };
}
function summarizeAudit(report){
  return {status:report?.status,summary:report?.summary,
    coverage:report?.coverage?.sources?.filter(s=>names.includes(s.fields?.NAME)).map(s=>({path:s.path,
      kind:s.kind,status:s.status,rule:s.decision?.rule?.id,
      candidates:s.candidates?.map(c=>({node:c.target?.nodeNumber,method:c.method,entries:c.entries}))})),
    records:report?.records?.filter(r=>names.includes('/'+String(r.target?.nodeName||'').replace(/^\//,''))||
      targetNodes.includes(r.target?.nodeNumber)).map(r=>({node:r.target.nodeNumber,kind:r.after?.Type,gap:r.after?.Gap,
      status:r.status,mapping:r.mapping?.node,observed:r.observed?{node:r.observed.node,typeCode:r.observed.typeCode,
        gap:r.observed.gap,blockIndex:r.observed.blockIndex,slotIndex:r.observed.slotIndex}:null}))};
}
test('PS4131 original committed source identity and separate occurrence custody',()=>{
  assert.equal(blobHash(xmlBytes),'8c60c9e58995172d48a9d1ebfa23569db5659f06');
  assert.equal(blobHash(jsonBytes),'c611f53d6571cae7df51d9ac817a723be493b952');
  assert.deepEqual(members.map(m=>m.attributes.NAME),names);
  assert.deepEqual(members.map(m=>m.attributes.MDSSUPPTYPE),['PIPE-REST','GT570','ST570']);
  assert.ok(members.every(m=>m.attributes.SUPPORT_KIND==='REST'));
  assert.deepEqual(xmlRows(sourceText).map(r=>r.node),targetNodes);
  assert.ok(xmlRows(sourceText).every(r=>r.restraints.length===0));
  console.log('PS4131_SOURCE '+JSON.stringify({xmlSha256:hash(xmlBytes),jsonSha256:hash(jsonBytes),
    branch:originalBranch,rows:xmlRows(sourceText),memberPaths:[7,9,10]}));
});
for(const mode of ['shipped-table','audit-signature-reconstruction','mapper-default-control','arbitrary-field-control']){
  test('PS4131 actual committed full source, mapper ON, '+mode,{timeout:240000},async t=>{
    const config=caseConfig(mode),receipt={mode,config:selectedConfig(config),decisions:decisions(config)};
    console.log('PS4131_CLASSIFIER '+JSON.stringify(receipt));
    const input={sourceKind:'xml',sourceName:'GLRD-1000-PSI-02.xml',sourceText,stagedJsonText,
      supportConfigJson:JSON.stringify(config),options:{outputMode:'both',splitCondensedValveFlange:false,
        useRestraintTypeBasedOnJson:true}};
    const result=await runXmlCii2019Workflow(input,{engineRunner:nativeEngine(t,receipt)});
    receipt.ok=result.ok;receipt.error=result.ok?null:String(result.error||'unknown').slice(0,800);
    receipt.audit=summarizeAudit(result.restraintAudit);
    console.log('PS4131_RESULT '+JSON.stringify(receipt));
    assert.equal(result.ok,true,receipt.error);
    assert.equal(receipt.engineInput.stagedSha256,hash(jsonBytes));
    assert.equal(receipt.engineInput.config.enabled,true);
    assert.ok(receipt.native.targetSlots.length>0,'No native CII slot observed at target node numbers');
    const guide4122=receipt.native.ps4122Slots.filter(s=>s.typeCode===8);
    assert.equal(guide4122.length,1,'PS4122 must have exactly one native GUIDE');
    assert.equal(guide4122[0].gap,10,'GT571 original explicit guide gap must survive');
    console.log('PS4122_NATIVE '+JSON.stringify(receipt.native.ps4122Slots));
    if(mode==='audit-signature-reconstruction'){
      assert.deepEqual(receipt.decisions.map(d=>d.kind),['REST','GUIDE','LINESTOP']);
      assert.deepEqual(receipt.decisions.map(d=>d.rule),['builtin-user-rest','builtin-gt5-mds','standalone-mds-st-linestop']);
      assert.ok(receipt.native.targetSlots.some(s=>s.typeCode===8),'Owner policy must repair the old saved GT570 REST mapping');
      assert.ok(receipt.native.targetSlots.some(s=>s.typeCode===9),'Visible default ST rule must generate LIM');
      assert.deepEqual(receipt.native.targetSlots.map(s=>s.typeCode).sort((a,b)=>a-b),[8,9,14]);
    }
    if(mode==='mapper-default-control'||mode==='shipped-table'||mode==='arbitrary-field-control'){
      assert.deepEqual(receipt.decisions.map(d=>d.kind),['REST','GUIDE','LINESTOP']);
      const actual=new Set(receipt.native.targetSlots.map(s=>s.typeCode));
      for(const code of [14,8,9])assert.ok(actual.has(code),'Missing independent expected native code '+code);
      if(mode==='arbitrary-field-control')assert.deepEqual(receipt.decisions.slice(1).map(d=>d.rule),['owner-function-guide','owner-function-stop']);
    }
  });
}

test('PS4131 actual resolver-to-Preview retains arbitrary rule fields independent of capture settings',()=>{
  const config=caseConfig('arbitrary-field-control'), supportConfigJson=JSON.stringify(config);
  for(const [trace,mapper] of [[activeTrace,runStandaloneSupportTypeMapper],[rootTrace,rootMapper]]){
    const result=trace({sourceKind:'xml',sourceText,stagedJsonText,supportConfigJson,
      jsonConfig:{captureFields:['NAME']}});
    const preview=mapper({supportConfigJson,resolverJsonTraceResult:result});
    for(const [name,kind,id] of [[names[1],'GUIDE','owner-function-guide'],[names[2],'LINESTOP','owner-function-stop']]){
      const rows=preview.previewRows.filter(r=>r.occurrenceName===name);
      assert.ok(rows.length,'Missing actual Preview member '+name);
      assert.ok(rows.every(r=>r.supportKind===kind&&r.matchedAlias===id),JSON.stringify(rows));
    }
  }
});
