/** A2 explicit source/docs closure diagnostics and fail-closed regression. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {A3_RUNTIME_ENTRIES,evaluateClosure,requireComplete,scanLiteralEdges} from './indexed-runtime-closure.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function makeFixture(t,files){
  const dir=await mkdtemp(path.join(tmpdir(),'a2-closure-'));
  t.after(async()=>rm(dir,{recursive:true,force:true}));
  for(const [p,txt] of Object.entries(files)){
    await mkdir(path.dirname(path.join(dir,p)),{recursive:true});
    await writeFile(path.join(dir,p),txt);
  }
  return dir;
}
const small={
  'app/main.mjs': "import './lib.mjs?q=1';\nimport {foo} from './multi.mjs';\nconst url=new URL('./worker.mjs',import.meta.url);\nconst next=import('./dynamic.mjs');",
  'app/lib.mjs': 'export const lib=1;',
  'app/multi.mjs': "export {foo} from './sub.mjs';",
  'app/sub.mjs': 'export const foo=1;',
  'app/worker.mjs': "import './lib.mjs';",
  'app/dynamic.mjs': 'export const dyn=true;'
};
const withDocs=Object.fromEntries(Object.entries(small).flatMap(([k,v])=>[[k,v],['docs/'+k,v]]));
const entries=['app/main.mjs'];

test('scanner retains static, literal dynamic and Worker URL edges',()=>{
  const p=scanLiteralEdges(small['app/main.mjs']);
  assert.deepEqual(p.edges.sort(),['./dynamic.mjs','./lib.mjs?q=1','./multi.mjs','./worker.mjs']);
  assert.deepEqual(p.unresolved,[]);
});
test('byte-identical selected artifact recursion is complete',async t=>{
  const dir=await makeFixture(t,withDocs);
  const result=await evaluateClosure({repoRoot:dir,artifact:'docs',entries,witnesses:[]});
  assert.equal(result.complete,true,JSON.stringify(result.unresolved));
  assert.equal(result.checkedFiles,6);
  requireComplete(result);
});
test('missing transitive Worker fails a required artifact',async t=>{
  const files={...withDocs};delete files['docs/app/worker.mjs'];
  const dir=await makeFixture(t,files);
  const result=await evaluateClosure({repoRoot:dir,artifact:'docs',entries,witnesses:[]});
  assert.deepEqual(result.missingArtifact,['app/worker.mjs']);
  assert.throws(()=>requireComplete(result),{code:'CLOSURE_INCOMPLETE'});
});
test('bytes diverge despite file presence and fail closed',async t=>{
  const files={...withDocs,'docs/app/sub.mjs':'export const foo=2;'};
  const dir=await makeFixture(t,files);
  const result=await evaluateClosure({repoRoot:dir,artifact:'docs',entries,witnesses:[]});
  assert.deepEqual(result.divergedArtifact,['app/sub.mjs']);
  assert.throws(()=>requireComplete(result),{code:'CLOSURE_INCOMPLETE'});
});
test('dynamic nonliteral source refuses fake graph certification',async t=>{
  const files={...withDocs,'app/main.mjs':"const target='./x.mjs';import(target);",
    'docs/app/main.mjs':"const target='./x.mjs';import(target);"};
  const dir=await makeFixture(t,files);
  const result=await evaluateClosure({repoRoot:dir,artifact:'docs',entries,witnesses:[]});
  assert.equal(result.complete,false);
  assert.ok(result.unresolved.some(x=>x.includes('nonliteral dynamic import')));
  assert.throws(()=>requireComplete(result),{code:'CLOSURE_INCOMPLETE'});
});
test('source escape is rejected rather than read outside repo',async t=>{
  const files={'app/main.mjs':"import '../../outside.mjs';",
    'docs/app/main.mjs':"import '../../outside.mjs';"};
  const dir=await makeFixture(t,files);
  const result=await evaluateClosure({repoRoot:dir,artifact:'root',entries,witnesses:[]});
  assert.equal(result.complete,false);
  assert.ok(result.unresolved.some(x=>x.includes('escapes application root')));
});
test('origin and artifact labels are distinct evidence axes',async t=>{
  const dir=await makeFixture(t,withDocs);
  const root=await evaluateClosure({repoRoot:dir,artifact:'root',entries,witnesses:[]});
  assert.equal(root.origin,'CHECKED_IN_TREE_NOT_PUBLIC_SITE');
  assert.equal(root.artifact,'root');
  assert.equal(root.complete,true);
});
test('real pinned source entrypoints are declared (pure contract)',()=>{
  assert.ok(A3_RUNTIME_ENTRIES.some(s=>s.endsWith('indexed-preview.js')));
  assert.ok(A3_RUNTIME_ENTRIES.some(s=>s.endsWith('indexed-export.js')));
  assert.ok(A3_RUNTIME_ENTRIES.some(s=>s.endsWith('sha.worker.mjs')));
});
// Full checked-in source/docs fixture tests are run by CI with the actual repo.
if(process.env.LFJ_A2_CHECK_REPOSITORY==='1'){
  test('actual A3 indexed source root closes without missing imported module',async()=>{
    const result=await evaluateClosure({repoRoot,artifact:'root'});
    assert.equal(result.complete,true,JSON.stringify({missingSource:result.missingSource,
      unresolved:result.unresolved,checkedFiles:result.checkedFiles}));
    assert.ok(result.checkedFiles>=15);
  });
  test('checked-in docs now contains exact A3 source and native Worker closure',async()=>{
    const result=await evaluateClosure({repoRoot,artifact:'docs'});
    assert.equal(result.origin,'CHECKED_IN_TREE_NOT_PUBLIC_SITE');
    assert.equal(result.checkedFiles,31,'the pinned indexed source graph changed');
    assert.deepEqual(result.missingArtifact,[],'missing an indexed ESM/Worker');
    assert.deepEqual(result.divergedArtifact,[],'stale indexed runtime bytes');
    requireComplete(result);
  });
}
