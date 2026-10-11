import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPublishedAssets,summarize} from './pages-release-readiness.mjs';
const site='https://reallakshman19.github.io/3D_Converters/';
const a='a'.repeat(64),b='b'.repeat(64);
const names=['index.html','main-rhbg-fitguard.js',
 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
 'lfj/qualification/experiments/consumer-sparse-b0-xml-match/matching.worker.mjs',
 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js'];
function good(){
 const w=Object.fromEntries(names.map(p=>[p,{root:{bytes:20,sha256:a},docs:{bytes:20,sha256:a}}]));
 const assets=names.map(path=>({path,status:200,bytes:20,sha256:a,
  contentType:path.endsWith('.html')?'text/html':'application/javascript'}));
 return {metadata:{has_pages:true},pages:{status:200,html_url:site,source:{branch:'main',path:'/docs'}},
  candidates:[{candidate:site,listedByPagesApi:true,indexReachable:true,assets}],sourceWitnesses:w};
}
const run=v=>checkPublishedAssets(v,site);
test('matching bytes grant parity only',()=>{const v=run(good());assert.equal(v.verdict,'PASS_BYTES_ONLY');assert.equal(v.release,'NOT_AUTHORIZED');assert.match(summarize(v),/No production/);});
test('Worker 404 is a blocker',()=>{const v=good();v.candidates[0].assets[3].status=404;assert.ok(run(v).problems.some(x=>x.startsWith('PUBLIC_ASSET_UNAVAILABLE')));});
test('old 200 JS bytes are rejected',()=>{const v=good();v.candidates[0].assets[2].sha256=b;assert.ok(run(v).problems.some(x=>x.startsWith('PUBLIC_SHA_OR_SIZE_MISMATCH')));});
test('historical unregistered alias not accepted',()=>{const v=good();v.candidates[0].listedByPagesApi=false;assert.ok(run(v).problems.includes('REGISTERED_CANDIDATE_MISSING'));});
test('Pages API 404 is not ready',()=>{const v=good();v.pages.status=404;assert.ok(run(v).problems.includes('REGISTERED_PAGES_API_UNVERIFIED'));});
test('source/docs divergence fails regardless of public asset',()=>{const v=good();v.sourceWitnesses[names[2]].root.sha256=b;assert.ok(run(v).problems.some(x=>x.startsWith('SOURCE_DOCS_DIFFER')));});
test('HTML substituted for worker script rejected',()=>{const v=good();v.candidates[0].assets[3].contentType='text/html';assert.ok(run(v).problems.some(x=>x.startsWith('PUBLIC_MIME_MISMATCH')));});
test('partial witness census never succeeds',()=>{const v=good();delete v.sourceWitnesses[names[3]];assert.ok(run(v).problems.some(x=>x.startsWith('WITNESS_MISSING')));});

// The reviewer UI is a deployed source module, not an optional visualization:
// its public bytes must match the candidate's root + docs bytes as well.
test('reviewer module missing public HTTP 404 fails closed',()=>{
 const v=good();v.candidates[0].assets[4].status=404;
 assert.ok(run(v).problems.some(x=>x==='PUBLIC_ASSET_UNAVAILABLE: '+names[4]));
});
test('reviewer module stale HTTP 200 fails closed',()=>{
 const v=good();v.candidates[0].assets[4].sha256=b;
 assert.ok(run(v).problems.some(x=>x==='PUBLIC_SHA_OR_SIZE_MISMATCH: '+names[4]));
});
test('reviewer root and docs divergence fails closed',()=>{
 const v=good();v.sourceWitnesses[names[4]].root.sha256=b;
 assert.ok(run(v).problems.some(x=>x==='SOURCE_DOCS_DIFFER: '+names[4]));
});
test('reviewer witness omission cannot be accepted',()=>{
 const v=good();delete v.sourceWitnesses[names[4]];
 assert.ok(run(v).problems.some(x=>x==='WITNESS_MISSING: '+names[4]));
});
