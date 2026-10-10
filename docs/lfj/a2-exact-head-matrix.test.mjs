import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED_A2_JOBS,evaluateExactHead,asMarkdown} from './a2-exact-head-matrix.mjs';

const head='a'.repeat(40);
const other='b'.repeat(40);
const successful=Object.fromEntries(REQUIRED_A2_JOBS.map(x=>[x,{result:'success'}]));
const check=overrides=>evaluateExactHead({
  expectedSha:head,checkoutSha:head,livePrSha:head,
  eventName:'pull_request',needs:successful,...overrides
});
test('source-pinned three-job author CI reports only narrow successful status',()=>{
  const r=check({});
  assert.equal(r.verdict,'PASS_FOCUSED_AUTHOR_EXACT_HEAD');
  assert.deepEqual(r.problems,[]);
  assert.equal(r.independentA3SemanticAcceptance,'NOT_ATTESTED');
  assert.equal(r.publicPagesAndOpera,'NOT_ATTESTED');
  assert.equal(r.wholeRepositoryChecks,'NOT_ASSESSED_BY_THIS_MATRIX');
  assert.match(asMarkdown(r),/not release acceptance/);
});
test('old checkout cannot certify current triggering commit',()=>{
  const r=check({checkoutSha:other});
  assert.equal(r.verdict,'FAIL_CLOSED');
  assert.ok(r.problems.includes('CHECKOUT_HEAD_MISMATCH'));
});
test('GitHub PR moving after workflow trigger invalidates inherited green',()=>{
  const r=check({livePrSha:other});
  assert.ok(r.problems.includes('STALE_PR_HEAD'));
});
test('live PR API inaccessible is unverified not falsely green',()=>{
  const r=check({livePrSha:null,livePrError:'HTTP 403'});
  assert.equal(r.verdict,'FAIL_CLOSED');
  assert.match(r.problems.join(' '),/LIVE_PR_HEAD_UNVERIFIED/);
});
test('missing or failing required workflow gate fails closed',()=>{
  const miss=check({needs:{'indexed-runtime-source-closure':{result:'success'}}});
  assert.match(miss.problems.join(' '),/NOT_RUN/);
  const failing=check({needs:{...successful,'generated-docs-native-chromium':{result:'failure'}}});
  assert.match(failing.problems.join(' '),/REQUIRED_JOB_NOT_SUCCESS: generated-docs-native-chromium=failure/);
});
test('invalid or unexpected head/event identity cannot be certified',()=>{
  assert.ok(check({expectedSha:'stale'}).problems.includes('INVALID_TRIGGER_HEAD'));
  assert.ok(check({eventName:'push'}).problems.includes('UNRECOGNIZED_EVENT'));
});
test('manual workflow dispatch pins checked-out head without claiming PR equality',()=>{
  const r=check({eventName:'workflow_dispatch',livePrSha:null});
  assert.equal(r.verdict,'PASS_FOCUSED_AUTHOR_EXACT_HEAD');
  assert.equal(r.livePrHead,'NOT_APPLICABLE');
});
