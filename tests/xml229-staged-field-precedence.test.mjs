import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {stagedFieldKindDecision} from '../converters/xml-cii2019-core/support-kind-precedence.js';
import {migrateSupportMappingConfig} from '../converters/xml-cii2019-core/support-mapping-config.js';
import {nativeTestPython} from './helpers/native-python.mjs';
installWeightBasisXmlDom(globalThis);
const branch='/SYNTHETIC/P1/B1';
const XML='<PipeStressExport><Branch><Branchname>'+branch+'</Branchname><Node><NodeNumber>140</NodeNumber><NodeName>SL-SYNTH.1.1</NodeName><ComponentType>ANCI</ComponentType><Position>0 0 0</Position></Node></Branch></PipeStressExport>';
const member=(name,func,code,catalogue,gap)=>({type:'SUPPORT',attributes:{
 NAME:name,MDSSUPPFUNC:func,MDSSUPPTYPE:code,CMPSUPTYPE:catalogue,CMPSUPGAP:gap,
 NODETYPE:'14',NODEGAP:'0',NODESTIFF:'999',NODEFRICTION:'0.3',POS:{x:0,y:0,z:0}}});
const input=()=>[{type:'BRANCH',name:branch,children:[
 member('/SL-SYNTH.1.1','PIPE-REST','PIPE-REST','REST','GAP=0mm'),
 member('/SL-SYNTH.1.2','ST','ST501','LS-S2-3','GAP=35mm'),
 member('/SL-SYNTH.1.3','GT','GT500','PG-S-3','GAP=10mm')]}];
