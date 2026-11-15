import test from 'node:test';
import assert from 'node:assert/strict';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {enrichStandaloneXmlForRun} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity-mds-restraints.js';
import {activeAuditJobIdentity,finishActiveRestraintAudit,currentActiveRestraintAudit,captureActiveRestraintAudit} from '../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-audit.js';
import {normalizeWorkflowJob,normalizeWorkflowResult} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js';
import {resolveKindPure} from '../support/SupportKindResolver.js';
import {buildStagedSupportIndex} from '../v045/converters/xml-cii2019-core/support-mapping.js';
import {applyXmlRestraints} from '../v045/converters/xml-cii2019-core/support-mapping.js';
import {activeAuditNode,activeRestraintRecords,createActiveRestraintJournal,recordActiveRestraintStage,recordActiveRestraintWrite} from '../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-journal.js';
import {runXmlCii2019Workflow} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js';
import {buildStandaloneCiiInvocation} from '../v045/converters/xml-cii-2019-standalone/invocation-builder.js';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
installWeightBasisXmlDom(globalThis);

const node=(id,type,x,extra='')=>`<Node><NodeNumber>${id}</NodeNumber><NodeName>PS-${id}.1</NodeName><ComponentType>${type}</ComponentType><Position>${x} 0 0</Position><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness>${extra}</Node>`;
const xml=`<PipeStressExport><Pipe><Branch><Branchname>/AUDIT/B1</Branchname>${node(10,'PIPE',0)}${node(20,'ATTA',100)}${node(30,'PIPE',200)}</Branch></Pipe></PipeStressExport>`;
const source={type:'SUPPORT',attributes:{NAME:'/PS-20.1',DTXR:'LINE STOP',CMPSUPGAP:'25MM GAP',POS:{x:100,y:0,z:0}}};
const staged=JSON.stringify([{type:'BRANCH',name:'/AUDIT/B1',children:[source]}]);
const config={weight:{enabled:false},pipingClass:{enabled:false},material:{enabled:false},dropGasketNodes:false,
  supportMapping:{version:2,rules:[{id:'audit-owner-stop',source:'staged-json',field:'DTXR',match:'contains',pattern:'LINE STOP',kind:'LINESTOP',priority:1}]}};
const job=()=>({sourceKind:'xml',sourceName:'audit.xml',sourceText:xml,stagedJsonText:staged,
  supportConfigJson:JSON.stringify(config),options:{outputMode:'both',splitCondensedValveFlange:false}});

test('actual selected support rule and nested source path are observed without changing decisions',()=>{
  const observed=[],rule={id:'literal',field:'DTXR',match:'contains',pattern:'LINE STOP',kind:'LINESTOP'};
  const options={userRules:[rule],defaultRules:[],kindMap:{},defaultKind:''};
  assert.equal(resolveKindPure(source.attributes,options),'LINESTOP');
  assert.equal(resolveKindPure(source.attributes,{...options,onDecision:d=>observed.push(d)}),'LINESTOP');
  assert.equal(observed[0].rule.id,'literal');assert.equal(observed[0].rule.value,'LINE STOP');
  const index=buildStagedSupportIndex(staged,config);
  assert.equal(index.items[0].path,'$[0].children[0]');
  assert.equal(index.items[0].auditDecision.rule.id,'audit-owner-stop');
});

test('real active parity chain records original, default and MDS stages and literal raw gap',async()=>{
  const parity=await enrichStandaloneXmlForRun(job());
  assert.equal(parity.applied,true,JSON.stringify({error:parity.error,logs:parity.logs}));
  const report=await finishActiveRestraintAudit(parity.restraintAuditJournal,{enrichedText:parity.xmlText});
  assert.equal(report.status,'CII_NOT_RUN',JSON.stringify(report.errors));
  const stop=report.records.find(r=>r.target.nodeNumber==='20'&&r.after?.Type==='LIM');
  assert.ok(stop,JSON.stringify(report.records));
  assert.equal(stop.after.Gap,'25');assert.equal(stop.source.member.path,'$[0].children[0]');
  assert.equal(stop.source.member.fields.CMPSUPGAP,'25MM GAP');
  assert.equal(stop.decision.rule.id,'audit-owner-stop');
  assert.equal(stop.fields.find(field=>field.name==='Stiffness').evidence.authority,'writer-stiffness-policy');
  assert.deepEqual(report.recorded.stages.map(stage=>stage.name),
    ['parent-enrichment','dtxr-enrichment','process-parity','atta-default','mds-closure','native-engine-enrichment']);
  assert.match(report.recorded.auditSha256,/^[a-f0-9]{64}$/);
});

