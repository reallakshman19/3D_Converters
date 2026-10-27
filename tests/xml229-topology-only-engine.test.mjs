/** Real engine and vendored WASM Python. Only file: URL transport is adapted
 * for Node; no topology, transaction, writer or expected result is mocked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createContext,SourceTextModule,SyntheticModule} from 'node:vm';
import {loadPyodide} from '../vendor/pyodide/pyodide.mjs';

const engineUrl=new URL('../converters/xml-cii-2019-standalone/engine.js',import.meta.url);
async function loadEngine(){
 const context=createContext({URL,Date,Math,console,fetch:async(input,options)=>{
  const url=input instanceof URL?input:new URL(String(input));
  return url.protocol==='file:'?new Response(await readFile(fileURLToPath(url))):fetch(input,options);
 }});
 const module=new SourceTextModule(await readFile(engineUrl,'utf8'),{
  context,identifier:engineUrl.href,initializeImportMeta:meta=>{meta.url=engineUrl.href;},
 });
 await module.link(async specifier=>{
  const url=new URL(specifier,engineUrl);
  const exports=specifier.includes('/vendor/pyodide/')?
   {loadPyodide:options=>loadPyodide({...options,indexURL:fileURLToPath(options.indexURL)})}:
   await import(url.href);
  return new SyntheticModule(Object.keys(exports),function(){
   for(const [name,value] of Object.entries(exports))this.setExport(name,value);
  },{context});
 });
 await module.evaluate();return module.namespace.runXmlCii2019StandaloneEngine;
}

test('Exact production engine returns actual TopoFix sidecars before enrichment/native output',async()=>{
 const run=await loadEngine(),sourceText=await readFile(new URL('../Benchmarks/1885Sjson/FirstpassXML',import.meta.url),'utf8');
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input,options)=>{
  const url=input instanceof URL?input:new URL(String(input));
  return url.protocol==='file:'?new Response(await readFile(fileURLToPath(url))):originalFetch(input,options);
 };
 try{
  const base={sourceKind:'xml',sourceText,sourceName:'Firstpass.xml',topologyPreFinalOnly:true,
   options:{outputMode:'both',analyzeTopology:true,generateTopoFix:false}};
  for(const change of [{xml229NativeFinalPacket:{}},{stagedJsonText:'{}'},{sourceKind:'inputxml'}]){
   const rejected=await run({...base,...change});
   assert.equal(rejected.ok,false);assert.equal(rejected.error,'TOPOFIX_PREFINAL_ONLY_SOURCE_REQUIRED');
  }
  const analyzed=await run(base);assert.equal(analyzed.ok,true,analyzed.error);
  const action=JSON.parse(analyzed.topologyFixPlanText).actions.find(a=>
   a.disposition==='SAFE_DROP_PIPE_GEOMETRY'&&a.node_numbers.includes(1600));
  assert(action);
  const committed=await run({...base,options:{...base.options,generateTopoFix:true,topologyActionIds:[action.action_id]}});
  assert.equal(committed.ok,true,committed.error);assert.equal(committed.topoFixCommitted,true);
  assert.equal(JSON.parse(committed.topoFixLineageText).counts.sourceNodeOccurrences,216);
  assert.equal(JSON.parse(committed.topoFixLineageText).counts.fixedNodeOccurrences,215);
  for(const result of [analyzed,committed]){
   assert.equal(result.outputKind,'topology-sidecars');assert.equal(result.ciiText,null);
   assert.equal(result.enrichedText,'');assert.equal(result.nativeCiiReleaseAuthorized,false);
   assert.equal(result.acceptedFinalTransferred,false);
   assert.equal(result.xml229NativeMassDiagnostic,undefined);
  }
 }finally{globalThis.fetch=originalFetch;}
});
