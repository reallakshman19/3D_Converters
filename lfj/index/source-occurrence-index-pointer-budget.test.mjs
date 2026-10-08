// R05 source-level resource-bound adversarial RED, independent of R05 output.
// A bounded original JSON source must not amplify into unbounded pointer/ID
// memory through deeply nested source object member names.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceSnapshotBuilder} from '../source/source-snapshot.mjs';
import {streamJsonOccurrenceEvents} from './source-occurrence-index.mjs';

test('R05 RED: deep long-key source fails by typed pointer budget before event-page blowup',async()=>{
  const depth=40, member='k'.repeat(4096);
  const original=('{"'+member+'":').repeat(depth)+'0'+'}'.repeat(depth);
  const bytes=new TextEncoder().encode(original);
  assert.ok(bytes.length>160000&&bytes.length<170000);
  const builder=createSourceSnapshotBuilder({byteLength:bytes.length,revision:'pointer-memory-red'});
  for(let i=0;i<bytes.length;i+=8192)builder.append(bytes.subarray(i,i+8192),i);
  const snap=builder.finalize();
  let pages=0;
  try{
    await assert.rejects(()=>streamJsonOccurrenceEvents(snap,{
      sourceRefId:'RESOURCE-BUDGET-NEGATIVE',
      pageEvents:256,pageBytes:8192,
      onEventPage:async()=>{pages++;},
    }),e=>e?.code==='POINTER_LIMIT',
    'unsupported very long nested original paths must fail-closed, not finish successfully');
    assert.equal(pages,0,'reject before a bounded transport page can exceed pointer budget');
  }finally{snap.close();}
});