test('result normalization preserves the active audit and request identity covers all run inputs',async()=>{
  const audit={status:'CII_NOT_RUN'};
  assert.equal(normalizeWorkflowResult({restraintAudit:audit}).restraintAudit,audit);
  const initial=normalizeWorkflowJob(job()).job;
  for(const change of [j=>{j.sourceText+=' ';},j=>{j.stagedJsonText+=' ';},
    j=>{j.supportConfigJson='{}';},j=>{j.options.kgToNewton=false;}]) {
    const changed=structuredClone(initial);change(changed);
    assert.notEqual(await activeAuditJobIdentity(initial),await activeAuditJobIdentity(changed));
  }
});

test('the actual ANCI REST fallback records its group and policy instead of inventing an individual rule',async()=>{
  const input=job();input.sourceText=input.sourceText.replace('<ComponentType>ATTA','<ComponentType>ANCI');
  const json=JSON.parse(input.stagedJsonText);json[0].children[0].attributes.DTXR='PIPE REST';
  input.stagedJsonText=JSON.stringify(json);
  const parity=await enrichStandaloneXmlForRun(input);assert.equal(parity.applied,true,parity.error);
  const report=await finishActiveRestraintAudit(parity.restraintAuditJournal,{enrichedText:parity.xmlText});
  const rest=report.records.find(row=>row.after?.Type==='+Y');assert.ok(rest);
  assert.equal(rest.trace.stage,'dtxr-enrichment');assert.equal(rest.source.kind,'staged-json-group');
  assert.equal(rest.source.members[0].path,'$[0].children[0]');assert.equal(rest.source.members[0].fields.DTXR,'PIPE REST');
  assert.equal(rest.decision.rule.id,'decideMissingStagedRestRestraint');
  assert.equal(rest.fields.find(field=>field.name==='Stiffness').evidence.authority,'writer-stiffness-policy');
  assert.equal(report.summary.provenanceGaps,0);
});

test('compatibility audit downloads require the same job and unchanged actual outputs',async()=>{
  const normalized=normalizeWorkflowJob(job()).job;
  const parity=await enrichStandaloneXmlForRun(normalized);
  assert.equal(parity.applied,true,parity.error);
  const result={enrichedText:parity.xmlText,ciiText:''};
  const report=await finishActiveRestraintAudit(parity.restraintAuditJournal,result);
  report.run.requestSha256=await activeAuditJobIdentity(normalized);result.restraintAudit=report;
  const stateRef={current:{job:normalized,result}};
  const build=async state=>state.job;
  assert.equal(await currentActiveRestraintAudit(stateRef,report,build,normalizeWorkflowJob),true);
  stateRef.current.job={...normalized,sourceText:normalized.sourceText+' '};
  assert.equal(await currentActiveRestraintAudit(stateRef,report,build,normalizeWorkflowJob),false);
  stateRef.current.job=normalized;result.enrichedText+=' ';
  assert.equal(await currentActiveRestraintAudit(stateRef,report,build,normalizeWorkflowJob),false);
  result.enrichedText=parity.xmlText;
  report.records[0].after.Gap='26';
  assert.equal(await currentActiveRestraintAudit(stateRef,report,build,normalizeWorkflowJob),false);
});

test('an audit capture failure is explicit and leaves conversion outputs untouched',async()=>{
  const result={ok:true,ciiText:'unchanged CII',enrichedText:'not valid XML<'},before=structuredClone(result);
  const report=await captureActiveRestraintAudit({stages:[],events:[],original:[]},result);
  assert.equal(report.status,'FAILED');assert.equal(report.errors[0].code,'ACTIVE_AUDIT_CAPTURE_FAILED');
  assert.deepEqual(result,before);
});

test('held converter input retains captured audit decisions without invoking a writer',async()=>{
  const result=await runXmlCii2019Workflow(job(),{
    runParityEnricher:async input=>({applied:false,error:'literal parity hold',logs:[],
      restraintAuditJournal:createActiveRestraintJournal(input)}),
    engineRunner:async()=>{throw Error('Writer must not run for held input');},
  });
  assert.equal(result.ok,false);assert.equal(result.error,'literal parity hold');
  assert.equal(result.restraintAudit.status,'CONVERSION_HELD');assert.equal(result.ciiText,null);
  assert.match(result.restraintAudit.run.requestSha256,/^[a-f0-9]{64}$/);
});

