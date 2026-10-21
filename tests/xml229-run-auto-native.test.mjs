import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {xml229CanAutoRunVerifiedFinal}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-run-auto-native.mjs';

const session={closed:false,readNativeFinalPacket:async()=>({})};
const state=()=>({activePhaseId:'run',running:false,result:null,
  xml229XmlOnlyApproval:null});
const report=()=>({raw:{xml229VerifiedEngineering:true},checklistRows:[
  {id:'weight-match',status:'ready',blocking:false},
  {id:'xml229-original-json-engineering-authority',status:'held',blocking:true},
  {id:'run-result',status:'pending',blocking:false},
]});
const can=(s=state(),r=report(),worker=session)=>
 xml229CanAutoRunVerifiedFinal({state:s,report:r,session:worker});

test('verified 249 Final masses schedule native Run despite passive post-run authority HOLD',()=>{
 assert.equal(can(),true);
 assert.equal(can({...state(),activePhaseId:'preview'}),false);
 assert.equal(can({...state(),activePhaseId:'weight-match'}),false);
 assert.equal(can({...state(),running:true}),false);
 assert.equal(can({...state(),result:{ok:false,error:'NATIVE_CANDIDATE_CONVERTER_FAILED'}}),false);
 assert.equal(can({...state(),result:{ok:true,ciiText:'EXISTING'}}),false);
});
test('no unverified Final, XML-only, other blockers, or stale Worker can auto-run',()=>{
 assert.equal(can({...state(),xml229XmlOnlyApproval:{source:'xml-only'}}),false);
 assert.equal(can(state(),{...report(),raw:{xml229VerifiedEngineering:false}}),false);
 assert.equal(can(state(),{...report(),checklistRows:[
  {id:'weight-match',status:'pending',blocking:true}]}),false);
 assert.equal(can(state(),{...report(),checklistRows:[
  ...report().checklistRows,{id:'source-kind',blocking:true}]}),false);
 assert.equal(can(state(),report(),{...session,closed:true}),false);
 assert.equal(can(state(),report(),{}),false);
});
test('actual Download .cii remains coupled to emitted artifact, not checklist readiness',async()=>{
 const canvas=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-cii-preview-canvas.js',import.meta.url),'utf8');
 assert.match(canvas,/const available = !!ciiText\.trim\(\) && ciiRow\?\.available !== false/);
 assert.match(canvas,/download\.disabled = !available/);
 const run=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',import.meta.url),'utf8');
 assert.match(run,/runXml229NativeCiiMassCandidate/);
 assert.match(run,/verified\.nativeCiiReleaseAuthorized!==true/);
 assert.match(run,/offerXml229AutomaticNativeRun/);
 assert.match(run,/downloadTextFile\(result\.ciiName,result\.ciiText/);
 const helper=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml229-run-auto-native.mjs',import.meta.url),'utf8');
 const mirror=await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/ui-adapted/xml229-run-auto-native.mjs',import.meta.url),'utf8');
 assert.equal(helper,mirror);
});

test('shared Pyodide interpreter resets native parser hooks and serializes automatic/manual jobs',async()=>{
 const engine=await readFile(new URL('../converters/xml-cii-2019-standalone/engine.js',import.meta.url),'utf8');
 const docs=await readFile(new URL('../docs/converters/xml-cii-2019-standalone/engine.js',import.meta.url),'utf8');
 assert.equal(engine,docs,'live-served native JS engine must match tested source');
 assert.match(engine,/const RESET_NATIVE_BASE_SNIPPET/);
 assert.match(engine,/importlib\.reload\(sys\.modules\["xml_to_cii2019"\]\)/);
 assert.match(engine,/await pyodide\.runPythonAsync\(RESET_NATIVE_BASE_SNIPPET\)/);
 assert.match(engine,/engineQueue=next\.then\(\(\)=>undefined,\(\)=>undefined\)/);
 assert.match(engine,/runSerializedXmlCii2019Engine\(job\)/);
 assert.match(engine,/runPythonScript\(pyodide, invocation\.scriptPath/);
});
