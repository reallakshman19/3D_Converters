// Literal engineering expectations; real JS/Python evaluation, explicit lightweight XML DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {governedSupportKind} from '../converters/xml-cii2019-core/support-kind-precedence.js';
import {migrateSupportMappingConfig} from '../converters/xml-cii2019-core/support-mapping-config.js';
import {runStandaloneSupportTypeMapper} from '../tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {nativeTestPython as nativePython} from './helpers/native-python.mjs';

installWeightBasisXmlDom(globalThis);
const attrs={NAME:'/STOP-A',SPRE:'/MDS-Ancillaries/ANCI/ST06',CMPSUPGAP:'25MM GAP'};
const trace=fields=>({resolvedFacts:[{xmlNodeNumber:'3610',positionMembers:[{supportEvidence:fields}]}]});
function pythonKinds(cases,config){
  const script=['import json,sys','sys.path.insert(0,"converters/scripts")',
    'import xml229_prefinal_restraints as p','d=json.load(sys.stdin)',
    'def require(ok,code):',' if not ok: raise ValueError(code)',
    'print(json.dumps([list(p.kinds([{"attrs":a,"desc":""}],require,d["config"])) for a in d["cases"]]))'].join('\n');
  return JSON.parse(execFileSync(nativePython,['-c',script],{
    input:JSON.stringify({cases,config}),encoding:'utf8'}).trim().split('\n').pop());
}

test('catalogue ST06 is LINESTOP without treating incidental ANCI as REST',()=>{
  assert.equal(governedSupportKind(attrs,{}).kind,'LINESTOP');
  assert.deepEqual(pythonKinds([attrs],{}),[['LINESTOP']]);
});

test('saved built-in rule edits survive normalization and decide in JS and Python',()=>{
  const row={id:'builtin-user-rest',priority:3,field:'NAME',pattern:'/STOP-A',match:'equals',kind:'GUIDE'};
  const config={supportMapping:{version:2,rules:[row]}};
  const actual=migrateSupportMappingConfig(config).rules.find(r=>r.id===row.id);
  for(const key of ['priority','field','pattern','match','kind'])assert.equal(actual[key],row[key],key);
  assert.equal(governedSupportKind(attrs,config).kind,'GUIDE');
  assert.deepEqual(pythonKinds([attrs],config),[['GUIDE']]);
});

test('Test and Save use one complete effective configuration and record the winning source rule',async()=>{
  const before=runStandaloneSupportTypeMapper({supportConfigJson:'{}',resolverJsonTraceResult:trace(attrs)});
  const saved=JSON.parse(before.supportConfigJson);
  assert.equal(before.previewRows[0].supportKind,'LINESTOP');
  assert.ok(saved.supportMapping.rules.some(r=>r.field==='SPRE'&&r.pattern.includes('ST06')));
  const after=runStandaloneSupportTypeMapper({supportConfigJson:before.supportConfigJson,resolverJsonTraceResult:trace(attrs)});
  assert.equal(after.previewRows[0].supportKind,'LINESTOP');
  assert.deepEqual(pythonKinds([attrs],saved),[['LINESTOP']]);
  const xml='<PipeStressExport><Branch><Branchname>/P/B1</Branchname><Node><NodeNumber>3610</NodeNumber><NodeName>STOP-A</NodeName><ComponentType>ANCI</ComponentType><Position>100 200 300</Position></Node></Branch></PipeStressExport>';
  const stagedJsonText=JSON.stringify([{type:'BRAN',attributes:{NAME:'/P/B1'},children:[
    {type:'ANCI',attributes:{...attrs,POS:{x:100,y:200,z:300},COMPRE:'/P/B1'}}]}]);
  const stage=await prepareXml229PrefinalRestraints({xmlText:xml,stagedJsonText,config:saved});
  const record=stage.proof.restraintAudit.records.find(r=>r.after?.Type==='LIM');
  assert.ok(record,'LIM is prepared, not just displayed');
  assert.equal(Number(record.after.Gap),25);
  assert.equal(record.decision.rule.matchEvidence.sourceField,'SPRE');
  assert.equal(record.decision.rule.matchEvidence.value,attrs.SPRE);
  assert.equal(after.previewRows[0].matchedAlias,record.decision.rule.id);
});

