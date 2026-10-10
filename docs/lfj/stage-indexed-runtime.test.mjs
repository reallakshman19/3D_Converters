/** A2 disposable-only generator tests. No repository or authored docs changes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {stageIndexedRuntime} from './stage-indexed-runtime.mjs';

const setup=async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'lfj-a2-stage-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const root=path.join(dir,'source'),stage=path.join(dir,'staged');
  const files={
    'docs/lfj/deployment-manifest.json':JSON.stringify({sources:['lfj/source/source-snapshot.mjs']}),
    'docs/lfj/source/source-snapshot.mjs':'export const version="legacy";',
    'docs/tabs/events.js':'export const events="old";',
    'lfj/source/source-snapshot.mjs':'export const version="indexed";',
    'lfj/source/child.mjs':'export const child=true;',
    'tabs/events.js':'export const events="current";'
  };
  const write=async(relative,text)=>{
    const p=path.join(root,relative);
    await mkdir(path.dirname(p),{recursive:true});await writeFile(p,text);
  };
  for(const [f,v] of Object.entries(files))await write(f,v);
  return {root,stage,write};
};
const options={
  entries:['lfj/source/source-snapshot.mjs'],
  witnesses:['tabs/events.js']
};
test('source checked-in V4.1 assets stay unchanged while temp LFJ staged',async t=>{
  const f=await setup(t);
  const r=await stageIndexedRuntime({repoRoot:f.root,stageRoot:f.stage,...options});
  assert.equal(r.sourceDocsUnchanged,true);
  assert.equal(r.publicPagesModified,false);
  assert.equal(r.sourceGraphCount,2);
  assert.equal(r.collisions.length,1);
  assert.equal(r.collisions[0].path,'lfj/source/source-snapshot.mjs');
  assert.equal(r.collisions[0].previouslyOwnedByV41,true);
  assert.equal(await readFile(path.join(f.root,'docs/lfj/source/source-snapshot.mjs'),'utf8'),
    'export const version="legacy";');
  assert.equal(await readFile(path.join(f.stage,'lfj/source/source-snapshot.mjs'),'utf8'),
    'export const version="indexed";');
  assert.equal(await readFile(path.join(f.stage,'tabs/events.js'),'utf8'),
    'export const events="current";');
});
test('candidate manifest and source checksums are traceable only to temp',async t=>{
  const f=await setup(t);
  const r=await stageIndexedRuntime({repoRoot:f.root,stageRoot:f.stage,...options});
  const m=JSON.parse(await readFile(path.join(f.stage,'.lfj-a2-stage-manifest.json'),'utf8'));
  assert.equal(m.schema,'LFJ.A2.DisposableIndexedDocsStage.v1');
  assert.deepEqual(m.collisions,r.collisions);
  assert.equal(m.testFixturesIncluded,false);
  await assert.rejects(stat(path.join(f.root,'docs/.lfj-a2-stage-manifest.json')),{code:'ENOENT'});
});
test('refuses to run inside repository or destroy an existing destination',async t=>{
  const f=await setup(t);
  await assert.rejects(stageIndexedRuntime({repoRoot:f.root,
    stageRoot:path.join(f.root,'docs/unsafe'),...options}),
    /STAGE_PATH_MUST_BE_OUTSIDE_REPOSITORY/);
  await mkdir(f.stage);
  await assert.rejects(stageIndexedRuntime({repoRoot:f.root,stageRoot:f.stage,...options}),
    /STAGE_DESTINATION_ALREADY_EXISTS/);
});
test('missing source/Worker dependency stops before creating staging tree',async t=>{
  const f=await setup(t);
  await f.write('lfj/source/source-snapshot.mjs',"import './missing.worker.mjs';");
  await assert.rejects(stageIndexedRuntime({repoRoot:f.root,stageRoot:f.stage,...options}),
    /CLOSURE_INCOMPLETE/);
  await assert.rejects(stat(f.stage),{code:'ENOENT'});
});
