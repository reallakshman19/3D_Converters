/**
 * #1104 A06: source-level native File upload admission negative acceptance.
 * These tests DO NOT fake worker/IDB success and do not claim Resolver R13.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openBlobSourceSnapshot} from '../../source/source-snapshot.mjs';
import {
  admitResolverLfjFile, RESOLVER_LFJ_PILOT_MAX_BYTES
} from './resolver-lfj-source-admission.mjs';
const code=expected=>error=>{assert.equal(error?.code,expected);return true;};
const content='[{"type":"BRANCH","name":"/A","attributes":{"OWNER_SITE":"S"}}]';
const file=()=>new Blob([content],{type:'application/json'});
const createState=(source,token='job-current')=>({
  stagedJsonFile:source,resolverLfjMode:'LFJ',
  resolverLfjJobToken:token,sourceText:'<OriginalXML/>',
  supportConfigJson:'{"source":"original"}',
  dependencyRevisions:{xml:1,masters:1},jsonTraceScopeId:'__ALL__',
  resolverJsonTraceConfig:{joinMode:'unique'},
  branchSelection:[],masterContext:{version:'1',config:{rating:1}}
});

test('A06 true R03 Blob source SHA and version use immutable label:sha256 basis, never an invented ID',async()=>{
  const src=file(),sha=createHash('sha256').update(content).digest('hex');
  const snapshot=await openBlobSourceSnapshot(src,{revision:'A06-original'});
  assert.equal(snapshot.sha256,sha);
  assert.equal(snapshot.revision,'A06-original:sha256:'+sha);
  assert.equal(snapshot.byteLength,Buffer.byteLength(content,'utf8'));
  snapshot.close();
});

test('A06 original File mode/source/job changed before intake is rejected without fallback',async()=>{
  const src=file(),state=createState(src);
  await assert.rejects(admitResolverLfjFile({
    file:src,getState:()=>({...state,resolverLfjJobToken:'superseded'}),
    jobToken:'job-current'
  }),code('RESOLVER_LFJ_STALE'));
});

test('A06 pilot has explicit 1MiB fail-closed budget, never whole-file legacy read',async()=>{
  const src=new Blob([new Uint8Array(RESOLVER_LFJ_PILOT_MAX_BYTES+1)]);
  const state=createState(src);
  await assert.rejects(admitResolverLfjFile({
    file:src,getState:()=>state,jobToken:'job-current'
  }),code('RESOLVER_LFJ_PILOT_OVERLIMIT'));
});

test('A06 XML/masters changed during streaming snapshot fail before native worker admission',async()=>{
  const src=file(),state=createState(src);
  let calls=0;
  await assert.rejects(admitResolverLfjFile({
    file:src,
    getState:()=>{
      calls++;
      return calls>2?{...state,supportConfigJson:'{"source":"NEW"}'}:state;
    },
    jobToken:'job-current'
  }),code('RESOLVER_LFJ_STALE'));
  assert.ok(calls>2);
});

test('A06 user cancellation before actual scan does not silently route to legacy parser',async()=>{
  const src=file(),state=createState(src),controller=new AbortController();
  controller.abort();
  await assert.rejects(admitResolverLfjFile({
    file:src,getState:()=>state,jobToken:'job-current',signal:controller.signal
  }),code('RESOLVER_LFJ_CANCELLED'));
});

test('A06 native browser Worker/IDB unavailable is fatal, never a source-only successful fake receipt',async()=>{
  // Node does not supply a genuine browser IndexedDB or module Worker.
  // This expectation only tests the explicit negative; it is NOT H1.
  if(typeof globalThis.indexedDB?.open==='function'&&typeof globalThis.Worker==='function')
    return;
  const src=file(),state=createState(src);
  await assert.rejects(admitResolverLfjFile({
    file:src,getState:()=>state,jobToken:'job-current'
  }),code('NATIVE_CONSUMER_PORT_REQUIRED'));
});