test('coincident unnamed nodes retain their own observed source decisions',()=>{
  const input=`<PipeStressExport><Branch><Branchname>/COINCIDENT</Branchname>${node(20,'ATTA',100)}${node(30,'ATTA',100)}</Branch></PipeStressExport>`
    .replace(/<NodeName>.*?<\/NodeName>/g,'');
  const journal=createActiveRestraintJournal({...job(),sourceText:input});
  const document=new DOMParser().parseFromString(input,'application/xml');
  for(const [index,target] of [...document.getElementsByTagName('Node')].entries()) {
    const before=activeAuditNode(target),entries=[{type:'LIM',gap:'25'}];
    applyXmlRestraints(document,target,entries,config);
    recordActiveRestraintWrite(journal,before,target,{stage:'parent-enrichment',entries,
      sources:[{path:`$[${index}]`,fields:{},outputOrdinals:[0],decision:{source:'observed',rule:{id:`literal-${index}`}}}]});
  }
  recordActiveRestraintStage(journal,'parent-enrichment',new XMLSerializer().serializeToString(document));
  const records=activeRestraintRecords(journal);
  assert.equal(records.find(row=>row.target.nodeNumber==='20').source.member.path,'$[0]');
  assert.equal(records.find(row=>row.target.nodeNumber==='30').source.member.path,'$[1]');
});

function nativeEngine(t) {
  const dir=mkdtempSync(path.join(tmpdir(),'xmlcii-active-audit-'));
  t.after(()=>{
    assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));
    assert.match(path.basename(dir),/^xmlcii-active-audit-/);assert.equal(lstatSync(dir).isSymbolicLink(),false);
    rmSync(dir,{recursive:true});
  });
  // Explicit test transport: invoke the unchanged native writer using the
  // same production invocation builder; no fabricated engine output.
  return async engineJob=>{
    const inputPath=path.join(dir,'input.xml'),stagedJsonPath=path.join(dir,'stage.json');
    writeFileSync(inputPath,engineJob.sourceText);writeFileSync(stagedJsonPath,engineJob.stagedJsonText);
    const invocation=buildStandaloneCiiInvocation(engineJob,{inputPath,stagedJsonPath},dir.replaceAll('\\','/'));
    const script=fileURLToPath(new URL('../v045/converters/scripts/'+path.basename(invocation.scriptPath),import.meta.url));
    execFileSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),
      [script,...invocation.argv.slice(1)],{encoding:'utf8',maxBuffer:8*1024*1024});
    return {ok:true,enrichedText:engineJob.sourceText,ciiText:readFileSync(invocation.outputPath,'utf8'),logs:[],diagnostics:{}};
  };
}

test('active workflow API carries actual native CII pointer, slot, rule and raw gap evidence',async t=>{
  const result=await runXmlCii2019Workflow(job(),{engineRunner:nativeEngine(t)});
  assert.equal(result.ok,true,result.error);
  const report=result.restraintAudit;
  assert.equal(report.status,'VERIFIED',JSON.stringify(report.errors)+' '+JSON.stringify(report.records));
  const stop=report.records.find(row=>row.after?.Type==='LIM');
  assert.equal(stop.observed.typeCode,9);assert.equal(stop.observed.gap,25);
  assert.equal(stop.observed.blockIndex,1);assert.equal(stop.observed.slotIndex,1);
  assert.ok(Number.isInteger(stop.observed.line));assert.equal(stop.decision.rule.id,'audit-owner-stop');
  assert.equal(stop.source.member.path,'$[0].children[0]');
  assert.equal(report.run.requestSha256,await activeAuditJobIdentity(normalizeWorkflowJob(job()).job));
});

test('shared coincident JSON members remain a visible native duplicate-slot audit failure',async t=>{
  const input=job();input.stagedJsonText=readFileSync(new URL('./fixtures/xmlcii-active-audit/active-audit-overlap-multi.json',import.meta.url),'utf8');
  const result=await runXmlCii2019Workflow(input,{engineRunner:nativeEngine(t)});
  assert.equal(result.ok,true,result.error);
  assert.equal(result.restraintAudit.status,'FAILED');
  assert.ok(result.restraintAudit.records.some(row=>row.status==='DUPLICATE_SLOT'));
  assert.deepEqual(result.restraintAudit.records.filter(row=>row.after).map(row=>Number(row.after.Gap)).sort((a,b)=>a-b),[25,40]);
  assert.ok(result.restraintAudit.errors.some(error=>error.code==='RESTRAINT_AUDIT_UNEXPLAINED_SLOT'));
});
