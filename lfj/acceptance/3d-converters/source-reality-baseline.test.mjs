/** #1104/I0 — source-characterization and intentional RED, NOT live LFJ acceptance.
 * node --test lfj/acceptance/3d-converters/source-reality-baseline.test.mjs
 * LFJ_I0_ACCEPTANCE=1 node --test lfj/acceptance/3d-converters/source-reality-baseline.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, dirname, join} from 'node:path';

import {ensureResolverHierarchyScope} from '../../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js';
import {buildJsonHierarchyScopeIndex} from '../../../tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js';
import {buildStandaloneDtxrPositionGroups} from '../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const acceptance=process.env.LFJ_I0_ACCEPTANCE==='1';
const fixture=(path)=>join(root,path);

function zoneDocument(zone){
  return JSON.stringify([
    {type:'BRANCH',name:'FIRST',padding:'x'.repeat(400),attributes:{OWNER_ZONE:zone}},
    {type:'BRANCH',name:'SECOND',padding:'y'.repeat(1400),attributes:{OWNER_ZONE:'ZONE-B'}},
  ]);
}

test('I0 real legacy cache: equal-length interior edit must not reuse old zone index',()=>{
  const before=zoneDocument('ZONE-A'), after=zoneDocument('ZONE-C');
  assert.equal(before.length,after.length);
  assert.ok(before.indexOf('ZONE-A')>96);
  assert.ok(before.indexOf('ZONE-A')<before.length/2-48);
  const ref={current:{stagedJsonText:before,jsonTraceScopeId:''}};
  const first=ensureResolverHierarchyScope(ref.current,ref);
  assert.deepEqual(first.index.scopes.map(x=>x.id),['ZONE-A','ZONE-B']);
  const current={...ref.current,stagedJsonText:after};
  ref.current=current;
  const second=ensureResolverHierarchyScope(current,ref);
  const oracle=buildJsonHierarchyScopeIndex(after).scopes.map(x=>x.id);
  assert.deepEqual(oracle,['ZONE-C','ZONE-B']);
  if(acceptance) {
    assert.deepEqual(second.index.scopes.map(x=>x.id),oracle,'RED: actual scope index reused from old source');
  }else{
    assert.strictEqual(second.index,first.index,'legacy sampled-key collision must reproduce');
    assert.notDeepEqual(second.index.scopes.map(x=>x.id),oracle);
  }
});

test('I0 real legacy ledger: malformed JSON must not look like valid empty result',()=>{
  const input='{"type":"BRANCH","children":[';
  if(acceptance){
    assert.throws(()=>buildStandaloneDtxrPositionGroups(input),'RED: invalid source returned []');
  }else{
    assert.deepEqual(buildStandaloneDtxrPositionGroups(input),[],
      'Legacy fatal parse behavior changed: update characterization from observed source');
  }
});

test('I0 actual deployed manifest must reflect app readiness, not Worker smoke',()=>{
  const m=JSON.parse(readFileSync(fixture('docs/lfj/deployment-manifest.json'),'utf8'));
  assert.equal(m.schema,'LFJ.V4.1.DeployedModuleManifest.v1');
  if(acceptance){
    assert.equal(m.resolverWired,true,'RED: actual Resolver not connected');
    assert.equal(m.engineeringReady,true,'RED: LFJ engineering consumer not ready');
  }else{
    assert.equal(m.resolverWired,false,'Never falsely declare integrated Resolver');
    assert.equal(m.engineeringReady,false,'Never falsely declare engineering ready');
  }
});

test('I0 real baseline source custody; generated output hashes are NOT approved goldens',()=>{
  const register=JSON.parse(readFileSync(fixture('lfj/acceptance/3d-converters/fixture-register.json'),'utf8'));
  assert.equal(register.schema,'LFJ.3DIntegrationFixtureRegister.v1');
  assert.equal(register.inputs.filter(x=>x.role==='original-input').length,2);
  assert.equal(register.inputs.filter(x=>x.role==='generated-master-enriched-intermediate').length,1);
  for(const {path,bytes,sha256} of register.inputs){
    assert.equal(statSync(fixture(path)).size,bytes,path+': source size changed, requalify corpus');
    const hash=createHash('sha256').update(readFileSync(fixture(path))).digest('hex');
    assert.equal(hash,sha256,path+': raw input changed without governed fixture revision');
    console.log('LFJ_I0_FIXTURE_SHA256', JSON.stringify({path,bytes,sha256:hash}));
  }
  assert.ok(register.unavailableRealPopulatedSources.every(x=>x.status==='MISSING_OR_NOT_VERIFIED'));
  const manifest=JSON.parse(readFileSync(fixture('Benchmarks/1885Sjson/fixture-manifest.json'),'utf8'));
  assert.equal(manifest.summary.sourceNodes,279);
  assert.equal(manifest.summary.enrichedNodes,279);
  assert.equal(manifest.summary.stage2Records,163);
  assert.equal(manifest.generatedBy,'tools/generate-1885-stagedjson-fixtures.mjs');
  const stage1=register.inputs.find(x=>x.id==='1885Sjson-stage1-generated');
  assert.equal(stage1.sha256,manifest.artifacts.enrichedStagedJson.sha256);
  assert.equal(stage1.bytes,manifest.artifacts.enrichedStagedJson.bytes);
  assert.equal(stage1.path,manifest.artifacts.enrichedStagedJson.path);
});
