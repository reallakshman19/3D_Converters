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

import {attachSourceNativeTrace} from '../tabs/xml-cii-2019-standalone/xml-cii-source-native-trace.js';
import {restraintAuditCoverageRows,restraintAuditCsv,restraintAuditHtml} from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-export.js';
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
    receipt.native={sha256:hash(ciiText),targetSlots:parsed.restraints.filter(s=>targetNodes.includes(s.node)),
      nearbySlots:parsed.restraints.filter(s=>nearby.has(s.node)),
      targetElements:elements.filter(e=>targetNodes.includes(e.from)||targetNodes.includes(e.to))
        .map(({index,from,to,restraintPointer})=>({index,from,to,restraintPointer}))};
    console.log('PS4131_NATIVE '+JSON.stringify(receipt.native));
    return {ok:true,enrichedText:job.sourceText,ciiText,logs:[],diagnostics:{}};
  };
}

test('actual PS4131 source coverage shows three distinct native block/slot addresses without false source ownership',{timeout:240000},async t=>{
  assert.equal(blobHash(xmlBytes),'8c60c9e58995172d48a9d1ebfa23569db5659f06');
  assert.equal(blobHash(jsonBytes),'c611f53d6571cae7df51d9ac817a723be493b952');
  const config=baseConfig(),receipt={mode:'source-native-trace',config:selectedConfig(config),decisions:decisions(config)};
  const result=await runXmlCii2019Workflow({sourceKind:'xml',sourceName:'GLRD-1000-PSI-02.xml',
    sourceText,stagedJsonText,supportConfigJson:JSON.stringify(config),options:{outputMode:'both',
      splitCondensedValveFlange:false,useRestraintTypeBasedOnJson:true}},{engineRunner:nativeEngine(t,receipt)});
  assert.equal(result.ok,true,String(result.error));
  const report=result.restraintAudit;
  const actual=restraintAuditCoverageRows(report);
  const expected=[[names[0],14,1],[names[1],8,2],[names[2],9,3]];
  for(const [name,code,slot] of expected){
    const s=report.coverage.sources.find(r=>r.name===name);
    assert.ok(s,name);
    assert.equal(s.ciiTrace.status,'RESOLVED_GROUP_CII_FIELDS_VERIFIED',JSON.stringify(s.ciiTrace));
    assert.equal(s.ciiTrace.independentPhysicalOwnershipProven,false);
    const row=actual.find(r=>r.source===name);
    assert.deepEqual([row.retainedNode,row.actual,row.ciiBlock,row.ciiSlot],['3760',code,51,slot]);
    assert.equal(row.observedGap,0);
  }
  const rest4130=actual.find(r=>r.source==='/PS-4130.1.1');
  assert.ok(rest4130,'PS4130 source must appear in the audit');
  assert.equal(rest4130.actual,14,'PS4130 source REST must trace to native +Y');
  assert.equal(rest4130.observedGap,0);
  assert.ok(rest4130.ciiBlock>0&&rest4130.ciiSlot>0,'PS4130 must have a verified native slot address');
  console.log('PS4130_SOURCE_NATIVE_LINK '+JSON.stringify({node:rest4130.retainedNode,type:rest4130.actual,
    block:rest4130.ciiBlock,slot:rest4130.ciiSlot,status:rest4130.ciiTraceStatus}));
  console.log('PS4131_SOURCE_NATIVE_LINKS '+JSON.stringify(actual.filter(r=>names.includes(r.source)).map(r=>
    ({source:r.source,node:r.retainedNode,type:r.actual,block:r.ciiBlock,slot:r.ciiSlot,status:r.ciiTraceStatus}))));
  assert.match(restraintAuditCsv(report),/RESOLVED_GROUP_CII_FIELDS_VERIFIED/);
  assert.match(restraintAuditHtml(report),/RESOLVED_GROUP_CII_FIELDS_VERIFIED/);
  // Adversarial: remove the native GUIDE witness, and do not certify it
  // using a REST or LIM record or another source at the shared coordinates.
  const damaged=report.records.map(r=>r.after?.Type==='GUI'&&targetNodes.includes(r.target.nodeNumber)
    ?{...r,status:'MISSING_SLOT',observed:null}:r);
  const retrace=attachSourceNativeTrace(report.coverage,damaged,true);
  const guide=retrace.sources.find(s=>s.name===names[1]);
  assert.equal(guide.ciiTrace.status,'SOURCE_NATIVE_FIELDS_UNVERIFIED');
  assert.equal(guide.ciiTrace.slots.length,0);
});