test('removed prefix aliases remove their generated rows instead of retaining stale rules',()=>{
  const first=runStandaloneSupportTypeMapper({supportConfigJson:'{}'});
  const mapperRows=first.mapperRows.map(r=>({...r,aliases:r.kind==='GUIDE'?[]:r.aliases}));
  const second=runStandaloneSupportTypeMapper({supportConfigJson:first.supportConfigJson,mapperRows});
  const rows=JSON.parse(second.supportConfigJson).supportMapping.rules;
  assert.ok(!rows.some(r=>r.id==='standalone-mds-gt-guide'));
});

test('configured NODETYPE mutation remains authoritative and a contradictory user row is refused',()=>{
  const config={inputXmlRestraintTypeMutation:{enabled:true,rows:[{from:'30',to:'9',label:'LIM'}]}};
  assert.equal(governedSupportKind({...attrs,NODETYPE:'30'},config).kind,'LINESTOP');
  assert.deepEqual(pythonKinds([{...attrs,NODETYPE:'30'}],config),[['LINESTOP']]);
  const conflict={...config,supportMapping:{version:2,rules:[{id:'owner-conflict',priority:1,
    field:'SPRE',pattern:'ST06',match:'contains',kind:'GUIDE'}]}};
  assert.throws(()=>governedSupportKind({...attrs,NODETYPE:'30'},conflict),/TYPE_KIND_CONFLICT/);
  assert.throws(()=>pythonKinds([{...attrs,NODETYPE:'30'}],conflict),/TYPE_KIND_CONFLICT/);
});

test('invalid populated source NODETYPE is refused in Preview and native preparation',()=>{
  for(const value of ['99','0','not-a-code']){
    const fields={...attrs,NODETYPE:value};
    const preview=runStandaloneSupportTypeMapper({supportConfigJson:'{}',resolverJsonTraceResult:trace(fields)});
    assert.equal(preview.previewRows[0].status,'refused',value);
    assert.match(preview.previewRows[0].decisionReason,/TYPE_INVALID/);
    assert.throws(()=>pythonKinds([fields],{}));
  }
});

test('configured XML type profile reaches Preview and preparation; source NODETYPE overrides it',async()=>{
  const xml='<PipeStressExport><Branch><Branchname>/P/B1</Branchname><Node><NodeNumber>3610</NodeNumber><NodeName>STOP-A</NodeName><ComponentType>ANCI</ComponentType><Position>100 200 300</Position></Node></Branch></PipeStressExport>';
  const config={supportMapping:{version:2,kindProfiles:{LINESTOP:{xmlTypes:['GUI']}}}};
  for(const [fields,expected] of [[{...attrs,MDSDTXR:'LINE STOP'},'GUI'],[{...attrs,MDSDTXR:'LINE STOP',NODETYPE:'9'},'LIM']]){
    const preview=runStandaloneSupportTypeMapper({supportConfig:config,resolverJsonTraceResult:trace(fields)});
    const stagedJsonText=JSON.stringify([{type:'BRANCH',name:'/P/B1',children:[{
      type:'ANCI',attributes:{...fields,POS:{x:100,y:200,z:300}}}]}]);
    const stage=await prepareXml229PrefinalRestraints({xmlText:xml,stagedJsonText,config});
    assert.equal(stage.proof.restraintAudit.records[0].after.Type,expected);
    assert.equal(preview.previewRows[0].runtimeXmlTypes,expected);
    const script=['import sys,json,xml.etree.ElementTree as ET','sys.path.insert(0,"converters/scripts")',
      'import xml229_prefinal_restraints as p','d=json.load(sys.stdin)','n=ET.Element("Node")',
      'def require(ok,code):',' if not ok: raise ValueError(code)',
      'for k,a in p.kinds([{"attrs":d["fields"],"desc":""}],require,d["config"]).items(): p.append_profile(n,k,a,d["config"])',
      'print(json.dumps([r.findtext("Type") for r in n.findall("Restraint")]))'].join('\n');
    assert.deepEqual(JSON.parse(execFileSync(nativePython,['-c',script],{
      input:JSON.stringify({fields,config}),encoding:'utf8'}).trim()),[expected]);
    if(!fields.NODETYPE)await assert.rejects(prepareXml229PrefinalRestraints({xmlText:xml,stagedJsonText,
      config:{...config,xml229PhysicalVertexPrefinal:true}}),{code:'XML229_V2_PROFILE_TYPE_NOT_QUALIFIED'});
  }
});
