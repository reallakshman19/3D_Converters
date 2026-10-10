import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Deliberately pinned Git blob IDs: a change to protected legacy oracles or
// test-source inputs must be a separately approved custody/fixture decision,
// never silently folded into a green #203 replacement-contract test.
const ORACLES=Object.freeze({
  'tests/xml-cii-issue-893-consumer-authority.test.mjs':
    'd6a4615035ae42707ac871233ede5a95d42d6c14',
  'scripts/run-xml-cii-issue-893-consumer-authority-e2e.mjs':
    '66a85e15062b6615546f56cf212fa14fb412ea05',
  'tests/xml-cii-issue-836-piping-class-cold-hydration.test.mjs':
    '6e1e6f17d2a542c0f1da0411aed649e235a06c4c',
});
const INPUTS=Object.freeze({
  'docs/Masters/Piping_class_master.json':
    ['af218bf3692acd66c93e190635633e14ccfb30ac',2439490],
  'docs/Masters/PCF_MAT_MAP.TXT':
    ['371ce3a1bd854228650847d8f511e98baa5dc5f3',6639],
  'docs/Masters/wtValveweights.json':
    ['f969d32dfea1bf03eb7dc310d9f3becacad5a4d1',417192],
});
const MIRRORS=Object.freeze([
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-smart-evidence.js',
  'tabs/xml-cii-2019-standalone/xml-cii-regex-bounded-evidence.js',
  'tabs/xml-cii-2019-standalone-tab.js',
  'tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js',
]);

const read=path=>fs.readFile(new URL('../'+path,import.meta.url));
function gitBlobId(bytes){
  return createHash('sha1').update('blob '+bytes.byteLength+'\0','utf8').update(bytes).digest('hex');
}

test('C05 #203 historic protected 836/893 regressions are unchanged, not silently weakened',async()=>{
  for(const [path,expected] of Object.entries(ORACLES)){
    const bytes=await read(path);
    assert.equal(gitBlobId(bytes),expected,path+' is protected historic baseline');
  }
});

test('C05 #203 source-bound browser input masters remain exactly the tracked source files',async()=>{
  for(const [path,[sha,len]] of Object.entries(INPUTS)){
    const bytes=await read(path);
    assert.equal(bytes.byteLength,len,path+' byte custody');
    assert.equal(gitBlobId(bytes),sha,path+' source identity');
  }
});

test('C05 #203 current bounded J02, restore and Mode B entrypoint mirror exactly into docs',async()=>{
  for(const source of MIRRORS){
    const [original,docs]=await Promise.all([read(source),read('docs/'+source)]);
    assert.deepEqual(original,docs,source+' docs mirror divergence');
  }
  const entry=await read('tabs/xml-cii-2019-standalone-tab.js');
  assert.equal(gitBlobId(entry),'994e7b5455bf9845ad3ad03e0fec87a6c3f10c68',
    'post-C05 Mode B cache generation changed without a custody decision');
  assert.match(entry.toString('utf8'),/20261008-p0-mode-b-parity-1/,
    'current entrypoint must not be rolled back to obsolete 893 token');
});
