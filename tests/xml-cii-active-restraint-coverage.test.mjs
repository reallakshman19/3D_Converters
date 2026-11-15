import test from 'node:test';
import assert from 'node:assert/strict';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {enrichStandaloneXmlForRun} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity-mds-restraints.js';
import {createActiveRestraintJournal,recordActiveRestraintStage} from '../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-journal.js';
import {finishActiveRestraintAudit,activeAuditJobIdentity,activeAuditJobManifest,inspectActiveRestraintAudit} from '../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-audit.js';
import {normalizeWorkflowJob} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js';
import {restraintAuditCsv,restraintAuditHtml} from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-export.js';
import {digestCanonical} from '../contracts/gc-pw-v1/contract.mjs';
import {buildStandaloneCiiInvocation} from '../v045/converters/xml-cii-2019-standalone/invocation-builder.js';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEFAULT_XML_CII_2019_SUPPORT_CONFIG} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js';
installWeightBasisXmlDom(globalThis);

const xml='<PipeStressExport><Branch><Branchname>/COVER/B1</Branchname><Node><NodeNumber>20</NodeNumber><NodeName>PS-20.1</NodeName><ComponentType>ANCI</ComponentType><Position>100 0 0</Position><Restraint><Type>+Y</Type><Gap>0</Gap></Restraint></Node></Branch></PipeStressExport>';
const support=(name='/PS-20.1')=>({type:'SUPPORT',attributes:{NAME:name,TYPE:'ANCI',MDSDTXR:'LINE STOP',MDSSUPPTYPE:'ST572',CMPSUPGAP:'25MM GAP',POS:{x:100,y:0,z:0}}});
const config={weight:{enabled:false},pipingClass:{enabled:false},material:{enabled:false},dropGasketNodes:false};
const job=(settings={})=>({sourceText:xml,stagedJsonText:JSON.stringify([{type:'BRANCH',name:'/COVER/B1',children:[support()]}]),supportConfigJson:JSON.stringify({...config,...settings}),options:{splitCondensedValveFlange:false}});

test('unobserved source supports remain visible even when all surviving restraints are original XML',async()=>{
  const journal=createActiveRestraintJournal(job());recordActiveRestraintStage(journal,'unobserved-existing-route',xml);
  const report=await finishActiveRestraintAudit(journal,{enrichedText:xml});
  assert.equal(report.coverage.summary.supportOccurrences,1);
  assert.equal(report.coverage.summary.unaccounted,1);
  assert.equal(report.coverage.sources[0].path,'$[0].children[0]');
  assert.equal(report.coverage.sources[0].fields.CMPSUPGAP,'25MM GAP');
  assert.notEqual(report.coverage.status,'COMPLETE');
});

test('disabled JSON restraint generation is explicit instead of an empty complete audit',async()=>{
  const input=job({supportMapping:{version:2,useJsonForRestraints:false}});
  const parity=await enrichStandaloneXmlForRun(input);assert.equal(parity.applied,true,parity.error);
  const report=await finishActiveRestraintAudit(parity.restraintAuditJournal,{enrichedText:parity.xmlText});
  assert.equal(report.coverage.summary.disabled,1);
  assert.equal(report.coverage.sources[0].status,'JSON_RESTRAINTS_DISABLED');
  assert.equal(report.coverage.status,'INCOMPLETE');
  assert.equal(report.coverage.resolution.jsonRestraintsEnabled,false);
});

test('shipped default wiring records an MDS line stop and25mm gap without audit flags or custom support rules',async()=>{
  const input=job(),json=JSON.parse(input.stagedJsonText);
  Object.assign(json[0].children[0].attributes,{SUPPORT_KIND:'REST',SUPPORT_TYPE:'REST',SUPPORT_MAPPER_KIND:'REST'});
  input.stagedJsonText=JSON.stringify(json);
  input.supportConfigJson=JSON.stringify({...DEFAULT_XML_CII_2019_SUPPORT_CONFIG,...config});
  const parity=await enrichStandaloneXmlForRun(input);assert.equal(parity.applied,true,parity.error);
  const report=await finishActiveRestraintAudit(parity.restraintAuditJournal,{enrichedText:parity.xmlText});
  assert.equal(report.coverage.status,'COMPLETE');assert.equal(report.coverage.resolution.jsonRestraintsEnabled,true);
  assert.equal(report.coverage.sources[0].kind,'LINESTOP');
  assert.ok(report.records.some(row=>row.after?.Type==='LIM'&&row.after.Gap==='25'));
});

test('a source with no consumed staged JSON is explicitly XML-only coverage',async()=>{
  const input={...job(),stagedJsonText:''},journal=createActiveRestraintJournal(input);
  recordActiveRestraintStage(journal,'original-only',xml);
  const report=await finishActiveRestraintAudit(journal,{enrichedText:xml});
  assert.equal(report.coverage.status,'NO_STAGED_JSON');
});

