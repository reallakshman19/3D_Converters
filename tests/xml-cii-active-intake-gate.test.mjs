import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Explicit UI-only dependencies. No converter/Worker output is fabricated.
async function seam() {
  const source=fs.readFileSync(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-v055-seam.js',import.meta.url),'utf8');
  const module=new vm.SourceTextModule(source);
  const implementations={createElement:(tag,text)=>({tagName:tag,textContent:text||'',children:[],
    append(...nodes){this.children.push(...nodes);},setAttribute(){},addEventListener(){}}),
    materializeMasterDatasetRows:async()=>{throw Error('Unexpected master hydration');},
    resolveXml229CurrentPreviewBlob:()=>{throw Error('No committed source Blob exists');}};
  const imports=new Map();
  for(const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const exports=match[1].split(',').map(name=>name.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    imports.set(match[2],new vm.SyntheticModule(exports,function(){
      for(const name of exports)this.setExport(name,implementations[name]||(()=>{}));
    }));
  }
  await module.link(name=>{assert.ok(imports.has(name),name);return imports.get(name);});
  await module.evaluate();return module.namespace;
}

test('selected or unfinished LFJ source cannot enter compatibility Run as empty JSON',async()=>{
  const api=await seam();
  for(const phase of ['SELECTED','INDEXING','COMMIT_PENDING']) {
    api.resetV055SeamForTests();
    const ref={current:{stagedJsonText:'',xml229StagedSourceReceipt:{phase,generationId:'literal-pending'}}};
    const card=api.v055MasterGate(ref,()=>{});
    assert.ok(card,`Run must be blocked while original JSON is ${phase}`);
  }
});

test('a failed or revoked selected JSON is not silently converted as an XML-only run',async()=>{
  const api=await seam();
  for(const phase of ['FAILED','REVOKED']) {
    api.resetV055SeamForTests();
    assert.ok(api.v055MasterGate({current:{stagedJsonText:'',xml229StagedSourceReceipt:{phase}}},()=>{}));
  }
  assert.ok(api.v055MasterGate({current:{stagedJsonText:'',xml229StagedSourceStatus:'FAILED'}},()=>{}));
});

test('a genuine XML-only workflow with no JSON selection retains its existing route',async()=>{
  const api=await seam();
  assert.equal(api.v055MasterGate({current:{stagedJsonText:''}},()=>{}),null);
});
