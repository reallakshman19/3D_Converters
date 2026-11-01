import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const repoRoot=new URL('../',import.meta.url);
const enginePath='converters/xml-cii-2019-standalone/engine.js';
const servedPath='docs/'+enginePath;
const mapper='xml229_support_type_mapper.py';

async function text(path){
  return readFile(new URL(path,repoRoot),'utf8');
}
async function isLocalPythonModule(name){
  try{
    const path=new URL('converters/scripts/'+name+'.py',repoRoot);
    return (await stat(path)).isFile();
  }catch(error){
    if(error?.code==='ENOENT')return false;
    throw error;
  }
}

test('every locally imported Python module is present in the Pyodide bundle',async()=>{
  const engine=await text(enginePath);
  const bundleMatch=engine.match(/const SCRIPT_FILE_NAMES = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert(bundleMatch,'engine bundle list must be explicitly declared');
  const bundled=[...bundleMatch[1].matchAll(/'([^']+\.py)'/g)].map(m=>m[1]);
  assert(bundled.includes('xml229_native_final_mass_binding.py'));
  assert(bundled.includes('xml229_prefinal_restraints.py'));
  assert(bundled.includes(mapper),'native pre-Final support mapper must load into Pyodide');
  assert.match(engine,/await ensureScripts\(pyodide\)/);
  assert.match(await text('converters/scripts/xml229_prefinal_restraints.py'),
    /from xml229_support_type_mapper import mapped_support_kind/);
  for(const file of bundled){
    const python=await text('converters/scripts/'+file);
    for(const importMatch of python.matchAll(/^\s*(?:from|import)\s+([A-Za-z_]\w*)/gm)){
      const imported=importMatch[1];
      if(await isLocalPythonModule(imported))
        assert(bundled.includes(imported+'.py'),
          file+' imports unbundled local Python module '+imported);
    }
  }
});

test('worker-served engine and support mapper match source and preserve native gates',async()=>{
  assert.equal(await text(enginePath),await text(servedPath));
  assert.equal(await text('converters/scripts/'+mapper),
    await text('docs/converters/scripts/'+mapper));
  const engine=await text(enginePath);
  assert.match(engine,/job_governed_native/);
  assert.match(engine,/xml229NativeMassProofPath/);
  assert.match(engine,/runXmlCii2019StandaloneEngine/);
  assert.match(engine,/nativeFailurePhase/);
});