async function prepared(input=job()) {
  const parity=await enrichStandaloneXmlForRun(input);assert.equal(parity.applied,true,parity.error);
  return {input,parity,journal:parity.restraintAuditJournal};
}

function removeStop(xmlText,nodeNumber) {
  const document=new DOMParser().parseFromString(xmlText,'application/xml');
  const node=[...document.getElementsByTagName('Node')].find(node=>node.getElementsByTagName('NodeNumber')[0]?.textContent===nodeNumber);
  for(const restraint of [...node.getElementsByTagName('Restraint')])
    if(restraint.getElementsByTagName('Type')[0]?.textContent==='LIM')node.removeChild(restraint);
  return new XMLSerializer().serializeToString(document);
}

test('missing source-derived LIM is caught even when the surviving original +Y is valid',async()=>{
  const {parity,journal}=await prepared();
  // Reproduce the reported output boundary: original XML survived; JSON-derived
  // additions did not. Expectations still come from the original consumed job.
  const report=await finishActiveRestraintAudit(journal,{enrichedText:xml});
  assert.equal(report.status,'FAILED');assert.equal(report.coverage.summary.missing,1);
  assert.equal(report.coverage.sources[0].status,'MISSING_RESTRAINT');
  assert.equal(report.coverage.sources[0].missing[0].type,'LIM');
  assert.equal(report.coverage.sources[0].missing[0].gap,'25');
  assert.ok(report.records.some(row=>row.after?.Type==='+Y'));
});

test('one member applied at several legacy targets is checked at every original occurrence',async()=>{
  const input=job();input.sourceText=xml.replace('</Branch>','<Node><NodeNumber>21</NodeNumber><NodeName>PS-20.2</NodeName><ComponentType>ANCI</ComponentType><Position>100 0 0</Position></Node></Branch>');
  const {parity,journal}=await prepared(input);
  const report=await finishActiveRestraintAudit(journal,{enrichedText:removeStop(parity.xmlText,'21')});
  const source=report.coverage.sources[0];assert.equal(source.candidates.length,2);
  assert.equal(source.status,'MISSING_RESTRAINT');assert.deepEqual(source.missing.map(row=>row.target.nodeNumber),['21']);
  assert.ok(report.records.some(row=>row.target.nodeNumber==='20'&&row.after?.Type==='LIM'));
});

test('independent source gap expectation detects changed enriched gap without a CII writer',async()=>{
  const {parity,journal}=await prepared();
  const document=new DOMParser().parseFromString(parity.xmlText,'application/xml');
  const stop=[...document.getElementsByTagName('Restraint')].find(row=>row.getElementsByTagName('Type')[0]?.textContent==='LIM');
  stop.getElementsByTagName('Gap')[0].textContent='26';
  const report=await finishActiveRestraintAudit(journal,{enrichedText:new XMLSerializer().serializeToString(document)});
  assert.equal(report.coverage.sources[0].status,'SOURCE_GAP_MISMATCH');assert.equal(report.status,'FAILED');
});

test('original duplicate source occurrences are retained by exact path',async()=>{
  const input=job(),json=JSON.parse(input.stagedJsonText);json[0].children.push(support());input.stagedJsonText=JSON.stringify(json);
  const {parity,journal}=await prepared(input),report=await finishActiveRestraintAudit(journal,{enrichedText:parity.xmlText});
  assert.equal(report.coverage.summary.supportOccurrences,2);
  assert.deepEqual(report.coverage.sources.map(row=>row.path),['$[0].children[0]','$[0].children[1]']);
});

test('unmatched source and out-of-scope source retain different explicit dispositions',async()=>{
  const input=job(),json=JSON.parse(input.stagedJsonText);
  json[0].children[0].attributes.NAME='/PS-999.1';json[0].children[0].attributes.POS={x:10000,y:0,z:0};
  json.push({type:'BRANCH',name:'/OTHER/B1',children:[support('/PS-998.1')]});input.stagedJsonText=JSON.stringify(json);
  const {parity,journal}=await prepared(input),report=await finishActiveRestraintAudit(journal,{enrichedText:parity.xmlText});
  assert.deepEqual(report.coverage.sources.map(row=>row.status),['SOURCE_UNBOUND','EXCLUDED_BRANCH']);
  assert.equal(report.coverage.summary.unbound,1);assert.equal(report.coverage.summary.excluded,1);
});