const cfg={xml229SourceFieldPrecedence:{mappedCodes:false},dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:0},resolverJsonTrace:{matchMode:'POS',coordinateTolerance:6},defaultStiffness:'123456',defaultFriction:'0.3'};
const all={...cfg,xml229SourceFieldPrecedence:{mappedCodes:false,type:true,gap:true,stiffness:true,friction:true}};
all.supportMapping=migrateSupportMappingConfig(all);
all.supportMapping.kindProfiles.GUIDE.gap='12';
all.supportMapping.kindProfiles.LINESTOP.stiffness='777';
all.supportMapping.kindProfiles.GUIDE.frictionMode='fixed';
all.supportMapping.kindProfiles.GUIDE.fixedFriction='0';
const fields=['Type','Gap','Stiffness','Friction'];
const rows=doc=>[...doc.getElementsByTagName('Restraint')].map(r=>fields.map(k=>r.getElementsByTagName(k)[0].textContent));
const stage=(src,config,purpose='final')=>prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:JSON.stringify(src),config,policy:purpose});
const native=(source,config)=>JSON.parse(execFileSync(nativeTestPython,['-c',[
'import json,sys,xml.etree.ElementTree as ET',
'sys.path.insert(0,"converters/scripts")',
'from xml229_prefinal_restraints import kinds,append_profile',
'd=json.load(sys.stdin)',
'def require(condition,code):',
' if not condition: raise ValueError(code)',
'entries=[dict(attrs=m["attributes"],desc="") for m in d["source"][0]["children"]]',
'selected=kinds(entries,require,d["config"])',
'n=ET.Element("Node")',
'for k in ("REST","GUIDE","LINESTOP"):',
' if k in selected: append_profile(n,k,selected[k],d["config"])',
'print(json.dumps([[r.findtext(k) for k in ("Type","Gap","Stiffness","Friction")] for r in n.findall("Restraint")]))'
].join('\n')],{input:JSON.stringify({source,config}),encoding:'utf8'}).trim().split('\n').at(-1));
const numericRows=rs=>rs.map(([t,...v])=>[t,...v.map(Number)]);
test('explicit type precedence resolves the physical ST/GT conflict without changing source; exact native parity',async()=>{
 const source=input(),before=JSON.stringify(source);
 await assert.rejects(stage(source,cfg),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 const review=await stage(source,cfg,'preview');assert.equal(review.restraintReview.status,'FOR_REVIEW');
 const got=await stage(source,all);
 assert.equal(got.restraintReview.warnings.length,0);
 const expected=[['+Y',0,123456,.3],['GUI',10,123456,0],['LIM',35,777,-1.0101]];
 assert.deepEqual(numericRows(rows(got.document)),expected);
 assert.deepEqual(numericRows(native(source,all)),expected);
 assert.equal(JSON.stringify(source),before);
 assert.equal(got.proof.restraintAudit.recordedConfig.xml229SourceFieldPrecedence.type,true);
 const guide=got.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.equal(guide.decision.source,'explicit-staged-field-precedence');
 assert.equal(guide.source.member.fields.NODETYPE,'14');
});
test('gap policy chooses catalogue clearance over nonzero NODEGAP, profile only if catalogue absent; numeric source fields win',async()=>{
 const source=input();
 const guide=source[0].children[2].attributes;
 guide.CMPSUPGAP='';guide.NODEGAP='99';guide.STIFFNESS='321';guide.FRICTION='0';
 const stop=source[0].children[1].attributes;stop.NODEGAP='88';
 const got=await stage(source,all);
 assert.deepEqual(numericRows(rows(got.document)),[['+Y',0,123456,.3],['GUI',12,321,0],['LIM',35,777,-1.0101]]);
 assert.deepEqual(numericRows(native(source,all)),numericRows(rows(got.document)));
 await assert.rejects(stage(source,{...all,xml229SourceFieldPrecedence:{type:true}}),{code:'PREFINAL_RESTRAINT_GAP_AMBIGUOUS'});
 const gapless=input();gapless[0].children[2].attributes.CMPSUPGAP='';
 await assert.rejects(stage(gapless,{...all,xml229SourceFieldPrecedence:{type:true}}),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 const conflict=input();conflict[0].children[2].attributes.CMPSUPGAP_POS='20mm';
 await assert.rejects(stage(conflict,all),{code:'PREFINAL_RESTRAINT_GAP_AMBIGUOUS'});
});
test('saved Step 7 rules decide field preference; ambiguous priorities and unsupported profiles remain fatal',async()=>{
 const attrs={NODETYPE:'14',SKEY:'CUSTOM'};
 const custom=structuredClone(all);
 custom.supportMapping.rules.push({id:'user-custom',field:'SKEY',source:'staged-json',priority:1,enabled:true,match:'equals',pattern:'CUSTOM',kind:'GUIDE'});
 assert.equal(stagedFieldKindDecision(attrs,custom).kind,'GUIDE');
 assert.equal(stagedFieldKindDecision({...attrs,SKEY:'',SUPPORT_KIND:'GUIDE'},custom),null);
 custom.supportMapping.rules.push({id:'user-tie',field:'SKEY',source:'staged-json',priority:1,enabled:true,match:'equals',pattern:'CUSTOM',kind:'LINESTOP'});
 assert.throws(()=>stagedFieldKindDecision(attrs,custom),{code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
 await assert.rejects(stage(input(),{...all,xml229PhysicalVertexPrefinal:true}),{code:'PREFINAL_RESTRAINT_CONFIG_INVALID'});
});

test('raw SOURCE_NODETYPE cannot be silently hidden by a proposed effective NODETYPE',async()=>{
 const source=input();
 const guide=source[0].children[2].attributes;guide.SOURCE_NODETYPE='14';guide.NODETYPE='8';
 const stop=source[0].children[1].attributes;stop.SOURCE_NODETYPE='14';stop.NODETYPE='9';
 await assert.rejects(stage(source,cfg),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 const result=await stage(source,all,'preview');
 assert.equal(result.restraintReview.status,'CLEAR');
 assert.deepEqual(numericRows(rows(result.document)),numericRows(native(source,all)));
 const guideAudit=result.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.equal(guideAudit.decision.rule.originalNodeType,'14');
 assert.equal(guideAudit.source.member.fields.SOURCE_NODETYPE,'14');
});

function regenerated(){
 const source=input();
 for(const [index,code,rule] of [[1,'9','builtin-ls'],[2,'8','builtin-pg']]){
   const attrs=source[0].children[index].attributes;
   Object.assign(attrs,{SOURCE_NODETYPE:'14',SOURCE_NODEGAP:'0',NODETYPE:code,
     NODETYPE_CODES:[code],NODETYPE_CLASSIFICATION_SOURCE:'STEP7_SUPPORT_MAPPING',
     SUPPORT_EFFECTIVE_NODETYPE:code,SUPPORT_MAPPING_RULE_ID:rule,
     SUPPORT_MAPPING_STATUS:'FOR_REVIEW_SOURCE_NODETYPE_CORRECTED',
     SUPPORT_MAPPING_REQUIRES_ENGINEERING_APPROVAL:true});
 }
 return source;
}
test('regenerated export: original type custody, actual current policy receipt and native verification',async()=>{
 const source=regenerated(),before=JSON.stringify(source);
 const off=await stage(source,cfg,'preview');
 assert.equal(off.restraintReview.status,'FOR_REVIEW');
 assert.deepEqual(off.restraintReview.policySummary.warningReasons,{STEP7_TYPE_PRECEDENCE_OFF:2});
 const accepted=await stage(source,all,'preview');
 assert.equal(accepted.restraintReview.status,'CLEAR');
 assert.equal(accepted.restraintReview.policySummary.typeDecisionOccurrences,2);
 assert.equal(accepted.restraintReview.policySummary.uniqueTypeDecisionMembers,2);
 assert.equal(accepted.restraintReview.policySummary.flags.type,true);
 assert.match(accepted.restraintReview.policySummary.configSha256,/^[a-f0-9]{64}$/);
 const guide=accepted.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.equal(guide.decision.rule.resolutionStatus,'RESOLVED_BY_STEP7_POLICY');
 assert.equal(guide.decision.rule.exportedProposalVerified,true);
 assert.equal(guide.source.member.fields.SOURCE_NODETYPE,'14');
 assert.deepEqual(numericRows(native(source,all)),numericRows(rows(accepted.document)));
 assert.equal(JSON.stringify(source),before);
 const gapless=regenerated();gapless[0].children[2].attributes.CMPSUPGAP='';
 const typeOnly=await stage(gapless,{...all,xml229SourceFieldPrecedence:{type:true}},'preview');
 assert.deepEqual(typeOnly.restraintReview.policySummary.warningReasons,{STEP7_GAP_POLICY_OR_SAVED_GAP_REQUIRED:1});
 const gap=await stage(gapless,all,'preview');
 assert.equal(gap.restraintReview.status,'CLEAR');
 assert.equal(numericRows(rows(gap.document)).find(r=>r[0]==='GUI')[1],12);
 const stale=regenerated();stale[0].children[2].attributes.NODETYPE_CODES=['14'];
 const held=await stage(stale,all,'preview');
 assert.deepEqual(held.restraintReview.policySummary.warningReasons,{STEP7_RULE_OR_EXPORTED_PROPOSAL_MISMATCH:1});
 await assert.rejects(stage(stale,all),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
 assert.throws(()=>native(stale,all),/NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/);
});
test('actual independent O1 Worker recomputes the review against its own config, no global Preview status',async()=>{
 const source=regenerated(),json=JSON.stringify(source),blob=new Blob([json]);
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
 const old={onmessage:globalThis.onmessage,postMessage:globalThis.postMessage,close:globalThis.close};
 try{
   globalThis.onmessage=null;globalThis.close=()=>{};
   const messages=[];globalThis.postMessage=m=>messages.push(m);
   await import('../tabs/xml-cii-2019-standalone/workers/lfj-o1-resolver-domain-worker.mjs');
   const run=async(config,id)=>{
     messages.length=0;
     await globalThis.onmessage({data:{schema:'LFJ.O1.DomainWorker.v1',kind:'RUN',jobId:id,
       sourceRefId:'synthetic',sourceSha256:sha,sourceRevision:'v1',selectionDigest:'ALL',
       byteLength:blob.size,committedRoot:{startByte:0,endByteExclusive:blob.size},jsonBlob:blob,
       sourceText:XML,sourceKind:'xml',jsonConfig:cfg.resolverJsonTrace,supportConfigJson:JSON.stringify(config)}});
     const ready=messages.find(m=>m.kind==='READY');
     assert.ok(ready,JSON.stringify(messages));
     const {buildStagedJsonTraceSidecar}=await import('../tabs/xml-cii-2019-standalone/xml-cii-staged-json-trace-sidecar.js');
     const expected=buildStagedJsonTraceSidecar(json,{resolverJsonTrace:cfg.resolverJsonTrace});
     const req={schema:'LFJ.O1.DomainWorker.v1',jobId:id,sourceRefId:'synthetic',sourceSha256:sha,sourceRevision:'v1'};
     await globalThis.onmessage({data:{...req,kind:'EXPORT',type:'sidecar'}});
     const begin=messages.find(m=>m.kind==='EXPORT_BEGIN');
     assert.ok(begin,JSON.stringify(messages));assert.equal(begin.type,'sidecar');assert.equal(begin.rows,3);
     for(let i=0;i<100&&!messages.some(m=>m.kind==='EXPORT_END');i++)await globalThis.onmessage({data:{...req,kind:'EXPORT_ACK',token:begin.token}});
     assert.ok(messages.some(m=>m.kind==='EXPORT_END'));
     const chunks=messages.filter(m=>m.kind==='EXPORT_CHUNK').map(m=>m.bytes);
     assert.equal(await new Blob(chunks).text(),expected.csv);
     await globalThis.onmessage({data:{schema:'LFJ.O1.DomainWorker.v1',kind:'CANCEL'}});
     return ready;
   };
   const off=await run(cfg,'off'),on=await run({...all,xml229SourceFieldPrecedence:{mappedCodes:true,gap:true}},'on');
   assert.equal(off.restraintReview.status,'FOR_REVIEW');
   assert.equal(on.restraintReview.status,'CLEAR');
   assert.equal(on.restraintReview.policySummary.typeDecisionOccurrences,2);
   assert.equal(on.restraintReview.policySummary.mappedCodeDecisionOccurrences,2);
   assert.equal(on.restraintReview.sourceBasis.jsonSha256,sha);
   assert.equal(on.engineeringReady,false);
 }finally{Object.assign(globalThis,old);}
});

test('JSON Trace mapped-code checkbox alone resolves verified type conflicts and records its distinct authority',async()=>{
 const source=regenerated(),config={...all,xml229SourceFieldPrecedence:{mappedCodes:true}};
 const result=await stage(source,config,'preview');
 assert.equal(result.restraintReview.status,'CLEAR');
 assert.equal(result.restraintReview.policySummary.flags.type,false);
 assert.equal(result.restraintReview.policySummary.flags.mappedCodes,true);
 assert.equal(result.restraintReview.policySummary.mappedCodeDecisionOccurrences,2);
 assert.deepEqual(numericRows(rows(result.document)),numericRows(native(source,config)));
 const guide=result.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.deepEqual(guide.decision.rule.mappedCodes,['8']);
 assert.equal(guide.decision.rule.policy,'xml229SourceFieldPrecedence.mappedCodes');
 assert.equal(guide.source.member.fields.SOURCE_NODETYPE,'14');
 const gapless=regenerated();gapless[0].children[2].attributes.CMPSUPGAP='';
 const held=await stage(gapless,config,'preview');
 assert.deepEqual(held.restraintReview.policySummary.warningReasons,{STEP7_GAP_POLICY_OR_SAVED_GAP_REQUIRED:1});
 const both={...config,xml229SourceFieldPrecedence:{mappedCodes:true,gap:true}};
 const cleared=await stage(gapless,both,'preview');
 assert.equal(cleared.restraintReview.status,'CLEAR');
 assert.deepEqual(numericRows(rows(cleared.document)),numericRows(native(gapless,both)));
 for(const invalid of [undefined,[],['9'],['8','9'],['99']]){
   const stale=regenerated();
   if(invalid===undefined)delete stale[0].children[2].attributes.NODETYPE_CODES;
   else stale[0].children[2].attributes.NODETYPE_CODES=invalid;
   const review=await stage(stale,both,'preview');
   assert.equal(review.restraintReview.status,'FOR_REVIEW');
   await assert.rejects(stage(stale,both),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
   assert.throws(()=>native(stale,both),/NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/);
 }
 await assert.rejects(stage(source,{...config,xml229PhysicalVertexPrefinal:true}),{code:'PREFINAL_RESTRAINT_CONFIG_INVALID'});
});
test('real two-column JSON Trace authority panel persists defaults, edits and reset',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const {installMiniDom,MiniElement}=require('./helpers/mini-dom.js');
 const {renderMappedCodePrecedence}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js');
 const {createXmlCiiAdaptedWorkflowState}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js');
 const oldDoc=globalThis.document,oldStorage=globalThis.localStorage;
 try{
   installMiniDom();
   const store=new Map();
   Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
   const ref={current:createXmlCiiAdaptedWorkflowState()};
   let renders=0;const panel=new MiniElement('section');
   renderMappedCodePrecedence(panel,ref,()=>renders++);
   const field=(p,k='primary')=>'[data-field="xml229-source-field-precedence-'+p+'-'+k+'"]';
   assert.equal(panel.querySelector(field('nodeType')).value,'supportMapper');
   assert.equal(panel.querySelector(field('gap')).value,'json');
   assert.equal(panel.querySelector(field('gap','fallback')).value,'supportMapper');
   assert.equal(panel.querySelector(field('stiffness')).value,'supportMapper');
   assert.equal(panel.querySelector(field('friction')).value,'json');
   const select=panel.querySelector(field('nodeType'));
   select.value='json';select.dispatch('change');
   assert.equal(JSON.parse(ref.current.supportConfigJson).xml229RestraintPrecedence.nodeType.primary,'json');
   assert.equal(JSON.parse(store.get('xml-cii-import-masters-v1')).config.xml229RestraintPrecedence.nodeType.primary,'json');
   assert.equal(renders,1);
   const restored={current:createXmlCiiAdaptedWorkflowState()};
   const restoredPanel=new MiniElement('section');
   renderMappedCodePrecedence(restoredPanel,restored,()=>{});
   assert.equal(restoredPanel.querySelector(field('nodeType')).value,'json');
   restoredPanel.querySelector('[data-field="xml229-source-field-precedence-reset"]').dispatch('click');
   assert.equal(JSON.parse(restored.current.supportConfigJson).xml229RestraintPrecedence.nodeType.primary,'supportMapper');
 }finally{
   globalThis.document=oldDoc;
   Object.defineProperty(globalThis,'localStorage',{configurable:true,value:oldStorage});
 }
});

test('failed mapped proposal cannot fall through to generated scalar outside physical ST/GT detector',async()=>{
 const source=regenerated(),attrs=source[0].children[2].attributes;
 attrs.MDSSUPPFUNC='OTHER';
 attrs.NODETYPE_CODES=['9'];
 const config={...all,xml229SourceFieldPrecedence:{mappedCodes:true,gap:true}};
 const review=await stage(source,config,'preview');
 assert.equal(review.restraintReview.status,'FOR_REVIEW');
 await assert.rejects(stage(source,config),{code:'PREFINAL_RESTRAINT_TYPE_AMBIGUOUS'});
 assert.throws(()=>native(source,config),/NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS/);
});

test('mapped codes default ON in V1, explicit OFF persists, V2 default remains unqualified',async()=>{
 const source=regenerated(),before=JSON.stringify(source);
 const config={...cfg,supportMapping:all.supportMapping};
 delete config.xml229SourceFieldPrecedence;
 const result=await stage(source,config,'preview');
 assert.equal(result.restraintReview.status,'CLEAR');
 assert.equal(result.restraintReview.policySummary.flags.mappedCodes,true);
 assert.equal(result.restraintReview.policySummary.flags.type,false);
 assert.equal(result.restraintReview.policySummary.mappedCodeDecisionOccurrences,2);
 assert.equal(result.proof.restraintAudit.recordedConfig.xml229SourceFieldPrecedence.mappedCodes,true);
 assert.deepEqual(numericRows(rows(result.document)),numericRows(native(source,config)));
 assert.equal(JSON.stringify(source),before);
 const off={...config,xml229SourceFieldPrecedence:{mappedCodes:false}};
 assert.equal((await stage(source,off,'preview')).restraintReview.status,'FOR_REVIEW');
 assert.throws(()=>native(source,off),/NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/);
 const {mappedCodePrecedenceEnabled}=await import('../converters/xml-cii2019-core/support-kind-precedence.js');
 assert.equal(mappedCodePrecedenceEnabled({xml229PhysicalVertexPrefinal:true}),false);
 assert.equal(mappedCodePrecedenceEnabled({xml229PhysicalVertexPrefinal:true,xml229SourceFieldPrecedence:{mappedCodes:true}}),true);
});

test('Step 3 field precedence: real exporter receipt, profile gap fallback, JSON friction, mapper stiffness and native parity',async()=>{
 const {DEFAULT_RESTRAINT_PRECEDENCE}=await import('../converters/xml-cii2019-core/restraint-precedence-policy.js');
 const config={...all,xml229RestraintPrecedence:DEFAULT_RESTRAINT_PRECEDENCE};
 const source=regenerated(),guide=source[0].children[2].attributes,stop=source[0].children[1].attributes;
 Object.assign(guide,{CMPSUPGAP:null,SUPPORT_GAP_SOURCE:'STEP7_KIND_PROFILE',SUPPORT_EFFECTIVE_GAP:'0',NODEFRICTION:'0',NODESTIFF:'999'});
 Object.assign(stop,{SUPPORT_GAP_SOURCE:'CMPSUPGAP',SUPPORT_EFFECTIVE_GAP:'35',NODEFRICTION:'0.3',NODESTIFF:'999'});
 const before=JSON.stringify(source);
 const result=await stage(source,config,'preview');
 assert.equal(result.restraintReview.status,'CLEAR');
 assert.deepEqual(numericRows(rows(result.document)),[['+Y',0,123456,.3],['GUI',12,123456,0],['LIM',35,777,.3]]);
 assert.deepEqual(numericRows(native(source,config)),numericRows(rows(result.document)));
 assert.equal(JSON.stringify(source),before);
 const g=result.proof.restraintAudit.records.find(x=>x.after?.Type==='GUI');
 assert.equal(g.fields.find(x=>x.name==='Gap').evidence.authority,'support-profile/config');
 const l=result.proof.restraintAudit.records.find(x=>x.after?.Type==='LIM');
 assert.equal(l.fields.find(x=>x.name==='Friction').evidence.attribute,'NODEFRICTION');
 const zero=regenerated();Object.assign(zero[0].children[2].attributes,{CMPSUPGAP:'GAP=0mm',SUPPORT_GAP_SOURCE:'CMPSUPGAP',SUPPORT_EFFECTIVE_GAP:'0',NODEFRICTION:'0.2'});
 const z=await stage(zero,config,'preview');assert.equal(numericRows(rows(z.document)).find(r=>r[0]==='GUI')[1],0);
 assert.deepEqual(numericRows(native(zero,config)),numericRows(rows(z.document)));
 const jsonType={...config,xml229RestraintPrecedence:{...DEFAULT_RESTRAINT_PRECEDENCE,nodeType:{primary:'json',fallback:'review'}}};
 assert.equal((await stage(source,jsonType,'preview')).restraintReview.status,'FOR_REVIEW');
 assert.throws(()=>native(source,jsonType),/NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/);
 const reversed={...config,xml229RestraintPrecedence:{...DEFAULT_RESTRAINT_PRECEDENCE,gap:{primary:'supportMapper',fallback:'review'},stiffness:{primary:'json',fallback:'review'},friction:{primary:'supportMapper',fallback:'review'}}};
 const rr=await stage(source,reversed,'preview');
 assert.deepEqual(numericRows(native(source,reversed)),numericRows(rows(rr.document)));
 assert.equal(numericRows(rows(rr.document)).find(r=>r[0]==='LIM')[2],999);
 assert.equal(numericRows(rows(rr.document)).find(r=>r[0]==='LIM')[3],-1.0101);
 const invalid=regenerated();invalid[0].children[2].attributes.CMPSUPGAP='garbage';
 assert.equal((await stage(invalid,config,'preview')).restraintReview.status,'FOR_REVIEW');
 assert.throws(()=>native(invalid,config),/NATIVE_PREFINAL_RESTRAINT_GAP_INVALID/);
});

test('Node Type priority and fallback are executable rather than display-only',async()=>{
 const {DEFAULT_RESTRAINT_PRECEDENCE}=await import('../converters/xml-cii2019-core/restraint-precedence-policy.js');
 const config={...all,xml229RestraintPrecedence:DEFAULT_RESTRAINT_PRECEDENCE};
 const receipt=regenerated();
 Object.assign(receipt[0].children[0].attributes,{SOURCE_NODETYPE:null,NODETYPE_CODES:['14'],NODETYPE_CLASSIFICATION_SOURCE:'STEP7_SUPPORT_MAPPING',SUPPORT_EFFECTIVE_NODETYPE:'14'});
 const accepted=await stage(receipt,config,'preview');
 assert.equal(accepted.restraintReview.status,'CLEAR');
 assert.deepEqual(numericRows(native(receipt,config)),numericRows(rows(accepted.document)));
 const missingRule=regenerated();
 const rest=missingRule[0].children[0].attributes;
 Object.assign(rest,{MDSSUPPFUNC:'UNKNOWN',MDSSUPPTYPE:'UNKNOWN',CMPSUPTYPE:'UNKNOWN'});
 const held=await stage(missingRule,config,'preview');
 assert.equal(held.restraintReview.status,'FOR_REVIEW');
 assert.throws(()=>native(missingRule,config),/NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS/);
 const fallback={...config,xml229RestraintPrecedence:{...DEFAULT_RESTRAINT_PRECEDENCE,nodeType:{primary:'supportMapper',fallback:'json'}}};
 const resolved=await stage(missingRule,fallback,'preview');
 assert.equal(resolved.restraintReview.status,'CLEAR');
 assert.deepEqual(numericRows(native(missingRule,fallback)),numericRows(rows(resolved.document)));
 const stale=regenerated();stale[0].children[2].attributes.NODETYPE_CODES=['9'];
 assert.equal((await stage(stale,config,'preview')).restraintReview.status,'FOR_REVIEW');
 assert.throws(()=>native(stale,config),/NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS/);
});

test('default O1 Save persists effective resolver config independently of source indexing and controls sidecar readiness',async()=>{
 const {createRequire}=await import('node:module');
 const {installMiniDom,MiniElement}=createRequire(import.meta.url)('./helpers/mini-dom.js');
 const {createXmlCiiAdaptedWorkflowState}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js');
 const {startLfjO1Domain,syncO1ResolverControls,revokeLfjO1Domain}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-o1-domain-ui.js');
 const oldDoc=globalThis.document,oldStorage=globalThis.localStorage;
 try{
   installMiniDom();
   const store=new Map();
   Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
   const stateRef={current:createXmlCiiAdaptedWorkflowState()};
   stateRef.current.resolverJsonTraceConfig={...stateRef.current.resolverJsonTraceConfig,matchMode:'ROOT',coordinateTolerance:17,dtxrPositionOffset:{enabled:true,xOffset:1,yOffset:2,zOffset:3}};
   const root=new MiniElement('div'),status=new MiniElement('span'),sidecar=new MiniElement('span'),button=new MiniElement('button');
   status.dataset.resolverWritebackStatus='true';sidecar.dataset.resolverSidecarStatus='true';button.dataset.action='download-json-trace-sidecar';
   root.appendChild(status);root.appendChild(sidecar);root.appendChild(button);
   const session={stateRef,container:root};
   await startLfjO1Domain(session,stateRef,{save:true});
   const config=JSON.parse(stateRef.current.supportConfigJson);
   assert.equal(config.resolverJsonTrace.matchMode,'ROOT');assert.equal(config.jsonTrace.coordinateTolerance,17);assert.equal(config.dtxrPositionOffset.zOffset,3);
   assert.equal(JSON.parse(store.get('xml-cii-import-masters-v1')).config.resolverJsonTrace.matchMode,'ROOT');
   assert.match(stateRef.current.resolverJsonTraceWriteBackStatus,/saved into standalone/);
   assert.equal(button.disabled,true);
   syncO1ResolverControls(session,{jsonTraceSidecarWorkerReady:true,jsonTraceSidecarStatus:'Verified sidecar ready'});
   assert.equal(button.disabled,false);assert.equal(sidecar.textContent,'Verified sidecar ready');
   assert.equal(stateRef.current.stagedJsonText,'');assert.equal(stateRef.current.jsonTraceSidecarCsv,'');
   revokeLfjO1Domain(session);assert.equal(button.disabled,true);
   assert.equal(createXmlCiiAdaptedWorkflowState().resolverJsonTraceConfig.matchMode,'ROOT');
 }finally{globalThis.document=oldDoc;Object.defineProperty(globalThis,'localStorage',{configurable:true,value:oldStorage});}
});
test('unrelated staged branches do not contribute restraints or block source-only Preview staging',async()=>{
 const source=input();
 source[0].name='/UNRELATED/LINE/B1';
 const result=await stage(source,cfg,'preview');
 assert.equal(result.restraintReview.warnings.length,0);
 assert.equal(rows(result.document).length,0);
 const xml=XML.replace('</Node>','<Restraint><Type>+Y</Type><Gap>0</Gap><Stiffness>123456</Stiffness><Friction>0.3</Friction></Restraint></Node>');
 const original=await prepareXml229PrefinalRestraints({xmlText:xml,stagedJsonText:JSON.stringify(source),config:cfg,policy:'preview'});
 assert.deepEqual(numericRows(rows(original.document)),[['+Y',0,123456,.3]]);
});
