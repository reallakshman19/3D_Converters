import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4188/lfj/runtime/unified-source-fault-qualification.html');
  await page.waitForFunction(()=>typeof window.runUnifiedFaultMatrix==='function');
  const result=await page.evaluate(()=>window.runUnifiedFaultMatrix());
  assert.equal(result.missingSeal,'UNIFIED_MANIFEST_MISMATCH');
  assert.equal(result.missingSealInvisible,'UNIFIED_ABORTED');
  assert.equal(result.wrongSeal,'UNIFIED_PAIR_CORRUPT');
  assert.equal(result.wrongSealInvisible,'UNIFIED_ABORTED');
  assert.equal(result.headAborted,'UNIFIED_HEAD_ABORTED');
  assert.equal(result.headAbortInjected,true);
  assert.equal(result.headAbortedInvisible,'UNIFIED_ABORTED');
  assert.equal(result.preCommitVisible,'UNIFIED_NOT_COMMITTED');
  assert.equal(result.casLoser,'UNIFIED_HEAD_ABORTED');
  assert.equal(result.casWinnerRetained,true);
  assert.equal(result.mutableInputIsolated,true,
    'ACKed original source facts cannot borrow caller mutable objects');
  assert.equal(result.closeWhileCommitting,'UNIFIED_HEAD_ABORTED',
    'close during native HEAD put must reject before transaction.complete');
  assert.equal(result.closeDuringCommitVisible,'UNIFIED_NOT_COMMITTED',
    'closed in-flight source must not publish durable HEAD on reopen');
  assert.equal(result.firstRowCorrect,true);
  assert.equal(result.postAbortPrefetch,'UNIFIED_ABORTED',
    'prefetched committed source rows must be inaccessible after abort');
  assert.equal(result.wrongParent,'UNIFIED_PAIR_CORRUPT');
  assert.equal(result.wrongParentInvisible,'UNIFIED_ABORTED');
  assert.equal(result.ownAttributesRoundTrip,true);
  assert.equal(result.ownAttributesCorruption,'UNIFIED_PAIR_CORRUPT');
  assert.equal(result.pairExact,true);
  assert.equal(result.orderedExact,true);
  assert.equal(result.reopenExact,true);
  assert.equal(result.poisonRejected,'UNIFIED_PAIR_CORRUPT');
  console.log('LFJ #1120 W2 native IndexedDB one-HEAD fail-closed corruption/reopen matrix PASS');
}finally{await browser.close();}