test('source census survives JSON, CSV and readable reports when materialization is missing',async()=>{
  const {parity,journal}=await prepared(),report=await finishActiveRestraintAudit(journal,{enrichedText:removeStop(parity.xmlText,'20')});
  assert.match(restraintAuditCsv(report),/SOURCE_COVERAGE/);assert.match(restraintAuditCsv(report),/MISSING_RESTRAINT/);
  assert.match(restraintAuditHtml(report),/Source support coverage/);assert.match(restraintAuditHtml(report),/25MM GAP/);
});

test('currency diagnostics identify consumed JSON, options and configuration differences',async()=>{
  const input=normalizeWorkflowJob({...job(),sourceKind:'xml'}).job;
  const {parity,journal}=await prepared(input),result={enrichedText:parity.xmlText,ciiText:''};
  const report=await finishActiveRestraintAudit(journal,result);result.restraintAudit=report;
  report.run.requestSha256=await activeAuditJobIdentity(input);report.run.requestManifest=await activeAuditJobManifest(input);
  const ref={current:{job:input,result}},build=async state=>state.job;
  assert.equal((await inspectActiveRestraintAudit(ref,report,build,normalizeWorkflowJob)).code,'CURRENT');
  for(const [key,value] of [['stagedJsonText',''],['supportConfigJson','{}'],['options',{...input.options,kgToNewton:false}]]) {
    ref.current.job={...input,[key]:value};
    const status=await inspectActiveRestraintAudit(ref,report,build,normalizeWorkflowJob);
    assert.equal(status.code,'RUN_INPUTS_CHANGED');assert.deepEqual(status.changed,[key]);assert.equal(status.current,false);
  }
  ref.current.job=input;report.coverage.sources[0].status='forged';
  assert.equal((await inspectActiveRestraintAudit(ref,report,build,normalizeWorkflowJob)).code,'AUDIT_SEAL_MISMATCH');
});

test('removing a source occurrence and recomputing the report hash still fails current-source census',async()=>{
  const input=normalizeWorkflowJob({...job(),sourceKind:'xml'}).job;
  const {parity,journal}=await prepared(input),result={enrichedText:parity.xmlText,ciiText:''};
  const report=await finishActiveRestraintAudit(journal,result);result.restraintAudit=report;
  report.run.requestSha256=await activeAuditJobIdentity(input);
  report.coverage.sources=[];report.recorded.coverage=report.coverage;
  const {auditSha256,...recorded}=report.recorded;report.recorded.auditSha256=await digestCanonical(recorded);
  const ref={current:{job:input,result}};
  assert.equal((await inspectActiveRestraintAudit(ref,report,async state=>state.job,normalizeWorkflowJob)).code,'SOURCE_CENSUS_MISMATCH');
});

test('real native CII field agreement cannot hide an omitted source restraint',async t=>{
  const input={...job(),sourceKind:'xml',sourceName:'literal.xml',options:{outputMode:'both',splitCondensedValveFlange:false}};
  const end=(id,x)=>`<Node><NodeNumber>${id}</NodeNumber><ComponentType>PIPE</ComponentType><Position>${x} 0 0</Position><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness></Node>`;
  input.sourceText=xml.replace('<Node>',''+end(10,0)+'<Node>').replace('</Branch>',end(30,200)+'</Branch>')
    .replace('<Restraint>','<OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness><Restraint>')
    .replace('<PipeStressExport>','<PipeStressExport><Pipe>').replace('</PipeStressExport>','</Pipe></PipeStressExport>');
  const {journal}=await prepared(input);
  const dir=mkdtempSync(path.join(tmpdir(),'xmlcii-missing-source-'));
  t.after(()=>{assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));assert.equal(lstatSync(dir).isSymbolicLink(),false);assert.match(path.basename(dir),/^xmlcii-missing-source-/);rmSync(dir,{recursive:true});});
  const inputPath=path.join(dir,'input.xml'),stagedJsonPath=path.join(dir,'stage.json');
  // Explicit fault injection at the writer boundary: write original XML only,
  // while the audit retains the actual source-stop expectation from preparation.
  writeFileSync(inputPath,input.sourceText);writeFileSync(stagedJsonPath,'[]');
  const invocation=buildStandaloneCiiInvocation({...input,stagedJsonText:'[]'}, {inputPath,stagedJsonPath},dir.replaceAll('\\','/'));
  const script=fileURLToPath(new URL('../v045/converters/scripts/'+path.basename(invocation.scriptPath),import.meta.url));
  execFileSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),[script,...invocation.argv.slice(1)],{maxBuffer:8*1024*1024});
  const report=await finishActiveRestraintAudit(journal,{enrichedText:input.sourceText,ciiText:readFileSync(invocation.outputPath,'utf8')});
  assert.equal(report.summary.verified,1);assert.equal(report.summary.failed,0);
  assert.equal(report.status,'FAILED');assert.equal(report.coverage.summary.missing,1);
  assert.equal(report.coverage.sources[0].missing[0].type,'LIM');
});
